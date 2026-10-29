# Ticket254 — Football Ticketing Platform (Kenya & International)

**Ticket254** is a full-stack, security-hardened football match ticketing platform engineered for fixtures in **Kenya** (`KES`, `Africa/Nairobi`, M-Pesa + Card via Paystack) and **international competitions** (`USD` / `EUR` / `GBP`, PayPal Orders REST API v2 + International Cards).

> **Strict Financial Scope**: Ticket254 manages authorised match inventory, ticket sales, server-verified payments, digital QR/PDF ticket issuance, stadium turnstile scanning, refunds, and financial reconciliation. It intentionally contains **zero commission logic, tables, fields, or calculations**.

---

## Key Capabilities

- **Public Match Discovery & SEO**: Homepage (`/`), filterable Match Directory (`/matches`), Match Details (`/matches/[slug]`) with `SportsEvent` JSON-LD structured data, dynamic `sitemap.xml`, `robots.txt`, and multi-currency price display (`KES`, `USD`, `EUR`, `GBP`) with honest conversion disclaimers.
- **Atomic Inventory & Anti-Overselling**: Pluggable `InventoryProvider` (`NATIVE` database allocations + `EXTERNAL_ADAPTER` interface for official club/federation integrations) using `Serializable` transactions, conditional atomic holds, 15-minute checkout reservation timers, and automatic expiry release.
- **Server-Verified Payment Abstraction**:
  - **PayPal (`PAYPAL`)**: Real PayPal REST API v2 (`/v2/checkout/orders`, server capture, `/v1/notifications/verify-webhook-signature`, automated refunds, and transparent `KES` → `USD` conversion when event currency is `KES`).
  - **Paystack (`PAYSTACK`)**: Real Paystack API for $0-capital Kenyan Starter Businesses accepting **M-Pesa Express (STK Push)** + **Visa/Mastercard** in `KES`/`USD` with `x-paystack-signature` HMAC-SHA512 webhook verification.
  - **Sandbox Simulator (`SIMULATED`)**: Clearly labelled non-production simulator routed through signed HMAC webhook verification (`ENABLE_SIMULATED_PAYMENTS="false"` disables it in production).
  - Browser redirects **never** issue tickets on their own — tickets are issued strictly after cryptographic webhook or server-to-server capture verification.
- **Cryptographic QR Tickets & Official PDF Downloads**:
  - Opaque HMAC-SHA256 signed QR tokens (`T254.v1.<nonce>.<sig>`) containing **zero customer PII**.
  - Downloadable `pdf-lib` + `qrcode` printable tickets (`/api/tickets/[ticketId]/pdf`), mobile wallet view (`/tickets/[ticketId]`), and self-service email resend (`/api/tickets/resend`).
- **Stadium Turnstile QR Scanner (`/scanner`)**:
  - Dedicated mobile-first gate terminal with live camera scanning (`jsQR`) + manual fallback, atomic single-UPDATE duplicate scan prevention, wrong-event detection, and invalidated/refunded ticket blocking.
- **6-Role RBAC & Full Admin Console (`/admin/*`)**:
  - Least-privilege roles: `CUSTOMER`, `SUPPORT_AGENT`, `TICKET_SCANNER`, `EVENT_MANAGER`, `FINANCE_MANAGER`, `SUPER_ADMIN`.
  - Complete operational modules for Events, Venues, Ticket Types, Inventory, Orders, Payments, Refunds, Reconciliation, Customers, Scanner Logs, Reports & CSV Exports, Support Desk, Staff Users, Settings, and Immutable Audit Logs.
- **Transactional Email Outbox**: 11 HTML + plain-text email templates with `NotificationJob` database deduplication/retry and $0-tier Brevo & Resend HTTP adapters.

---

## Quick Start (Local Development)

### 1. Prerequisites
- Node.js `>= 20.x`
- PostgreSQL `>= 15` running locally (databases `ticket254` and `ticket254_test`)

### 2. Install, Migrate & Seed
```bash
cp .env.example .env
npm install
npx prisma migrate dev
npm run db:seed
```

### 3. Run Development Server
```bash
npm run dev
```
Open `http://localhost:3000`.

### 4. Seeded Development Accounts (Password for all: `Ticket254!Pass`)
| Role | Email | Access Scope |
| :--- | :--- | :--- |
| `SUPER_ADMIN` | `admin@ticket254.co.ke` | Full `/admin/*` + `/scanner` + staff RBAC |
| `FINANCE_MANAGER` | `finance@ticket254.co.ke` | Orders, payments, refund approvals, reconciliation, CSV exports |
| `EVENT_MANAGER` | `events@ticket254.co.ke` | Events, venues, ticket categories, inventory holds |
| `TICKET_SCANNER` | `scanner@ticket254.co.ke` | `/scanner` turnstile validation only (blocked from `/admin`) |
| `SUPPORT_AGENT` | `support@ticket254.co.ke` | Orders lookup, ticket resend, customer support queue |
| `CUSTOMER` | `fan@ticket254.co.ke` | Customer account, digital ticket wallet (`T254-DEMO-0001`), refund requests |

---

## Automated Verification & Build Commands

```bash
npm test              # Runs Vitest E2E & concurrency verification suite against ticket254_test
npx tsc --noEmit      # Strict TypeScript verification
npm run lint          # Next.js Core Web Vitals ESLint check
npm run build         # Production Prisma client + Next.js optimized build
```

---

## Operational Documentation (`docs/`)

- **[`docs/PAYMENT-SETUP-PAYPAL-AND-ZERO-CAPITAL.md`](docs/PAYMENT-SETUP-PAYPAL-AND-ZERO-CAPITAL.md)** — Step-by-step **PayPal** setup guide, Kenya currency/account rules, **$0-upfront Paystack Kenya Starter Business (M-Pesa + Cards)** setup, and free email/hosting stack checklist.
- **[`docs/ARCHITECTURE-AND-OPERATIONS.md`](docs/ARCHITECTURE-AND-OPERATIONS.md)** — Architecture overview, database migrations & backups, admin operations, stadium turnstile scanner operations, and go-live security checklist.
- **[`docs/GITHUB-SYNC-AND-DEPLOYMENT.md`](docs/GITHUB-SYNC-AND-DEPLOYMENT.md)** — Safely pushing to `https://github.com/hawoosad-art/Tickets` (after revoking the exposed `Agent` token) and deploying free on Vercel + Neon Postgres.
