import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import dotenv from "dotenv";
dotenv.config();

import { attachUser } from "./middleware/auth.js";
import { authRouter } from "./routes/auth.js";

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL environment variable is required.");
  process.exit(1);
}

const app = express();

app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_ORIGIN || "*",
  methods: ["GET", "POST"],
  maxAge: 86400,
}));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
});

app.use((req, res, next) => {
  if (["POST", "PUT", "PATCH"].includes(req.method) && !req.is("application/json")) {
    return res.status(415).json({ error: "Content-Type must be application/json." });
  }
  next();
});
app.use(express.json({ limit: "16kb" }));
app.use(attachUser);

app.get("/health", async (req, res) => {
  try {
    const { query } = await import("./db/pool.js");
    await query("SELECT 1");
    res.json({ ok: true, db: "connected" });
  } catch {
    res.status(503).json({ ok: false, db: "disconnected" });
  }
});

app.use("/auth", authLimiter, authRouter);

app.use((err, req, res, next) => {
  console.error(new Date().toISOString(), err);
  res.status(500).json({ error: "Internal server error." });
});

const PORT = process.env.PORT || 3001;
const server = app.listen(PORT, () => console.log(`workbench-backend listening on ${PORT}`));

function shutdown() {
  console.log("Shutting down gracefully...");
  server.close(() => process.exit(0));
}
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
