import { defineConfig } from "drizzle-kit";

// Pas de dotenv ici, volontairement. L'environnement vient de `op run`, via les
// scripts npm (db:migrate = .env.op, db:migrate:prod = .env.op.prod). Lire un
// .env.local ambiant rendrait la cible implicite : un fichier oublié contenant
// la connection string de prod suffirait à faire migrer la prod sans le savoir.
const url = process.env.DATABASE_URL;

if (!url) {
  throw new Error(
    "DATABASE_URL is missing. Run through npm (npm run db:migrate), not drizzle-kit directly.",
  );
}

// On affiche toujours la cible : c'est la dernière chance de voir qu'on est sur la prod.
console.info(`drizzle-kit -> ${new URL(url).host}`);

export default defineConfig({
  schema: "./src/db/schema/index.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: { url },
  strict: true,
  verbose: true,
});
