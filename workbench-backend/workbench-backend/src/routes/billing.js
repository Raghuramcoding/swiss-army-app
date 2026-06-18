import express from "express";
import { query } from "../db/pool.js";
import { requireAuth } from "../middleware/auth.js";
import { getOrCreateCustomer, createSubscription, cancelSubscription, INCLUDED_QUOTA } from "../services/stripe.js";

export const billingRouter = express.Router();

// Step 1: frontend collects a card via Stripe Elements, gets a paymentMethodId, sends it here.
billingRouter.post("/subscribe", requireAuth, async (req, res) => {
  const { paymentMethodId } = req.body || {};
  if (!paymentMethodId) return res.status(400).json({ error: "Missing payment method." });

  try {
    const customerId = await getOrCreateCustomer(req.user);
    if (!req.user.stripe_customer_id) {
      await query("UPDATE users SET stripe_customer_id = $1 WHERE id = $2", [customerId, req.user.id]);
    }

    const subscription = await createSubscription({ customerId, paymentMethodId });

    await query(
      `UPDATE users SET stripe_subscription_id = $1, subscription_status = $2, included_quota = $3,
       calls_used_period = 0, period_started_at = now() WHERE id = $4`,
      [subscription.id, subscription.status === "active" ? "active" : "incomplete", INCLUDED_QUOTA, req.user.id]
    );

    const paymentIntent = subscription.latest_invoice?.payment_intent;
    res.json({
      subscriptionId: subscription.id,
      status: subscription.status,
      // If the card requires extra verification (3D Secure), the frontend uses this client secret
      // with Stripe.js to complete authentication.
      clientSecret: paymentIntent?.client_secret || null,
    });
  } catch (e) {
    console.error(e);
    res.status(400).json({ error: e.message || "Couldn't start the subscription." });
  }
});

billingRouter.post("/cancel", requireAuth, async (req, res) => {
  if (!req.user.stripe_subscription_id) return res.status(400).json({ error: "No active subscription." });
  try {
    await cancelSubscription(req.user.stripe_subscription_id);
    await query("UPDATE users SET subscription_status = 'canceled' WHERE id = $1", [req.user.id]);
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});
