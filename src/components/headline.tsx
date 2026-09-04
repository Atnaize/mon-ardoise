import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";

import { cn } from "@/lib/cn";
import type { Indicators } from "@/engine/types";
import { money, monthLabelLong } from "@/lib/format";

function Say({ children }: { children: ReactNode }) {
  return (
    <p className="text-[1.125rem] leading-snug tracking-[-0.01em] text-pretty sm:text-[1.2rem]">
      {children}
    </p>
  );
}

function Amount({ children, tone }: { children: ReactNode; tone: "positive" | "negative" }) {
  return (
    <span
      className={cn(
        "font-display text-[1.5em] tabular-nums tracking-[-0.03em] whitespace-nowrap",
        tone === "negative" ? "text-negative" : "text-positive",
      )}
    >
      {children}
    </span>
  );
}

/**
 * Les trois seules questions qu'on se pose sur un bien loué, répondues en trois
 * phrases avec le chiffre dedans. Tout le reste de la page est du détail.
 */
export async function Headline({
  indicators,
  locale,
}: {
  indicators: Indicators;
  locale: string;
}) {
  const t = await getTranslations("summary");
  const effort = indicators.monthlyEffort;
  const position = indicators.netPositionNow;

  return (
    <div className="flex flex-col gap-5 border-t border-line pt-6">
      {/* Le montant est un argument texte, enveloppé dans une balise `<amount>` qui
          porte la mise en forme : t.rich n'accepte pas d'élément pour un argument. */}
      <Say>
        {t.rich(effort > 0 ? "sayCost" : "sayEarns", {
          value: money(Math.abs(effort), locale),
          amount: (chunks) => (
            <Amount tone={effort > 0 ? "negative" : "positive"}>{chunks}</Amount>
          ),
        })}
      </Say>

      <Say>
        {t.rich(position < 0 ? "sayLose" : "sayGain", {
          value: money(Math.abs(position), locale),
          amount: (chunks) => (
            <Amount tone={position < 0 ? "negative" : "positive"}>{chunks}</Amount>
          ),
        })}
      </Say>

      <Say>
        {indicators.netPositionBreakEvenMonth == null
          ? t("sayNeverAhead")
          : t.rich(
              indicators.netPositionBreakEvenMonth <= indicators.referenceMonth
                ? "sayAlreadyAhead"
                : "sayAheadFrom",
              {
                value: monthLabelLong(indicators.netPositionBreakEvenMonth, locale),
                amount: (chunks) => <Amount tone="positive">{chunks}</Amount>,
              },
            )}
      </Say>
    </div>
  );
}
