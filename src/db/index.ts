import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import * as schema from "./schema";

function createPool(): Pool {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL is missing. Copy .env.example to .env.local and fill it in.");
  }

  return new Pool({
    connectionString,
    max: process.env.NODE_ENV === "production" ? 5 : 2,
  });
}

const globalForDb = globalThis as unknown as { pool?: Pool };

const pool = globalForDb.pool ?? createPool();

if (process.env.NODE_ENV !== "production") {
  globalForDb.pool = pool;
}

export const db = drizzle(pool, { schema });

export type Database = typeof db;
