import { verifyToken } from "../services/auth.js";
import { query } from "../db/pool.js";

// Attaches req.user if a valid token is present. Use requireAuth to enforce it.
export async function attachUser(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) return next();
  try {
    const payload = verifyToken(header.slice(7));
    const result = await query("SELECT * FROM users WHERE id = $1", [payload.sub]);
    req.user = result.rows[0] || null;
  } catch {
    req.user = null;
  }
  next();
}

export function requireAuth(req, res, next) {
  if (!req.user) return res.status(401).json({ error: "Sign in required." });
  next();
}
