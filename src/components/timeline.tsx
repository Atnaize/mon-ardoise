import { TimelineTable, type YearRow } from "@/components/timeline-table";
import { yearOf } from "@/engine/month";
import type { MonthlyProjection } from "@/engine/types";

/**
 * Regroupe la projection par année civile. Les flux se totalisent, les soldes — cumul,
 * capital restant dû, position à la revente — sont ceux du dernier mois de l'année.
 */
function groupByYear(projection: readonly MonthlyProjection[]): YearRow[] {
  const years = new Map<number, YearRow>();

  for (const row of projection) {
    const year = yearOf(row.month);
    const entry =
      years.get(year) ??
      ({
        year,
        months: [],
        rent: 0,
        expenses: 0,
        loan: 0,
        net: 0,
        cumulative: 0,
        outstanding: 0,
        netPosition: 0,
      } satisfies YearRow);
    const loan = row.loanPayment + row.loanInsurance + row.loanPenalty + row.loanPrepayment;

    entry.months.push({
      month: row.month,
      rent: row.rent,
      expenses: row.expenses,
      loan,
      net: row.net,
      cumulative: row.cumulative,
      outstanding: row.outstandingBalance,
      netPosition: row.netPosition,
    });

    entry.rent += row.rent;
    entry.expenses += row.expenses;
    entry.loan += loan;
    entry.net += row.net;
    entry.cumulative = row.cumulative;
    entry.outstanding = row.outstandingBalance;
    entry.netPosition = row.netPosition;

    years.set(year, entry);
  }

  return [...years.values()];
}

export function Timeline({
  projection,
  locale,
  referenceMonth,
}: {
  projection: MonthlyProjection[];
  locale: string;
  referenceMonth: number;
}) {
  return (
    <TimelineTable
      rows={groupByYear(projection)}
      locale={locale}
      currentYear={yearOf(referenceMonth)}
    />
  );
}
