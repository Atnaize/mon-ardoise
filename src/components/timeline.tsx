import { TimelineTable, type YearRow } from "@/components/timeline-table";
import { yearOf } from "@/engine/month";
import type { MonthlyProjection } from "@/engine/types";
import type { ChartPoint } from "@/components/net-position-chart";

interface Landmarks {
  /** Première année où la revente rembourserait tout ce qui a été mis. */
  aheadFrom: number | null;
  /** Année où le capital restant dû tombe à zéro. */
  paidOff: number | null;
  /** Mois de la dernière mensualité. */
  lastInstalment: number | null;
  /** Premier mois où une dette existe : avant lui, un solde nul ne dit rien. */
  firstDebt: number | null;
  currentYear: number;
  /** Le présent, au mois : c'est lui qui sépare ce qui s'est produit de ce qu'on projette. */
  referenceMonth: number;
}

export function landmarksOf(
  projection: readonly MonthlyProjection[],
  referenceMonth: number,
): Landmarks {
  const ahead = projection.find((row) => row.netPosition >= 0);
  const paying = projection.filter((row) => row.loanPayment > 0).at(-1);

  // Un solde nul n'est un prêt éteint qu'après une dette : la projection peut
  // démarrer avant le premier prêt, et un bien peut n'en avoir aucun. Sans cette
  // borne, « prêt soldé » tombait sur la première année d'un prêt à venir.
  const borrowed = projection.findIndex((row) => row.outstandingBalance > 0);
  const settled =
    borrowed < 0
      ? undefined
      : projection.slice(borrowed).find((row) => row.outstandingBalance === 0);

  return {
    aheadFrom: ahead == null ? null : yearOf(ahead.month),
    paidOff: settled == null ? null : yearOf(settled.month),
    lastInstalment: paying?.month ?? null,
    firstDebt: borrowed < 0 ? null : projection[borrowed].month,
    currentYear: yearOf(referenceMonth),
    referenceMonth,
  };
}

/**
 * Une année, trois soldes. Loyer, frais, prêt et net ne sont plus des colonnes :
 * ils se lisent dans la variation de la trésorerie d'une ligne à la suivante, et
 * un solde ne se totalise pas, donc les mois affichés ne peuvent plus contredire
 * l'année par accumulation d'arrondis.
 */
export function groupByYear(
  projection: readonly MonthlyProjection[],
  landmarks: Landmarks,
): YearRow[] {
  const years = new Map<number, YearRow>();

  for (const row of projection) {
    const year = yearOf(row.month);
    const entry =
      years.get(year) ??
      ({
        year,
        months: [],
        partial: false,
        aheadFrom: year === landmarks.aheadFrom,
        paidOff: year === landmarks.paidOff,
        current: year === landmarks.currentYear,
        past: year < landmarks.currentYear,
        cumulative: 0,
        outstanding: 0,
        netPosition: 0,
        settled: false,
      } satisfies YearRow);

    // Un solde nul se lit « soldé » seulement si une dette a existé avant.
    const settled =
      row.outstandingBalance === 0 &&
      landmarks.firstDebt != null &&
      row.month > landmarks.firstDebt;

    entry.months.push({
      month: row.month,
      cumulative: row.cumulative,
      outstanding: row.outstandingBalance,
      netPosition: row.netPosition,
      settled,
      lastInstalment: row.month === landmarks.lastInstalment,
      past: row.month < landmarks.referenceMonth,
    });

    // Des soldes à une date : ceux du dernier mois de l'année, jamais une somme.
    entry.cumulative = row.cumulative;
    entry.outstanding = row.outstandingBalance;
    entry.netPosition = row.netPosition;
    entry.settled = settled;

    years.set(year, entry);
  }

  for (const entry of years.values()) {
    entry.partial = entry.months.length < 12;
  }

  return [...years.values()];
}

export function chartPoints(
  projection: readonly MonthlyProjection[],
  landmarks: Landmarks,
  labels: { now: string; ahead: string; end: string },
): ChartPoint[] {
  const byYear = new Map<number, MonthlyProjection>();

  for (const row of projection) {
    byYear.set(yearOf(row.month), row);
  }

  const years = [...byYear.entries()];
  const lastYear = years.at(-1)?.[0];

  // Trois étiquettes directes au maximum : où on en est, où ça bascule, où ça finit.
  return years.map(([year, row]) => ({
    year,
    value: row.netPosition,
    label:
      year === landmarks.currentYear
        ? labels.now
        : year === landmarks.aheadFrom
          ? labels.ahead
          : year === lastYear
            ? labels.end
            : undefined,
  }));
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
  const landmarks = landmarksOf(projection, referenceMonth);

  return <TimelineTable rows={groupByYear(projection, landmarks)} locale={locale} />;
}
