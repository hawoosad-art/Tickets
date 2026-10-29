# Ticket254 — Payment Setup Guide (PayPal + $0-Capital Kenyan M-Pesa & Cards)

This guide explains **everything you need to gather and configure** to accept real customer payments on **Ticket254** with **zero upfront capital ($0 setup, $0 monthly fee)** — covering both **PayPal** (as requested) and **Paystack Kenya Starter Business** (so Kenyan fans can also pay via M-Pesa STK Push and local/international cards in KES).

---

## Part 1: Setting Up Real PayPal Payments (`PAYPAL` Adapter)

Ticket254 includes a complete, server-verified **PayPal Orders REST API v2** integration (`src/services/payments/paypal-provider.ts` + `/api/webhooks/paypal`) that supports:
- PayPal Wallet checkout
- Debit & Credit Card checkout (Visa / Mastercard via PayPal)
- Server-to-server capture verification (`/v2/checkout/orders/{id}/capture`)
- Cryptographic webhook verification (`/v1/notifications/verify-webhook-signature`)
- Automated refunds (`/v2/payments/captures/{id}/refund`)

### Important Facts About PayPal in Kenya (Read First)
1. **$0 Upfront Cost**: Opening a PayPal account and creating a PayPal Developer REST API app is **100% free** ($0 setup, $0 monthly fee). PayPal deducts a percentage per transaction (~3.4%–4.4% + $0.30 USD only when you make a sale).
2. **Currency Rule (`KES` vs `USD`)**: PayPal's Checkout Orders v2 API does **not** natively process `KES` (Kenyan Shillings). It processes `USD`, `EUR`, `GBP`, and ~22 other major currencies.
   - Ticket254 handles this automatically and transparently:
     - If an event is priced in `USD`, `EUR`, or `GBP`, PayPal charges that exact currency.
     - If an event is priced in `KES`, Ticket254 transparently converts the order total into `USD` at your configured `PAYPAL_KES_TO_USD_RATE` (default `0.00775`, i.e., ~129 KES = 1 USD) and displays the exact USD settlement charge to the customer before they click Pay.
3. **Kenyan Account Eligibility & Payouts**:
   - **Withdrawing to M-Pesa in Kenya**: PayPal partners with Safaricom (`paypal-mobilemoney.com/m-pesa` or the PayPal mini-app inside the M-Pesa Super App) and Equity Bank Kenya so you can withdraw USD balances directly into KES in M-Pesa or Equity Bank.
   - **Personal vs. Business Account Caveat**: To generate **Live** REST API credentials (`PAYPAL_CLIENT_ID` and `PAYPAL_CLIENT_SECRET` with `PAYPAL_MODE="live"`), PayPal requires a verified **PayPal Business Account** (Sandbox testing works immediately on any account). Also note that PayPal's risk engine often places temporary 21-day holds on brand-new ticketing merchants until event delivery history is established.

### What You Need to Provide to Open & Verify PayPal
- **Email address & Kenyan mobile number**
- **National ID card or Passport** (for identity verification)
- **Proof of address** (utility bill, bank statement, or M-Pesa statement PDF dated within 3 months)
- **Business details** (if upgrading to PayPal Business: sole-proprietorship/business name; if you register a Business Name on Kenya eCitizen later, attach the BN2 certificate, or link an eligible business account)
- **M-Pesa number (registered in the exact same legal name)** or **Equity Bank account** for withdrawals

### Step-by-Step: Getting Your 3 PayPal Keys for Ticket254

