import { getTranslations } from "next-intl/server";

import { Table, TableScroll, Td, Th } from "@/components/ui/table";
import { yearOf } from "@/engine/month";
import type { MonthlyProjection } from "@/engine/types";
import { money, monthLabel } from "@/lib/format";

function Amount({ cents, locale }: { cents: number; locale: string }) {
  return (
    <span className={cents < 0 ? "text-negative" : cents > 0 ? "text-positive" : "text-ink-3"}>
      {money(cents, locale)}
    </span>
  );
}

export async function MonthlyTimeline({
  projection,
  locale,
  from,
  months = 12,
}: {
  projection: MonthlyProjection[];
  locale: string;
  from: number;
  months?: number;
}) {
  const t = await getTranslations("summary");
  const start = Math.max(
    0,
    projection.findIndex((row) => row.month >= from),
  );
  const rows = projection.slice(start, start + months);

  return (
    <TableScroll>
      <Table>
        <thead>
          <tr>
            <Th>{t("month")}</Th>
            <Th className="text-right">{t("rent")}</Th>
            <Th className="text-right">{t("expenses")}</Th>
            <Th className="text-right">{t("loan")}</Th>
            <Th className="text-right">{t("net")}</Th>
            <Th className="text-right">{t("cumulative")}</Th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.month}>
              <Td className="whitespace-nowrap">{monthLabel(row.month, locale)}</Td>
              <Td numeric>{money(row.rent, locale)}</Td>
              <Td numeric>{money(-row.expenses, locale)}</Td>
              <Td numeric>{money(-(row.loanPayment + row.loanInsurance + row.loanPenalty + row.loanPrepayment), locale)}</Td>
              <Td numeric>
                <Amount cents={row.net} locale={locale} />
              </Td>
              <Td numeric>
                <Amount cents={row.cumulative} locale={locale} />
              </Td>
            </tr>
          ))}
        </tbody>
      </Table>
    </TableScroll>
  );
}

export async function YearlyTimeline({
  projection,
  locale,
}: {
  projection: MonthlyProjection[];
  locale: string;
}) {
  const t = await getTranslations("summary");

  const years = new Map<number, { rent: number; expenses: number; loan: number; net: number; cumulative: number; outstanding: number }>();

  for (const row of projection) {
    const year = yearOf(row.month);
    const entry = years.get(year) ?? { rent: 0, expenses: 0, loan: 0, net: 0, cumulative: 0, outstanding: 0 };

    entry.rent += row.rent;
    entry.expenses += row.expenses;
    entry.loan += row.loanPayment + row.loanInsurance + row.loanPenalty + row.loanPrepayment;
    entry.net += row.net;
    entry.cumulative = row.cumulative;
    entry.outstanding = row.outstandingBalance;

    years.set(year, entry);
  }

  return (
    <TableScroll>
      <Table>
        <thead>
          <tr>
            <Th>{t("year")}</Th>
            <Th className="text-right">{t("rent")}</Th>
            <Th className="text-right">{t("expenses")}</Th>
            <Th className="text-right">{t("loan")}</Th>
            <Th className="text-right">{t("net")}</Th>
            <Th className="text-right">{t("cumulative")}</Th>
            <Th className="text-right">{t("outstanding")}</Th>
          </tr>
        </thead>
        <tbody>
          {[...years.entries()].map(([year, entry]) => (
            <tr key={year}>
              <Td className="tabular-nums">{year}</Td>
              <Td numeric>{money(entry.rent, locale)}</Td>
              <Td numeric>{money(-entry.expenses, locale)}</Td>
              <Td numeric>{money(-entry.loan, locale)}</Td>
              <Td numeric>
                <Amount cents={entry.net} locale={locale} />
              </Td>
              <Td numeric>
                <Amount cents={entry.cumulative} locale={locale} />
              </Td>
              <Td numeric>{money(entry.outstanding, locale)}</Td>
            </tr>
          ))}
        </tbody>
      </Table>
    </TableScroll>
  );
}
