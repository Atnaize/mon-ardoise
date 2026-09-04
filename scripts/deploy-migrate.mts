/**
 * Applique les migrations avant que Vercel ne build. Appelé par le
 * `buildCommand` de `vercel.json`, jamais à la main : en local c'est
 * `npm run db:migrate`, contre la prod depuis un poste c'est
 * `npm run db:migrate:prod`.
 *
 * Pourquoi dans le build et pas dans un job GitHub Actions : le job et le
 * déploiement Vercel partent du même push et tournent en parallèle, donc le
 * code peut passer en ligne avant son schéma. C'est exactement la panne du
 * 4 septembre 2026 (`column "is_acquisition_cost" does not exist` : le code
 * de 5be9558 déployé sur une base restée en 0006). Ici l'ordre est garanti :
 * la migration échoue -> le build échoue -> le déploiement est annulé et
 * l'ancienne version reste en ligne.
 *
 * Le corollaire à connaître : la migration s'applique pendant le build, donc
 * avant la bascule. Entre les deux, la version encore en ligne parle à un
 * schéma déjà migré. Une migration purement additive ne la gêne pas ; un
 * `DROP COLUMN` la casse le temps du build. Pour une suppression de colonne
 * sur une base qui a des utilisateurs, il faut donc deux déploiements :
 * d'abord le code qui cesse de lire la colonne, ensuite la migration qui la
 * supprime.
 */
import { spawnSync } from "node:child_process";

// VERCEL_ENV vaut "production", "preview" ou "development".
const target = process.env.VERCEL_ENV;

if (target !== "production") {
  // Garde-fou indispensable, pas une optimisation : un déploiement de preview
  // hérite des variables d'environnement de production tant qu'on ne lui en
  // donne pas d'autres. Sans ce test, chaque preview migrerait la base de
  // prod, y compris depuis une branche dont le schéma n'est pas validé.
  console.info(`deploy-migrate : VERCEL_ENV=${target ?? "(absent)"}, migration ignorée.`);
  process.exit(0);
}

// On passe par le CLI plutôt que par le migrateur programmatique pour que
// `drizzle.config.ts` reste la seule source de vérité sur le dossier de
// migrations et sur la cible. Il affiche l'hôte visé dans le log de build.
const migrate = spawnSync("npm", ["exec", "--", "drizzle-kit", "migrate"], {
  stdio: "inherit",
});

if (migrate.error) {
  throw migrate.error;
}

if (migrate.status !== 0) {
  console.error("deploy-migrate : migration échouée, le build s'arrête ici.");
  process.exit(migrate.status ?? 1);
}

console.info("deploy-migrate : migrations à jour.");
