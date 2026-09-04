import { getTranslations } from "next-intl/server";

import type { Cents } from "@/engine/money";
import type { Indicators } from "@/engine/types";
import { cn } from "@/lib/cn";
import { money } from "@/lib/format";

/**
 * Une liste de postes qui s'additionnent, pas un tableau de données : deux lignes
 * de total portent le poids, les autres restent en retrait. Les filets séparent,
 * aucun cadre n'enferme.
 */
export async function CostBreakdown({
  indicators,
  purchasePrice,
  creditCost,
  endYear,
  locale,
}: {
  indicators: Indicators;
  purchasePrice: Cents;
  creditCost: Cents;
  endYear: number;
  locale: string;
}) {
  const t = await getTranslations("summary");

  const rows: Array<{ label: string; value: Cents; total?: boolean }> = [
    { label: t("costPurchase"), value: purchasePrice },
    { label: t("costUpfront"), value: indicators.upfrontCosts },
    { label: t("costAcquisition"), value: indicators.acquisitionCost, total: true },
    { label: t("costRental"), value: indicators.rentalPeriodCosts },
    { label: t("costRecurring", { year: endYear }), value: indicators.recurringCosts },
    { label: t("costCredit"), value: creditCost },
    { label: t("costTotal", { year: endYear }), value: indicators.totalCostOfOwnership, total: true },
  ];

  return (
    <dl className="m-0 flex flex-col">
      {rows.map((row) => (
        <div
          key={row.label}
          className={cn(
            "flex items-baseline justify-between gap-4 border-t border-line-soft py-2.5",
            row.total && "border-t-line",
          )}
        >
          <dt
            className={cn(
              "text-[13.5px] leading-snug",
              row.total ? "font-medium text-ink" : "text-ink-2",
            )}
          >
            {row.label}
          </dt>
          <dd
            className={cn(
              "m-0 shrink-0 font-display tabular-nums",
              row.total ? "text-[1.0625rem] text-ink" : "text-[15px] text-ink-2",
            )}
          >
            {money(row.value, locale)}
          </dd>
        </div>
      ))}
    </dl>
  );
}
