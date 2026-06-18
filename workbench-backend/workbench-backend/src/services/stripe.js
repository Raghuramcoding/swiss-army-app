import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export const PRO_PRICE_ID = process.env.STRIPE_PRO_PRICE_ID; // flat monthly price (e.g. $9/mo, 500 calls included)
export const OVERAGE_PRICE_ID = process.env.STRIPE_OVERAGE_PRICE_ID; // metered price (per-call overage)
export const INCLUDED_QUOTA = parseInt(process.env.INCLUDED_QUOTA || "500", 10);

export { stripe };

export async function getOrCreateCustomer(user) {
  if (user.stripe_customer_id) return user.stripe_customer_id;
  const customer = await stripe.customers.create({ email: user.email, metadata: { userId: user.id } });
  return customer.id;
}

// Creates a Subscription directly (since billing UI is custom, not Stripe Checkout).
// Requires a payment method already attached to the customer via Stripe Elements on the frontend.
export async function createSubscription({ customerId, paymentMethodId }) {
  await stripe.paymentMethods.attach(paymentMethodId, { customer: customerId });
  await stripe.customers.update(customerId, {
    invoice_settings: { default_payment_method: paymentMethodId },
  });

  const subscription = await stripe.subscriptions.create({
    customer: customerId,
    items: [{ price: PRO_PRICE_ID }, { price: OVERAGE_PRICE_ID }],
    payment_behavior: "default_incomplete",
    payment_settings: { save_default_payment_method: "on_subscription" },
    expand: ["latest_invoice.payment_intent"],
  });

  return subscription;
}

export async function cancelSubscription(subscriptionId) {
  return stripe.subscriptions.cancel(subscriptionId);
}

// Report one unit of overage usage against the metered price's subscription item.
export async function reportOverageUsage(subscriptionId, quantity = 1) {
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const overageItem = subscription.items.data.find((i) => i.price.id === OVERAGE_PRICE_ID);
  if (!overageItem) throw new Error("Overage price not found on subscription.");

  return stripe.subscriptionItems.createUsageRecord(overageItem.id, {
    quantity,
    timestamp: Math.floor(Date.now() / 1000),
    action: "increment",
  });
}
