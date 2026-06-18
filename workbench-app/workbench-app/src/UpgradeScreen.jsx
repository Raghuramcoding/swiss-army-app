import { useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, CardElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { Loader2, Check, Sparkles } from "lucide-react";
import { api } from "./backendClient";
import { useAuth } from "./AuthContext";

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || "");

const cardElementOptions = {
  style: {
    base: {
      color: "#EDEEF0",
      fontFamily: "Inter, sans-serif",
      fontSize: "14px",
      "::placeholder": { color: "#5A6068" },
    },
    invalid: { color: "#E7A893" },
  },
};

function CheckoutForm({ onSuccess }) {
  const stripe = useStripe();
  const elements = useElements();
  const { refresh } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(e) {
    e.preventDefault();
    if (!stripe || !elements) return;
    setLoading(true);
    setError("");

    try {
      const cardElement = elements.getElement(CardElement);
      const { error: pmError, paymentMethod } = await stripe.createPaymentMethod({
        type: "card",
        card: cardElement,
      });
      if (pmError) throw new Error(pmError.message);

      const result = await api.subscribe(paymentMethod.id);

      if (result.clientSecret) {
        // Card requires extra verification (3D Secure) — confirm it client-side.
        const { error: confirmError } = await stripe.confirmCardPayment(result.clientSecret);
        if (confirmError) throw new Error(confirmError.message);
      }

      await refresh();
      onSuccess?.();
    } catch (e) {
      setError(e.message || "Something went wrong setting up your subscription.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="rounded-md border border-white/10 bg-well px-3 py-3">
        <CardElement options={cardElementOptions} />
      </div>
      {error && <p className="text-sm text-[#E7A893]">{error}</p>}
      <button
        type="submit"
        disabled={!stripe || loading}
        className="w-full inline-flex items-center justify-center gap-2 rounded-md bg-amber px-4 py-2.5 text-sm font-semibold text-ink hover:bg-[#f0b257] disabled:opacity-50 transition-colors"
      >
        {loading && <Loader2 size={15} className="animate-spin" />}
        Subscribe
      </button>
      <p className="text-xs text-[#5A6068] text-center">
        Payment is handled directly by Stripe. Card details never touch our servers.
      </p>
    </form>
  );
}

export default function UpgradeScreen({ onSuccess, onClose }) {
  const proPrice = import.meta.env.VITE_PRO_PRICE_DISPLAY || "$9/month";
  const includedQuota = import.meta.env.VITE_INCLUDED_QUOTA_DISPLAY || "500";

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-xl border border-white/10 bg-panel p-6">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles size={18} className="text-amber" />
          <h2 className="text-lg font-semibold">Upgrade to Pro</h2>
        </div>
        <p className="text-sm text-[#8B92A0] mb-5">
          Hosted AI tools — no API key required. {includedQuota} calls/month included, then metered
          overage beyond that.
        </p>

        <div className="rounded-lg border border-white/10 bg-well px-4 py-3 mb-5">
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-semibold">{proPrice}</span>
          </div>
          <ul className="mt-2 space-y-1 text-sm text-[#C7CBD3]">
            <li className="flex items-center gap-1.5"><Check size={13} className="text-teal" /> {includedQuota} AI calls included monthly</li>
            <li className="flex items-center gap-1.5"><Check size={13} className="text-teal" /> No personal API key needed</li>
            <li className="flex items-center gap-1.5"><Check size={13} className="text-teal" /> Cancel anytime</li>
          </ul>
        </div>

        <Elements stripe={stripePromise}>
          <CheckoutForm onSuccess={onSuccess} />
        </Elements>

        {onClose && (
          <button onClick={onClose} className="text-sm text-[#5A6068] hover:text-white mt-4 block mx-auto">
            Not now
          </button>
        )}
      </div>
    </div>
  );
}
