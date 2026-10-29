# Pushing Ticket254 to GitHub & Free $0 Deployment

## 1. Why the Previous Token in `Agent` Was Revoked (And How to Push Safely)

The file `Agent` that was previously committed to `https://github.com/hawoosad-art/Tickets` contained a GitHub Personal Access Token (`ghp_...`). Whenever a token is pushed inside a file to a public GitHub repository, **GitHub Secret Scanning automatically revokes that token within seconds** to protect your account (`401 Bad credentials`).

We have already **removed `Agent`** from the repository (`git rm Agent`) so no secret file remains in the codebase.

### How to Push This Complete Codebase to Your GitHub Repo
1. Go to **GitHub → Settings → Developer settings → Personal access tokens → Fine-grained tokens** (or Classic tokens).
2. Generate a new token scoped **only** to `hawoosad-art/Tickets` with **Contents: Read and write** permission.
3. **NEVER save the token inside a file in the repository.** Instead, push from your terminal (when Git prompts for your password, paste the token):
   ```bash
   git remote set-url origin https://github.com/hawoosad-art/Tickets.git
   git push -u origin main
   ```
   *(Optional: if you want zero history of the old `Agent` commit on GitHub, you can force-push a clean orphan history or rotate the token as you planned — the old token is already permanently disabled by GitHub).*

---

## 2. Deploying Ticket254 for $0.00 Upfront (Neon Postgres + Vercel)

1. **Create Free PostgreSQL Database (Neon.tech)**:
   - Sign up free at [https://neon.tech](https://neon.tech) (no credit card).
   - Create a project named `ticket254` and copy the pooled/direct PostgreSQL connection string (`postgresql://...`).
2. **Apply Database Schema to Neon**:
   ```bash
   DATABASE_URL="postgresql://YOUR_NEON_STRING" npx prisma migrate deploy
   ```
3. **Import `hawoosad-art/Tickets` into Vercel (Free Hobby Plan)**:
   - Go to [https://vercel.com/new](https://vercel.com/new) and import `hawoosad-art/Tickets`.
   - Add the environment variables from `.env.example` (`DATABASE_URL`, `NEXT_PUBLIC_APP_URL`, `SESSION_SECRET`, `TICKET_QR_SIGNING_SECRET`, `BOOKING_ACCESS_SECRET`, plus your `PAYPAL_*`, `PAYSTACK_*`, and `BREVO_API_KEY` values).
   - Click **Deploy**. Your international & Kenyan football ticketing platform is live over HTTPS!
