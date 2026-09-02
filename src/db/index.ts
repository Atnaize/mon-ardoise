import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";

import * as schema from "./schema";

function connectionString(): string {
  const url = process.env.DATABASE_URL;

  if (!url) {
    throw new Error("DATABASE_URL is missing. Copy .env.example to .env.local and fill it in.");
  }

  return url;
}

export const db = drizzle(neon(connectionString()), { schema });

export type Database = typeof db;
