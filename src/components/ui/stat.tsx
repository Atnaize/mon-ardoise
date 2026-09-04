import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

/**
 * « positive » et « negative » disent de quel côté joue le montant, pas son signe :
 * un coût de crédit est négatif même écrit sans moins. « neutral » est pour les
 * montants sans camp (une valeur, une dette, un cumul de mise) qu'il serait
 * mensonger de peindre.
 */
type Tone = "neutral" | "positive" | "negative";

const RULE: Record<Tone, string> = {
  neutral: "border-l-line",
  positive: "border-l-positive",
  negative: "border-l-negative",
};

const VALUE: Record<Tone, string> = {
  neutral: "text-ink",
  positive: "text-positive",
  negative: "text-negative",
};

export function Stat({
  label,
  value,
  hint,
  tone = "neutral",
  emphasis = false,
}: {
  label: ReactNode;
  value: ReactNode;
  /** L'explication sous le chiffre : c'est elle qui rend la carte lisible. */
  hint?: ReactNode;
  tone?: Tone;
  emphasis?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-col rounded-ui border border-l-2 border-line-soft bg-surface px-3.5 py-3",
        RULE[tone],
        emphasis && "sm:col-span-2",
      )}
    >
      <span className="text-[11.5px] leading-snug text-ink-3">{label}</span>
      <span
        className={cn(
          "mt-0.5 mb-1.5 font-display tabular-nums tracking-tight",
          emphasis ? "text-[1.75rem] leading-none" : "text-2xl leading-tight",
          VALUE[tone],
        )}
      >
        {value}
      </span>
      {hint ? <span className="text-[11.5px] leading-normal text-ink-2">{hint}</span> : null}
    </div>
  );
}

export function StatGrid({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-2 gap-2 sm:grid-cols-2 lg:grid-cols-3">{children}</div>;
}
