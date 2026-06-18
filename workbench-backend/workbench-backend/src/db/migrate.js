import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { pool } from "./pool.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function migrate() {
  const sql = fs.readFileSync(path.join(__dirname, "schema.sql"), "utf-8");
  console.log("Applying schema...");
  await pool.query('CREATE EXTENSION IF NOT EXISTS "pgcrypto";'); // for gen_random_uuid()
  await pool.query(sql);
  console.log("Done.");
  await pool.end();
}

migrate().catch((e) => {
  console.error("Migration failed:", e);
  process.exit(1);
});
