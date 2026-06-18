import express from "express";
import { query } from "../db/pool.js";
import { hashPassword, verifyPassword, signToken } from "../services/auth.js";

export const authRouter = express.Router();

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

authRouter.post("/signup", async (req, res) => {
  const { email, password } = req.body || {};
  if (!isValidEmail(email || "")) return res.status(400).json({ error: "Enter a valid email address." });
  if (!password || password.length < 8) return res.status(400).json({ error: "Password must be at least 8 characters." });

  const existing = await query("SELECT id FROM users WHERE email = $1", [email.toLowerCase()]);
  if (existing.rows.length > 0) return res.status(409).json({ error: "An account with that email already exists." });

  const passwordHash = await hashPassword(password);
  const result = await query(
    "INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email, subscription_status",
    [email.toLowerCase(), passwordHash]
  );
  const user = result.rows[0];
  const token = signToken(user.id);
  res.json({ token, user: { id: user.id, email: user.email, subscriptionStatus: user.subscription_status } });
});

authRouter.post("/login", async (req, res) => {
  const { email, password } = req.body || {};
  const result = await query("SELECT * FROM users WHERE email = $1", [(email || "").toLowerCase()]);
  const user = result.rows[0];
  if (!user) return res.status(401).json({ error: "Incorrect email or password." });

  const valid = await verifyPassword(password || "", user.password_hash);
  if (!valid) return res.status(401).json({ error: "Incorrect email or password." });

  const token = signToken(user.id);
  res.json({ token, user: { id: user.id, email: user.email, subscriptionStatus: user.subscription_status } });
});

authRouter.get("/me", async (req, res) => {
  if (!req.user) return res.status(401).json({ error: "Not signed in." });
  const u = req.user;
  res.json({
    user: {
      id: u.id,
      email: u.email,
      subscriptionStatus: u.subscription_status,
      includedQuota: u.included_quota,
      callsUsedPeriod: u.calls_used_period,
      currentPeriodEnd: u.current_period_end,
    },
  });
});
