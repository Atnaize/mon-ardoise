import { getTranslations } from "next-intl/server";

import { Link } from "@/i18n/navigation";
import { currentYear } from "@/lib/clock";
import pkg from "../../package.json";

/** Le point médian qui sépare deux mentions d'une même ligne. */
function Dot() {
  return (
    <span aria-hidden className="text-line">
      ·
    </span>
  );
}

const footerLink =
  "text-ink-2 underline-offset-4 transition-colors hover:text-accent-ink hover:underline";

/**
 * Un colophon, pas une barre de liens : une bande qui traverse toute la largeur,
 * d'un papier plus sourd que la page, avec le liseré clair sous le filet qui la
 * fait passer légèrement en retrait. La page repose dessus au lieu de s'arrêter.
 *
 * Le texte reste centré sur la colonne de lecture, en trois niveaux du plus utile
 * au plus anecdotique : la réserve sur les projections, les liens, la signature.
 * Le compte est dans le menu en haut à droite : « connecté en tant que » en bas de
 * page se lit comme une information, pas comme un endroit où agir.
 */
export async function AppFooter() {
  const t = await getTranslations();

  return (
    <footer className="mt-auto border-t border-line bg-surface-2/70 shadow-[inset_0_1px_0_var(--surface)]">
      <div className="mx-auto flex max-w-[34rem] flex-col items-center gap-4 px-5 py-10 text-center text-[11.5px] text-ink-3">
        <p className="max-w-[28rem] text-pretty leading-relaxed">{t("app.disclaimer")}</p>

        <div className="flex flex-wrap items-baseline justify-center gap-x-2.5 gap-y-1">
          <Link href="/" className={footerLink}>
            {t("property.list")}
          </Link>
          <Dot />
          <span>
            {t.rich("app.credit", {
              author: (chunks) => (
                <a
                  href="https://ed-solutions.be/"
                  target="_blank"
                  rel="noreferrer noopener"
                  className={footerLink}
                >
                  {chunks}
                </a>
              ),
            })}
          </span>
        </div>

        <div className="flex flex-wrap items-baseline justify-center gap-x-2.5 gap-y-1 text-[10.5px] tracking-wide">
          <span className="tabular-nums">
            © {currentYear()} {t("app.name")}
          </span>
          <Dot />
          <span className="tabular-nums">{t("app.version", { version: pkg.version })}</span>
        </div>
      </div>
    </footer>
  );
}
