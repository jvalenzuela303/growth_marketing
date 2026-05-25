-- Migration 018: local payment method storage (no Stripe dependency)
-- Allows storing a single card mock per tenant without calling Stripe.

-- Make stripe_customer_id nullable (was NOT NULL, blocking non-Stripe setups)
ALTER TABLE subscriptions
  ALTER COLUMN stripe_customer_id DROP NOT NULL;

-- Add local card storage column
ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS payment_method_mock JSONB;

-- Comment: payment_method_mock shape:
-- { "last4": "4242", "brand": "visa", "funding": "credit",
--   "expMonth": 12, "expYear": 2027, "holderName": "Juan Pérez" }
