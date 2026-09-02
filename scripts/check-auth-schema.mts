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
    problems.push(`table "${def.modelName}" attendue par better-auth pour le modèle "${model}", absente du schéma Drizzle`);
    continue;
  }

  for (const [field, attr] of Object.entries(def.fields)) {
    const column = columns[field];

    if (!column) {
      problems.push(`${def.modelName}.${field} attendu par better-auth, absent du schéma Drizzle`);
      continue;
    }

    if (attr.required && !column.notNull) {
      problems.push(`${def.modelName}.${field} est requis par better-auth mais nullable dans le schéma Drizzle`);
    }
  }
}

if (problems.length > 0) {
  console.error("Le schéma Drizzle ne satisfait pas better-auth :");
  for (const problem of problems) {
    console.error(`  - ${problem}`);
  }
  console.error("\nAjoute les champs manquants dans src/db/schema/auth.ts, puis npm run db:generate && npm run db:migrate.");
  process.exit(1);
}

const fieldCount = Object.values(expected).reduce((n, def) => n + Object.keys(def.fields).length, 0);

console.log(`Schéma auth conforme : ${Object.keys(expected).length} modèles, ${fieldCount} champs vérifiés.`);
