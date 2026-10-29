# Ticket254 — Architecture, Operations & Security Manual

## 1. Architecture Overview

Ticket254 is built as a modular monolith in **Next.js 14 (App Router) + TypeScript + PostgreSQL + Prisma ORM** with strict domain separation:

- **`src/lib/`** — Foundational primitives:
  - `money.ts`: Integer minor-unit currency arithmetic (`KES`, `USD`, `EUR`, `GBP`) eliminating floating-point rounding drift.
  - `crypto-tokens.ts`: Cryptographic HMAC-SHA256 QR token signing (`T254.v1.<128-bit-nonce>.<96-bit-hmac>`), constant-time verification, SHA-256 session/token hashing, and idempotency keys. Zero personal data is ever placed inside a QR payload.
  - `auth.ts`: `bcryptjs` (cost 12) password hashing, database-backed revocable sessions (`HttpOnly`, `SameSite=Lax`, `Secure` in production), and fine-grained 6-role RBAC (`CUSTOMER`, `SUPPORT_AGENT`, `TICKET_SCANNER`, `EVENT_MANAGER`, `FINANCE_MANAGER`, `SUPER_ADMIN`).
  - `timezone.ts`: Explicit IANA venue timezone formatting (`Africa/Nairobi`, `UTC`, etc.).
- **`src/services/`** — Business domain services:
  - `inventory/inventory-service.ts`: Pluggable `InventoryProvider` abstraction (`NativeDatabaseInventoryProvider` + `ExternalOrganiserInventoryAdapter` skeleton) using `Serializable` Prisma transactions and conditional SQL updates (`reservedCount + qty <= authorisedCapacity`) to guarantee zero overselling under concurrency.
  - `payments/`: Pluggable `PaymentProvider` interface with `PayPalPaymentProvider` (REST API v2), `PaystackPaymentProvider` (M-Pesa + Card), and `SimulatedPaymentProvider` (non-production signed sandbox).
  - `orders/order-service.ts`: Authoritative server-side pricing, order state machine (`PENDING`, `AWAITING_PAYMENT`, `PAID`, `TICKETS_ISSUED`, `PARTIALLY_REFUNDED`, `REFUNDED`, `CANCELLED`, `EXPIRED`, `PAYMENT_FAILED`), idempotent webhook processing, and policy-aware refund execution.
  - `tickets/ticket-service.ts`: Post-payment ticket issuance, `pdf-lib` + `qrcode` official PDF ticket generation, and atomic single-UPDATE stadium turnstile validation (`UPDATE Ticket SET status = 'USED' WHERE id = $1 AND status = 'VALID'`).
  - `reconciliation/reconciliation-service.ts`: Financial ledger reconciliation across orders, verified payments, refunds, and settlement batches (zero commission logic anywhere).
  - `email/`: 11 HTML + plain-text transactional email templates backed by a persistent `NotificationJob` database outbox with deduplication keys and Brevo/Resend HTTP adapters.

---

## 2. Database Migration, Backup & Recovery Guide

### Running Migrations
- **Local Development**:
  ```bash
  npx prisma migrate dev
  ```
- **Production / Staging Deployment**:
  ```bash
  npx prisma migrate deploy
  ```
- **Seeding Sample Data (Development Only)**:
  ```bash
  npm run db:seed
  ```
  All seeded fixtures are explicitly marked `isSampleData = true` and labelled `[SAMPLE]` in the UI.

### Backup & Point-in-Time Recovery Strategy
1. **Managed PostgreSQL PITR**: On Neon, Supabase, RDS, or Railway Postgres, enable automated daily snapshots and continuous WAL Point-In-Time Recovery (minimum 7–30 days retention, especially across match weeks).
2. **Pre-Migration Logical Backup**: Before running `npx prisma migrate deploy` or major operational maintenance, run:
   ```bash
   pg_dump --format=custom --no-owner --dbname="$DATABASE_URL" --file="ticket254_$(date -u +%Y%m%dT%H%M%SZ).dump"
   ```
3. **Restoring a Dump**:
   ```bash
   pg_restore --clean --if-exists --no-owner --dbname="$RESTORE_DATABASE_URL" ticket254_YYYYMMDDTHHMMSSZ.dump
   ```
4. **Immutable Financial Protection**: `Order`, `Payment`, `PaymentWebhookEvent`, `Ticket`, `TicketScan`, `Refund`, `Settlement`, and `AuditLog` use `onDelete: Restrict` foreign keys so historical financial and entry records can never be accidentally cascade-deleted.

