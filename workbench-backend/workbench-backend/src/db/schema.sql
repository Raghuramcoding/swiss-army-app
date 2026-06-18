-- Workbench backend schema.
-- Run via `npm run migrate` (src/db/migrate.js applies this file).

CREATE TABLE IF NOT EXISTS users (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email           TEXT UNIQUE NOT NULL,
  password_hash   TEXT NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

  stripe_customer_id      TEXT UNIQUE,
  stripe_subscription_id  TEXT UNIQUE,
  subscription_status     TEXT NOT NULL DEFAULT 'free',  -- free | active | past_due | canceled
  current_period_end      TIMESTAMPTZ,

  -- monthly quota bookkeeping (resets on each billing period / calendar month for free users)
  included_quota      INTEGER NOT NULL DEFAULT 0,
  calls_used_period    INTEGER NOT NULL DEFAULT 0,
  period_started_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS usage_events (
  id          BIGSERIAL PRIMARY KEY,
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tool        TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  billed_as_overage BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_usage_events_user_id ON usage_events(user_id);
CREATE INDEX IF NOT EXISTS idx_usage_events_created_at ON usage_events(created_at);

-- Stripe webhook idempotency: record processed event IDs so retries don't double-apply.
CREATE TABLE IF NOT EXISTS processed_stripe_events (
  id          TEXT PRIMARY KEY,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
