import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";

import { SignInButton } from "@/components/sign-in-button";
import { Eyebrow } from "@/components/ui/eyebrow";
import { yearMonth } from "@/engine/month";
import { cn } from "@/lib/cn";
import { currentYear } from "@/lib/clock";
import { money, monthLabelLong } from "@/lib/format";

/**
 * Les chiffres de l'aperçu. Un exemple, pas une promesse : le mois du seuil est
 * calculé depuis l'année en cours pour qu'il ne devienne pas une date passée, et
 * la légende dit de quel bien il s'agit.
 */
const EXAMPLE = { effort: 31_200, equity: 48_600, aheadInYears: 6 } as const;

const PILLARS = ["Loan", "Costs", "Rent"] as const;

/** Le filet court qui ouvre un bloc, le même motif qu'au pied de page. */
function Flourish() {
  return <span aria-hidden className="h-px w-8 shrink-0 bg-line" />;
}

function Row({
  label,
  value,
  tone,
}: {
  label: ReactNode;
  value: ReactNode;
  tone: "neutral" | "positive" | "negative";
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 px-4 py-3.5">
      <span className="text-[12.5px] leading-snug text-ink-2">{label}</span>
      <span
        className={cn(
          "font-display text-[1.375rem] leading-none tracking-tight tabular-nums whitespace-nowrap",
          tone === "negative" && "text-negative",
          tone === "positive" && "text-positive",
        )}
      >
        {value}
      </span>
    </div>
  );
}

/**
 * La page d'entrée, pour qui n'est pas connecté. Trois temps : la promesse, la
 * preuve, le périmètre. La preuve est l'aperçu du verdict : c'est le produit, et
 * elle vaut mieux qu'un paragraphe de plus.
 */
export async function Landing({ locale }: { locale: string }) {
  const t = await getTranslations();
  const aheadMonth = yearMonth(currentYear() + EXAMPLE.aheadInYears, 3);

  return (
    <>
      <section className="relative flex flex-col items-start gap-6">
        {/* Une ombre de papier derrière le titre, pas une couleur de marque : elle
            donne le relief qui manque à une colonne de texte posée sur du blanc. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 -top-32 -z-10 h-80 bg-[radial-gradient(70%_100%_at_50%_0%,var(--surface-2),transparent_72%)]"
        />

        {/* Un `p` et non le composant `Eyebrow` : au-dessus du `h1`, un `h2`
            casserait l'ordre des titres. */}
        <div className="flex items-center gap-3">
          <Flourish />
          <p className="text-[10.5px] tracking-[0.14em] text-ink-3 uppercase">
            {t("home.guestEyebrow")}
          </p>
        </div>

        <h1 className="font-display text-[2.125rem] leading-[1.06] font-semibold tracking-[-0.02em] text-balance sm:text-[3.25rem]">
          {t("home.guestTitle")}
        </h1>

        <p className="max-w-[34rem] text-[1.0625rem] leading-relaxed text-pretty text-ink-2 sm:text-[1.125rem]">
          {t("home.guestBody")}
        </p>

        <div className="flex flex-col items-start gap-2.5 pt-1">
          <SignInButton />
          <p className="text-[11.5px] text-ink-3">{t("auth.loginIntro")}</p>
        </div>
      </section>

      <section className="flex flex-col gap-3 border-t border-line pt-6">
        <Eyebrow>{t("home.previewTitle")}</Eyebrow>

        {/* Le seul élément ombré du site : il figure une carte posée sur la page,
            là où tout le reste est imprimé dedans. */}
        <div className="divide-y divide-line-soft overflow-hidden rounded-ui-lg border border-line-soft bg-surface shadow-[0_1px_1px_rgba(28,27,24,0.03),0_16px_32px_-24px_rgba(28,27,24,0.28)]">
          <Row
            label={t("summary.effort")}
            value={money(EXAMPLE.effort, locale)}
            tone="negative"
          />
          <Row
            label={t("summary.equityBuilt")}
            value={money(EXAMPLE.equity, locale)}
            tone="positive"
          />
          <Row
            label={t("home.previewAhead")}
            value={monthLabelLong(aheadMonth, locale)}
            tone="neutral"
          />
        </div>

        <p className="text-[11.5px] leading-normal text-ink-3">{t("home.previewCaption")}</p>
      </section>

      <section className="flex flex-col gap-4 border-t border-line pt-6">
        <Eyebrow>{t("home.pillarsTitle")}</Eyebrow>
        <dl className="grid gap-x-6 gap-y-5 sm:grid-cols-3">
          {PILLARS.map((pillar) => (
            <div key={pillar} className="flex flex-col gap-1.5 border-t border-line-soft pt-3">
              <dt className="font-display text-[0.9375rem] font-semibold tracking-tight">
                {t(`home.pillar${pillar}Title`)}
              </dt>
              <dd className="text-[12.5px] leading-relaxed text-pretty text-ink-2">
                {t(`home.pillar${pillar}Body`)}
              </dd>
            </div>
          ))}
        </dl>
      </section>
    </>
  );
}
