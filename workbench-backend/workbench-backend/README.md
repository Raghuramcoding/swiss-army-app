# Workbench backend

Express + Postgres backend that powers the Pro tier: accounts, subscriptions,
metered AI usage billing, and a server-side AI proxy (so Pro users don't need
their own API key).

The free tier of the Workbench app doesn't need any of this — it calls
Anthropic/OpenRouter/Ollama directly from the browser with the user's own key.
This backend only matters once you want to sell a hosted, no-key-needed plan.

## What this does NOT do for you

- Doesn't deploy itself — you need a Railway account.
- Doesn't create a Stripe account or products — you do that in the Stripe dashboard.
- Doesn't pick prices for you — $9/mo and 500 calls in `.env.example` are placeholders.
- Doesn't handle taxes/VAT — Stripe Tax can help, but you must enable it yourself.

## 1. Set up Postgres + deploy on Railway

1. Create a new project on [railway.app](https://railway.app).
2. Add a **PostgreSQL** plugin from the Railway dashboard — it sets `DATABASE_URL` automatically.
3. Add a new service from this repo (or `railway up` from this folder with the Railway CLI).
4. In the service's Variables tab, add everything from `.env.example` EXCEPT `DATABASE_URL`
   (Railway already injected that from the Postgres plugin).
5. Once deployed, run the migration once via Railway's shell/CLI:
   ```
   railway run npm run migrate
   ```

## 2. Set up Stripe

1. In the Stripe dashboard, create one **Product** called e.g. "Workbench Pro".
2. Add two **Prices** to that product:
   - A recurring flat price (e.g. $9.00/month) → copy its ID into `STRIPE_PRO_PRICE_ID`.
   - A recurring **metered/usage-based** price (e.g. $0.02 per unit) → copy its ID into `STRIPE_OVERAGE_PRICE_ID`.
3. Go to Developers → API keys → copy your **secret key** into `STRIPE_SECRET_KEY`. Use the test key first.
4. Go to Developers → Webhooks → add an endpoint pointing at:
   ```
   https://<your-railway-domain>/webhooks/stripe
   ```
   Subscribe it to these events at minimum:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
   Copy the signing secret into `STRIPE_WEBHOOK_SECRET`.
5. Test with Stripe's test card `4242 4242 4242 4242`, any future expiry, any CVC.
6. Only switch `STRIPE_SECRET_KEY` and the webhook to **live** mode once you've tested
   the whole signup → subscribe → use → cancel flow end to end in test mode.

## 3. Local development

```
cp .env.example .env   # fill in real values
npm install
npm run migrate
npm run dev
```

The server listens on `PORT` (default 3001). Point the frontend's `VITE_API_URL`
at `http://localhost:3001` while developing locally.

## Architecture notes

- **Source of truth for billing state is always Stripe's webhooks**, never anything
  the frontend claims. The `/billing/subscribe` route starts a subscription, but the
  user's `subscription_status` only flips to `active` once the webhook confirms it.
- **Usage quota** resets to 0 on `invoice.payment_succeeded` (i.e. each new billing
  period) and increments per AI call in `/ai/complete`. Calls beyond `included_quota`
  are reported to Stripe as metered usage via `reportOverageUsage`.
- **Idempotency**: webhook events are recorded by ID in `processed_stripe_events` so
  Stripe's automatic retries don't double-apply an event.