#### Step 1 — Log into the PayPal Developer Dashboard
1. Go to **[https://developer.paypal.com](https://developer.paypal.com)** and sign in with your PayPal account.
2. In the top-right toggle, start in **Sandbox** mode to test, or switch to **Live** once your PayPal Business account is verified.

#### Step 2 — Create an App (`CLIENT_ID` & `CLIENT_SECRET`)
1. Go to **Apps & Credentials** → click **Create App**.
2. Name the app `Ticket254` and click **Create App**.
3. Copy the two values displayed:
   - **Client ID** → paste into `PAYPAL_CLIENT_ID`
   - **Secret key 1** → paste into `PAYPAL_CLIENT_SECRET`

#### Step 3 — Register Your Webhook (`PAYPAL_WEBHOOK_ID`)
1. Stay inside your `Ticket254` app page in the PayPal Developer Dashboard and scroll down to **Webhooks** → click **Add Webhook**.
2. Set **Webhook URL** to your live HTTPS domain:
   ```text
   https://YOUR-DOMAIN/api/webhooks/paypal
   ```
3. Under **Event types**, tick:
   - `Payment capture completed` (`PAYMENT.CAPTURE.COMPLETED`)
   - `Payment capture denied` (`PAYMENT.CAPTURE.DENIED`)
   - `Payment capture refunded` (`PAYMENT.CAPTURE.REFUNDED`)
   - `Checkout order approved` (`CHECKOUT.ORDER.APPROVED`)
4. Click **Save**. PayPal will display a **Webhook ID** (e.g. `4JH82910...`) → paste into `PAYPAL_WEBHOOK_ID`.

#### Step 4 — Enable PayPal in Ticket254 Environment Variables
Set these in `.env` (or Vercel Environment Variables):
```env
PAYPAL_ENABLED="true"
PAYPAL_MODE="sandbox"          # Change to "live" when using Live credentials!
PAYPAL_CLIENT_ID="your-paypal-client-id"
PAYPAL_CLIENT_SECRET="your-paypal-client-secret"
PAYPAL_WEBHOOK_ID="your-paypal-webhook-id"
PAYPAL_KES_TO_USD_RATE="0.00775"
```
As soon as `PAYPAL_ENABLED="true"` and the Client ID + Secret are present, Ticket254 automatically shows **PayPal & International Cards** at checkout!

---

## Part 2: $0-Capital Kenyan M-Pesa + Card Payments (`PAYSTACK` Starter Business)

Because PayPal does not support M-Pesa STK Push at checkout and requires USD conversion for Kenyan matches, we also built a native **Paystack Kenya** integration (`src/services/payments/paystack-provider.ts` + `/api/webhooks/paystack`).

### Why Paystack Kenya "Starter Business" Is Ideal for 0 Capital
- **KES 0 registration / KES 0 monthly fee** — You do **not** need a registered company (`Certificate of Incorporation`) to start! Paystack Kenya's **Starter Business** tier lets individual sole creators go live for free (up to ~KES 100,000–200,000 lifetime Starter volume while you validate sales, after which you can upgrade with a Business Name).
- **Accepts M-Pesa Express (STK Push), Airtel Money, Visa, Mastercard, and Apple Pay** natively in **KES** and **USD**.
- **Pay-only-when-paid fees**: 1.5% on M-Pesa, 2.9% local cards, 3.8% international cards.

### What You Need to Provide for Paystack Starter Business ($0 Cost)
1. **Kenyan National ID Card or Kenyan Passport** (clear photo/scan)
2. **Individual KRA PIN Certificate** (free from [iTax](https://itax.kra.go.ke))
3. **Proof of Residential Address** (utility bill, bank statement, or signed lease)
4. **Personal Kenyan Bank Account or Mobile Money Settlement Account** in your legal name

### Step-by-Step: Activating Paystack in Ticket254
1. Sign up free at **[https://paystack.com/ke](https://paystack.com/ke)** → choose **Starter Business**.
2. Upload your ID, KRA PIN, and bank/settlement details in **Settings → Compliance**.
3. Go to **Settings → API Keys & Webhooks**:
   - Copy **Secret Key** (`sk_test_...` or `sk_live_...`) → `PAYSTACK_SECRET_KEY`
   - Copy **Public Key** (`pk_test_...` or `pk_live_...`) → `PAYSTACK_PUBLIC_KEY`
   - Set **Webhook URL** to:
     ```text
     https://YOUR-DOMAIN/api/webhooks/paystack
     ```
4. Add to your `.env` / Vercel variables:
```env
PAYSTACK_ENABLED="true"
PAYSTACK_SECRET_KEY="sk_live_..."
PAYSTACK_PUBLIC_KEY="pk_live_..."
```
Paystack uses `PAYSTACK_SECRET_KEY` with HMAC-SHA512 (`x-paystack-signature`) to verify webhooks automatically — no extra webhook secret needed!

---

## Part 3: Free $0-Capital Transactional Email, Database & Hosting Checklist

To run the entire Ticket254 platform in production for **$0.00 upfront**:

| Service | Recommended $0 Free Tier | What You Need to Provide | Env Variables to Set |
| :--- | :--- | :--- | :--- |
| **Hosting** | **Vercel Hobby Plan** ($0/mo, automatic HTTPS) | GitHub account | `NEXT_PUBLIC_APP_URL` + secrets |
| **PostgreSQL DB** | **Neon.tech** or **Supabase** Free Tier ($0/mo, 0.5 GB Postgres) | Email signup (no card required) | `DATABASE_URL` |
| **Transactional Email** | **Brevo Free** (300 emails/day ≈ 9,000/mo, works even before buying a custom domain!) or **Resend Free** (3,000/mo with custom domain) | Email signup at [brevo.com](https://www.brevo.com) → SMTP & API → API Keys | `EMAIL_PROVIDER="brevo"`, `BREVO_API_KEY="xkeysib-..."`, `EMAIL_FROM` |
| **Security Secrets** | Self-generated 64-char random hex keys (`openssl rand -hex 32`) | Free — generate locally | `SESSION_SECRET`, `TICKET_QR_SIGNING_SECRET`, `BOOKING_ACCESS_SECRET` |
| **Production Flag** | Disable sandbox simulator before going live | Set boolean env flag | `ENABLE_SIMULATED_PAYMENTS="false"` |
