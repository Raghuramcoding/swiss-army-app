import pg from "pg";
import dotenv from "dotenv";
dotenv.config();

// Railway provides DATABASE_URL automatically when you attach a Postgres plugin.
export const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes("railway") ? { rejectUnauthorized: false } : undefined,
});

export async function query(text, params) {
  return pool.query(text, params);
}
