import express from "express";
import { requireAuth } from "../middleware/auth.js";
import { query } from "../db/pool.js";
import { reportOverageUsage } from "../services/stripe.js";

export const aiRouter = express.Router();

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY; // your own server-side key, billed to you

aiRouter.post("/complete", requireAuth, async (req, res) => {
  const user = req.user;
  if (user.subscription_status !== "active") {
    return res.status(402).json({ error: "An active Pro subscription is required to use hosted AI calls." });
  }

  const { prompt, system, tool } = req.body || {};
  if (!prompt) return res.status(400).json({ error: "Missing prompt." });

  const withinQuota = user.calls_used_period < user.included_quota;

  try {
    const body = {
      model: "claude-sonnet-4-6",
      max_tokens: 1500,
      messages: [{ role: "user", content: prompt }],
    };
    if (system) body.system = system;

    const aiRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(body),
    });

    if (!aiRes.ok) {
      const errBody = await aiRes.json().catch(() => ({}));
      return res.status(502).json({ error: errBody?.error?.message || "The AI provider returned an error." });
    }

    const data = await aiRes.json();
    const text = (data.content || []).map((b) => (b.type === "text" ? b.text : "")).filter(Boolean).join("\n");

    // Record usage and bill overage if past the included quota.
    await query("INSERT INTO usage_events (user_id, tool, billed_as_overage) VALUES ($1, $2, $3)", [
      user.id,
      tool || "unknown",
      !withinQuota,
    ]);
    await query("UPDATE users SET calls_used_period = calls_used_period + 1 WHERE id = $1", [user.id]);

    if (!withinQuota && user.stripe_subscription_id) {
      // Don't let a Stripe hiccup break the response to the user — log and move on.
      reportOverageUsage(user.stripe_subscription_id, 1).catch((e) =>
        console.error("Failed to report overage usage to Stripe:", e)
      );
    }

    res.json({ text, billedAsOverage: !withinQuota });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Something went wrong calling the AI provider." });
  }
});
