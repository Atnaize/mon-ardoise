import { config } from "dotenv";

config({ path: [".env.local", ".env"], quiet: true });

process.env.DATABASE_URL ??= "postgresql://placeholder:placeholder@localhost/placeholder";
process.env.BETTER_AUTH_SECRET ??= "placeholder-never-used-for-schema-introspection";

const { getAuthTables } = await import("@better-auth/core/db");
const { getTableColumns, getTableName, is } = await import("drizzle-orm");
const { PgTable } = await import("drizzle-orm/pg-core");
const schema = await import("@/db/schema");
const { auth } = await import("@/lib/auth");

type AuthOptions = Parameters<typeof getAuthTables>[0];

const expected = getAuthTables((auth as unknown as { options: AuthOptions }).options);

const ours = new Map<string, Record<string, { notNull: boolean }>>();

for (const value of Object.values(schema)) {
  if (is(value, PgTable)) {
    ours.set(getTableName(value), getTableColumns(value) as Record<string, { notNull: boolean }>);
  }
}

const problems: string[] = [];

for (const [model, def] of Object.entries(expected)) {
  const columns = ours.get(def.modelName);

  if (!columns) {
    problems.push(`table "${def.modelName}" expected by better-auth for model "${model}", missing from the Drizzle schema`);
    continue;
  }

  for (const [field, attr] of Object.entries(def.fields)) {
    const column = columns[field];

    if (!column) {
      problems.push(`${def.modelName}.${field} expected by better-auth, missing from the Drizzle schema`);
      continue;
    }

    if (attr.required && !column.notNull) {
      problems.push(`${def.modelName}.${field} is required by better-auth but nullable in the Drizzle schema`);
    }
  }
}

if (problems.length > 0) {
  console.error("The Drizzle schema does not satisfy better-auth:");
  for (const problem of problems) {
    console.error(`  - ${problem}`);
  }
  console.error("\nAdd the missing fields in src/db/schema/auth.ts, then npm run db:generate && npm run db:migrate.");
  process.exit(1);
}

const fieldCount = Object.values(expected).reduce((n, def) => n + Object.keys(def.fields).length, 0);

console.log(`Auth schema OK: ${Object.keys(expected).length} models, ${fieldCount} fields checked.`);
