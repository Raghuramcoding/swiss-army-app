import express from "express";
import { stripe } from "../services/stripe.js";
import { query } from "../db/pool.js";

export const webhookRouter = express.Router();

// IMPORTANT: this route must receive the raw request body (not JSON-parsed) for
// Stripe's signature verification to work. It's mounted with express.raw() in server.js,
// before the global express.json() middleware applies to other routes.
webhookRouter.post("/stripe", async (req, res) => {
  const sig = req.headers["stripe-signature"];
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (e) {
    console.error("Webhook signature verification failed:", e.message);
    return res.status(400).send(`Webhook Error: ${e.message}`);
  }

  // Idempotency: Stripe may retry the same event. Skip if already processed.
  const already = await query("SELECT id FROM processed_stripe_events WHERE id = $1", [event.id]);
  if (already.rows.length > 0) return res.json({ received: true, duplicate: true });

  try {
    switch (event.type) {
      case "customer.subscription.updated":
      case "customer.subscription.created": {
        const sub = event.data.object;
        const status = sub.status === "active" || sub.status === "trialing" ? "active" : sub.status;
        await query(
          `UPDATE users SET subscription_status = $1, current_period_end = to_timestamp($2)
           WHERE stripe_subscription_id = $3`,
          [status, sub.current_period_end, sub.id]
        );
        break;
      }
      case "customer.subscription.deleted": {
        const sub = event.data.object;
        await query(
          `UPDATE users SET subscription_status = 'free', stripe_subscription_id = NULL,
           included_quota = 0 WHERE stripe_subscription_id = $1`,
          [sub.id]
        );
        break;
      }
      case "invoice.payment_succeeded": {
        // New billing period started — reset the usage counter.
        const invoice = event.data.object;
        if (invoice.subscription) {
          await query(
            `UPDATE users SET calls_used_period = 0, period_started_at = now()
             WHERE stripe_subscription_id = $1`,
            [invoice.subscription]
          );
        }
        break;
      }
      case "invoice.payment_failed": {
        const invoice = event.data.object;
        if (invoice.subscription) {
          await query(
            `UPDATE users SET subscription_status = 'past_due' WHERE stripe_subscription_id = $1`,
            [invoice.subscription]
          );
        }
        break;
      }
      default:
        break; // ignore other event types
    }

    await query("INSERT INTO processed_stripe_events (id) VALUES ($1)", [event.id]);
    res.json({ received: true });
  } catch (e) {
    console.error("Error handling webhook event:", e);
    // Return 500 so Stripe retries this event later.
    res.status(500).json({ error: "Internal error processing webhook." });
  }
});
