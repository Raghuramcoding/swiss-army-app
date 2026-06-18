import express from "express";
import cors from "cors";
import dotenv from "dotenv";
dotenv.config();

import { attachUser } from "./middleware/auth.js";
import { authRouter } from "./routes/auth.js";
import { billingRouter } from "./routes/billing.js";
import { webhookRouter } from "./routes/webhooks.js";
import { aiRouter } from "./routes/ai.js";

const app = express();

app.use(cors({ origin: process.env.FRONTEND_ORIGIN || "*" }));

// Stripe webhooks need the raw, unparsed body for signature verification —
// this must be registered BEFORE express.json() below.
app.use("/webhooks", webhookRouter);

app.use(express.json());
app.use(attachUser);

app.get("/health", (req, res) => res.json({ ok: true }));

app.use("/auth", authRouter);
app.use("/billing", billingRouter);
app.use("/ai", aiRouter);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error." });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Workbench backend listening on port ${PORT}`));
