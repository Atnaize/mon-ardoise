"use client";

import { useTranslations } from "next-intl";
import { useState, type ReactNode } from "react";

import { Table, TableScroll, Td, Th } from "@/components/ui/table";
import type { Cents } from "@/engine/money";
import { cn } from "@/lib/cn";
import { money, monthLabel } from "@/lib/format";

export interface TimelineRow {
  /** Trésorerie cumulée, capital restant dû et position à la revente : trois soldes. */
  cumulative: Cents;
  outstanding: Cents;
  netPosition: Cents;
  /** Solde nul parce que le prêt est éteint, et non parce qu'il n'a pas commencé. */
  settled: boolean;
  /**
   * Révolu. « Si tu vends » est une question posée au présent : sur une échéance
   * passée, elle n'a plus de réponse, et un montant y ferait croire à une option
   * qu'on n'a plus. Le cumul et le capital restant dû, eux, sont des faits et
   * restent affichés.
   */
  past: boolean;
}

export interface MonthRow extends TimelineRow {
  month: number;
  /** Le mois de la dernière mensualité : la date exacte où le prêt s'éteint. */
  lastInstalment: boolean;
}

export interface YearRow extends TimelineRow {
  year: number;
  months: MonthRow[];
  /** Année partielle : la première d'une projection, ou la dernière d'un horizon tronqué. */
  partial: boolean;
  aheadFrom: boolean;
  paidOff: boolean;
  current: boolean;
}

function Amount({ cents, locale }: { cents: Cents; locale: string }) {
  return (
    <span
      className={cn(
        cents < 0 ? "text-negative" : cents > 0 ? "text-positive" : "text-ink-3",
      )}
    >
      {money(cents, locale)}
    </span>
  );
}

// Une étiquette ne pousse jamais la colonne : elle passe à la ligne. Trois d'entre
// elles peuvent tomber sur la même année, et une première colonne qui s'élargit
// chasse « si tu vends » hors de l'écran.
function Flag({ children, tone }: { children: string; tone: "positive" | "muted" }) {
  return (
    <span
      className={cn(
        "text-[9.5px] tracking-[0.08em] whitespace-nowrap uppercase",
        tone === "positive" ? "text-positive" : "text-ink-3",
      )}
    >
      {children}
    </span>
  );
}

/** Le millésime et ses étiquettes : une seule ligne quand ça tient, plusieurs sinon. */
function Flags({ children }: { children: ReactNode }) {
  return <span className="flex flex-wrap items-baseline gap-x-1.5">{children}</span>;
}

export function TimelineTable({ rows, locale }: { rows: YearRow[]; locale: string }) {
  const t = useTranslations("summary");
  const [open, setOpen] = useState<number[]>([]);

  const toggle = (year: number) =>
    setOpen((years) =>
      years.includes(year) ? years.filter((entry) => entry !== year) : [...years, year],
    );

  return (
    <TableScroll className="rounded-none border-0 bg-transparent">
      <Table className="min-w-0">
        <thead>
          <tr>
            <Th className="pl-0">{t("year")}</Th>
            <Th className="text-right">{t("cumulative")}</Th>
            <Th className="text-right">{t("outstanding")}</Th>
            <Th className="pr-0 text-right">{t("sellNow")}</Th>
          </tr>
        </thead>
        {rows.map((row) => {
          const expanded = open.includes(row.year);

          return (
            <tbody key={row.year}>
              <tr
                onClick={() => toggle(row.year)}
                className={cn(
                  "cursor-pointer",
                  // Les deux années qu'on doit trouver sans lire. Trois signaux chacune :
                  // un fond, un filet dans la marge, une étiquette en clair.
                  row.aheadFrom && "bg-positive-wash",
                  row.paidOff && "bg-surface-2",
                  row.current && !row.aheadFrom && !row.paidOff && "bg-surface-2/60",
                )}
              >
                <Td
                  className={cn(
                    "relative pl-0 text-ink",
                    row.current && "font-semibold",
                    row.aheadFrom &&
                      "before:absolute before:-left-2 before:top-0 before:bottom-0 before:w-0.5 before:bg-positive before:content-['']",
                    row.paidOff &&
                      "before:absolute before:-left-2 before:top-0 before:bottom-0 before:w-0.5 before:bg-ink-3 before:content-['']",
                  )}
                >
                  <Flags>
                    <span className="whitespace-nowrap">
                      <span
                        aria-hidden
                        className={cn(
                          "mr-1 inline-block w-2.5 text-[8px] text-ink-3 transition-transform",
                          expanded && "rotate-90",
                        )}
                      >
                        ▶
                      </span>
                      {row.year}
                    </span>
                    {row.partial ? (
                      <Flag tone="muted">{t("partialYear", { count: row.months.length })}</Flag>
                    ) : null}
                    {row.aheadFrom ? <Flag tone="positive">{t("flagAhead")}</Flag> : null}
                    {row.paidOff ? <Flag tone="muted">{t("flagPaidOff")}</Flag> : null}
                    {row.current ? <Flag tone="muted">{t("flagNow")}</Flag> : null}
                  </Flags>
                </Td>
                <Td numeric>
                  <Amount cents={row.cumulative} locale={locale} />
                </Td>
                <Td numeric className="text-ink-3">
                  {row.outstanding === 0
                    ? row.settled
                      ? t("settled")
                      : "-"
                    : money(row.outstanding, locale)}
                </Td>
                <Td numeric className="pr-0 text-sm font-medium">
                  {row.past ? (
                    <span className="font-normal text-ink-3">-</span>
                  ) : (
                    <Amount cents={row.netPosition} locale={locale} />
                  )}
                </Td>
              </tr>

              {/* Les mois sont des lignes sœurs dans la même table, pas une table
                  imbriquée : c'est la seule façon que leurs colonnes restent
                  alignées sur celles des années. */}
              {expanded
                ? row.months.map((month) => (
                    <tr key={month.month} className="bg-surface-2/40">
                      {/* Le décrochement et le filet gauche disent la subordination :
                          sans eux les mois se lisent comme des années. */}
                      <Td className="border-t-transparent py-1 pl-6 text-ink-2 shadow-[inset_2px_0_0_var(--line)]">
                        <Flags>
                          <span className="whitespace-nowrap">
                            {monthLabel(month.month, locale)}
                          </span>
                          {month.lastInstalment ? (
                            <Flag tone="muted">{t("flagLastInstalment")}</Flag>
                          ) : null}
                        </Flags>
                      </Td>
                      <Td numeric className="border-t-transparent py-1 text-xs">
                        <Amount cents={month.cumulative} locale={locale} />
                      </Td>
                      <Td numeric className="border-t-transparent py-1 text-xs text-ink-3">
                        {month.outstanding === 0
                          ? month.settled
                            ? t("settled")
                            : "-"
                          : money(month.outstanding, locale)}
                      </Td>
                      <Td numeric className="border-t-transparent py-1 pr-0 text-xs">
                        {month.past ? (
                          <span className="text-ink-3">-</span>
                        ) : (
                          <Amount cents={month.netPosition} locale={locale} />
                        )}
                      </Td>
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