---

## 3. Admin Operations Guide

Access `/admin` with an authorised staff account (`SUPER_ADMIN`, `FINANCE_MANAGER`, `EVENT_MANAGER`, or `SUPPORT_AGENT`).

- **Creating a Real Match**:
  1. Go to `/admin/venues` and create the stadium with its official IANA timezone (e.g. `Africa/Nairobi`).
  2. Go to `/admin/events/new`, enter teams, competition, kickoff local time, refund cutoff policy, and **untick** "Mark as Sample/Demo Data" only when you hold authorised organiser inventory.
  3. Go to `/admin/ticket-types` to add categories (`VIP`, `PREMIUM`, `STANDARD`, `HOSPITALITY`, `TERRACE`, `FAMILY`) and authorised capacities.
  4. Open `/admin/events/[id]` and transition status from `DRAFT` → `PUBLISHED`.
- **Releasing Expired Holds**: Checkout automatically releases expired holds (`expiresAt < NOW()`), and staff can also trigger manual reaping at `/admin/inventory`.
- **Processing Refunds**: Open `/admin/refunds` (requires `FINANCE_MANAGER` or `SUPER_ADMIN`). Approving a refund calls the underlying payment gateway (`PayPal` / `Paystack`), transitions the order to `REFUNDED` or `PARTIALLY_REFUNDED`, and automatically invalidates tickets so they cannot enter the stadium.
- **Reconciliation**: Open `/admin/reconciliation` after match day or gateway settlement to verify `Confirmed Gross Sales == Verified Payments` and compare `Net Collected` against your bank/M-Pesa payout statement.

---

## 4. Stadium Turnstile Scanner Operations Guide

1. Provision dedicated scanner accounts in `/admin/users` with role **`TICKET_SCANNER`** (this role can access `/scanner` and `/api/scanner/validate` ONLY — it has zero access to `/admin`, financials, or customer lists).
2. At the stadium gate, staff sign in on mobile browsers and open **`/scanner`**:
   - Select the active match and type the Gate/Turnstile identifier (e.g. `Gate 4 - VIP West`).
   - Tap **Start Live Camera** to scan QR codes continuously via `jsQR`, or type/paste the `TKT-...` number or opaque QR token in Manual Entry if a supporter's screen is cracked.
3. **Connectivity**: Ticket254 performs real-time online atomic validation against PostgreSQL to prevent simultaneous multi-gate replay fraud. Ensure 4G/LTE or stadium Wi-Fi coverage at all entry gates.
4. **Outcome Visual Signals**:
   - **GREEN (`ACCEPTED`)**: Admit 1 spectator immediately.
   - **RED (`ALREADY_USED`)**: Displays the exact UTC timestamp and gate where the ticket was previously scanned — do not admit without supervisor escalation.
   - **RED (`WRONG_EVENT` / `CANCELLED_TICKET` / `INVALID_SIGNATURE`)**: Reject entry; refunded and forged QR codes fail immediately.

---

## 5. Production Security & Go-Live Checklist

Before announcing ticket sales to the public, verify every item below:

- [ ] `NODE_ENV="production"` and `ENABLE_SIMULATED_PAYMENTS="false"` (blocks `/api/checkout/simulate` with HTTP `403`).
- [ ] Generate unique 64-character random secrets (`openssl rand -hex 32`) for `SESSION_SECRET`, `TICKET_QR_SIGNING_SECRET`, and `BOOKING_ACCESS_SECRET`. Never reuse development defaults.
- [ ] Confirm HTTPS is enforced (`NEXT_PUBLIC_APP_URL="https://..."`) so session cookies carry the `Secure` attribute and camera permissions work on mobile turnstile devices.
- [ ] Configure live `PAYPAL_*` and/or `PAYSTACK_*` credentials and test a real low-value live purchase + webhook delivery + refund end-to-end.
- [ ] Configure `EMAIL_PROVIDER="brevo"` or `"resend"` and verify SPF/DKIM DNS records on your sending domain so ticket PDFs land in primary inboxes.
- [ ] Delete or archive (`ARCHIVED` status) all `[SAMPLE]` seed events before public launch, and rotate/remove seeded demo staff accounts.
- [ ] Verify `/api/health` returns HTTP `200` (`{"status":"healthy"}`) and configure uptime monitoring against it.
