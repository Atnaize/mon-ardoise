"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";

import { Table, TableScroll, Td, Th } from "@/components/ui/table";
import type { Cents } from "@/engine/money";
import { cn } from "@/lib/cn";
import { money, monthLabel } from "@/lib/format";

export interface TimelineRow {
  rent: Cents;
  expenses: Cents;
  loan: Cents;
  net: Cents;
  cumulative: Cents;
  outstanding: Cents;
  netPosition: Cents;
}

export interface MonthRow extends TimelineRow {
  month: number;
}

export interface YearRow extends TimelineRow {
  year: number;
  months: MonthRow[];
}

function Amount({ cents, locale }: { cents: Cents; locale: string }) {
  return (
    <span className={cents < 0 ? "text-negative" : cents > 0 ? "text-positive" : "text-ink-3"}>
      {money(cents, locale)}
    </span>
  );
}

/** Les colonnes chiffrées, identiques pour une année et pour un mois. */
function Cells({ row, locale }: { row: TimelineRow; locale: string }) {
  return (
    <>
      <Td numeric>{money(row.rent, locale)}</Td>
      <Td numeric>{money(-row.expenses, locale)}</Td>
      <Td numeric>{money(-row.loan, locale)}</Td>
      <Td numeric>
        <Amount cents={row.net} locale={locale} />
      </Td>
      <Td numeric>
        <Amount cents={row.cumulative} locale={locale} />
      </Td>
      <Td numeric>{money(row.outstanding, locale)}</Td>
      <Td numeric>
        <Amount cents={row.netPosition} locale={locale} />
      </Td>
    </>
  );
}

export function TimelineTable({
  rows,
  locale,
  currentYear,
}: {
  rows: YearRow[];
  locale: string;
  currentYear: number;
}) {
  const t = useTranslations("summary");
  const [open, setOpen] = useState<number[]>([]);

  const toggle = (year: number) =>
    setOpen((years) =>
      years.includes(year) ? years.filter((entry) => entry !== year) : [...years, year],
    );

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
            <Th className="text-right">{t("sellNow")}</Th>
          </tr>
        </thead>
        {rows.map((row) => {
          const expanded = open.includes(row.year);

          return (
            <tbody key={row.year}>
              <tr>
                <Td className="p-0">
                  <button
                    type="button"
                    onClick={() => toggle(row.year)}
                    aria-expanded={expanded}
                    aria-label={t("expandYear", { year: row.year })}
                    className="flex w-full items-center gap-1.5 px-3 py-2 text-left tabular-nums transition-colors hover:bg-surface-2"
                  >
                    <span
                      aria-hidden
                      className={cn(
                        "text-[10px] text-ink-3 transition-transform",
                        expanded && "rotate-90",
                      )}
                    >
                      ▶
                    </span>
                    <span className={row.year === currentYear ? "font-semibold text-ink" : undefined}>
                      {row.year}
                    </span>
                  </button>
                </Td>
                <Cells row={row} locale={locale} />
              </tr>
              {expanded
                ? row.months.map((month) => (
                    <tr key={month.month} className="bg-surface-2/50 text-ink-2">
                      <Td className="pl-9 whitespace-nowrap">{monthLabel(month.month, locale)}</Td>
                      <Cells row={month} locale={locale} />
                    </tr>
                  ))
                : null}
            </tbody>
          );
        })}
      </Table>
    </TableScroll>
  );
}
