import { getTranslations } from "next-intl/server";

import { Card, CardHeader } from "@/components/ui/card";
import { Table, TableScroll, Td } from "@/components/ui/table";
import type { Cents } from "@/engine/money";
import type { Indicators } from "@/engine/types";
import { money } from "@/lib/format";

export async function CostBreakdown({
  indicators,
  purchasePrice,
  creditCost,
  horizonYears,
  locale,
}: {
  indicators: Indicators;
  purchasePrice: Cents;
  creditCost: Cents;
  horizonYears: number;
  locale: string;
}) {
  const t = await getTranslations("summary");

  const rows: Array<{ label: string; value: Cents; strong?: boolean }> = [
    { label: t("costPurchase"), value: purchasePrice },
    { label: t("costUpfront"), value: indicators.upfrontCosts },
    { label: t("costAcquisition"), value: indicators.acquisitionCost, strong: true },
    { label: t("costRental"), value: indicators.rentalPeriodCosts },
    { label: t("costRecurring", { years: horizonYears }), value: indicators.recurringCosts },
    { label: t("costCredit"), value: creditCost },
    { label: t("costTotal", { years: horizonYears }), value: indicators.totalCostOfOwnership, strong: true },
  ];

  return (
    <Card>
      <CardHeader title={t("costsTitle")} />
      <TableScroll className="rounded-none border-0">
        <Table className="min-w-[20rem]">
          <tbody>
            {rows.map((row) => (
              <tr key={row.label} className={row.strong ? "bg-surface-2" : undefined}>
                <Td className={row.strong ? "font-semibold text-ink" : "text-ink-2"}>{row.label}</Td>
                <Td numeric className={row.strong ? "font-semibold text-ink" : "text-ink-2"}>
                  {money(row.value, locale)}
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </TableScroll>
    </Card>
  );
}
