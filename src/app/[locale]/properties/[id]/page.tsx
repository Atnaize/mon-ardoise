import { getTranslations } from "next-intl/server";
import { notFound, redirect } from "next/navigation";

import { AppShell, PageTitle } from "@/components/app-shell";
import { FlowLineForm } from "@/components/flow-line-form";
import { MonthlyTimeline, YearlyTimeline } from "@/components/timeline";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Stat, StatGrid } from "@/components/ui/stat";
import { Table, TableScroll, Td, Th } from "@/components/ui/table";
import { Link } from "@/i18n/navigation";
import { money, monthLabel, percent } from "@/lib/format";
import { currentUser } from "@/lib/session";
import { deleteFlowLineAction } from "@/server/actions";
import { loadProjection } from "@/server/properties";

const STATUS_TONE = { preparing: "warning", rented: "positive", occupied: "neutral" } as const;

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export default async function PropertyPage({ params }: PageProps<"/[locale]/properties/[id]">) {
  const { locale, id } = await params;
  const t = await getTranslations();
  const user = await currentUser();

  if (!user) {
    redirect(`/${locale}/login`);
  }

  const loaded = await loadProjection(user.id, id);

  if (!loaded) {
    notFound();
  }

  const { bundle, projection, indicators } = loaded;
  const hasRent = indicators.grossYieldPpm != null;

  return (
    <AppShell>
      <PageTitle
        title={bundle.property.name}
        action={
          <Link href="/">
            <Button variant="ghost" size="sm">
              {t("common.back")}
            </Button>
          </Link>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={STATUS_TONE[bundle.property.status]}>
          {t(`property.status.${bundle.property.status}`)}
        </Badge>
        <Badge>{t(`property.type.${bundle.property.type}`)}</Badge>
        <Badge>{t(`property.region.${bundle.property.region}`)}</Badge>
        <Badge>
          {bundle.property.horizonYears} {t("fields.years")}
        </Badge>
      </div>

      <StatGrid>
        <Stat
          emphasis
          label={t("summary.effort")}
          hint={t("summary.effortHint", { month: monthLabel(indicators.referenceMonth, locale) })}
          value={money(indicators.monthlyEffort, locale)}
          tone={indicators.monthlyEffort > 0 ? "negative" : "positive"}
        />
        <Stat
          label={t("summary.cashflow")}
          value={money(indicators.averageMonthlyNet, locale)}
          tone={indicators.averageMonthlyNet < 0 ? "negative" : "positive"}
        />
        <Stat
          label={t("summary.breakEven")}
          value={
            indicators.breakEvenMonth == null
              ? t("summary.breakEvenNever")
              : monthLabel(indicators.breakEvenMonth, locale)
          }
        />
        <Stat
          label={t("summary.worstCumulative")}
          value={money(indicators.worstCumulative, locale)}
          tone={indicators.worstCumulative < 0 ? "negative" : "neutral"}
        />
        <Stat
          label={t("summary.grossYield")}
          hint={
            indicators.rentStartMonth == null
              ? undefined
              : t("summary.yieldHint", { month: monthLabel(indicators.rentStartMonth, locale) })
          }
          value={percent(indicators.grossYieldPpm, locale)}
        />
        <Stat label={t("summary.netYield")} value={percent(indicators.netYieldPpm, locale)} />
        <Stat
          label={t("summary.netNetYield")}
          hint={t("summary.netNetYieldHint")}
          value={percent(indicators.netNetYieldPpm, locale)}
        />
        <Stat label={t("summary.cashOnCash")} value={percent(indicators.cashOnCashPpm, locale)} />
        <Stat label={t("summary.acquisitionCost")} value={money(indicators.acquisitionCost, locale)} />
        <Stat label={t("summary.cashInvested")} value={money(indicators.cashInvested, locale)} />
        <Stat label={t("summary.totalCreditCost")} value={money(indicators.totalCreditCost, locale)} />
        <Stat label={t("summary.netWorth")} value={money(indicators.finalNetWorth, locale)} />
      </StatGrid>

      {hasRent ? null : (
        <p className="rounded-ui border-l-2 border-warning bg-surface px-4 py-3 text-sm text-ink-2">
          {t("summary.noRent")}
        </p>
      )}

      <Card>
        <CardHeader
          title={t("summary.lines")}
          action={<FlowLineForm propertyId={id} locale={locale} today={today()} />}
        />
        <CardBody>
          {bundle.lines.length === 0 ? (
            <p className="text-sm text-ink-3">{t("summary.linesEmpty")}</p>
          ) : (
            <ul className="flex flex-col divide-y divide-line-soft">
              {bundle.lines.map((line) => (
                <li key={line.id} className="flex flex-wrap items-center justify-between gap-3 py-2.5">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm font-medium text-ink">{line.label}</span>
                    <span className="text-xs text-ink-3">
                      {t(`fields.flow${line.kind === "expense" ? "Expense" : "Income"}`)} ·{" "}
                      {t(
                        `fields.recurrence${
                          {
                            one_off: "OneOff",
                            monthly: "Monthly",
                            quarterly: "Quarterly",
                            yearly: "Yearly",
                            every_n_years: "EveryNYears",
                          }[line.recurrence]
                        }`,
                      )}
                      {line.capitalize && line.amortizationYears
                        ? ` · ${line.amortizationYears} ${t("fields.years")}`
                        : ""}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className={`text-sm tabular-nums ${
                        line.kind === "expense" ? "text-negative" : "text-positive"
                      }`}
                    >
                      {line.amountMode === "percent_of_rent"
                        ? percent(line.amount, locale)
                        : money(line.amount, locale)}
                    </span>
                    <form action={deleteFlowLineAction.bind(null, id, line.id)}>
                      <Button type="submit" variant="danger" size="sm">
                        {t("summary.delete")}
                      </Button>
                    </form>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>

      {bundle.loans.length > 0 ? (
        <Card>
          <CardHeader title={t("summary.loans")} />
          <CardBody className="p-0">
            <TableScroll className="rounded-none border-0">
              <Table className="min-w-[30rem]">
                <thead>
                  <tr>
                    <Th>{t("fields.loanLabel")}</Th>
                    <Th className="text-right">{t("fields.principal")}</Th>
                    <Th className="text-right">{t("fields.annualRate")}</Th>
                    <Th className="text-right">{t("fields.termMonths")}</Th>
                    <Th>{t("fields.startDate")}</Th>
                  </tr>
                </thead>
                <tbody>
                  {bundle.loans.map(({ loan, ratePeriods }) => (
                    <tr key={loan.id}>
                      <Td>{loan.label}</Td>
                      <Td numeric>{money(loan.principal, locale)}</Td>
                      <Td numeric>{percent(ratePeriods[0]?.annualRatePpm ?? null, locale)}</Td>
                      <Td numeric>{loan.termMonths}</Td>
                      <Td>{loan.startDate}</Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </TableScroll>
          </CardBody>
        </Card>
      ) : null}

      {bundle.leases.length > 0 ? (
        <Card>
          <CardHeader title={t("summary.leases")} />
          <CardBody className="p-0">
            <TableScroll className="rounded-none border-0">
              <Table className="min-w-[30rem]">
                <thead>
                  <tr>
                    <Th>{t("fields.tenantLabel")}</Th>
                    <Th className="text-right">{t("fields.monthlyRent")}</Th>
                    <Th className="text-right">{t("fields.indexationRate")}</Th>
                    <Th>{t("fields.startDate")}</Th>
                    <Th>{t("fields.endDate")}</Th>
                  </tr>
                </thead>
                <tbody>
                  {bundle.leases.map((entry) => (
                    <tr key={entry.id}>
                      <Td>{entry.tenantLabel}</Td>
                      <Td numeric>{money(entry.monthlyRent, locale)}</Td>
                      <Td numeric>{percent(entry.indexationRatePpm, locale)}</Td>
                      <Td>{entry.startDate}</Td>
                      <Td>{entry.endDate ?? "—"}</Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </TableScroll>
          </CardBody>
        </Card>
      ) : null}

      <section className="flex flex-col gap-3">
        <h2 className="font-display text-sm font-bold tracking-tight">{t("summary.timeline")}</h2>
        <MonthlyTimeline projection={projection} locale={locale} />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-display text-sm font-bold tracking-tight">{t("summary.timelineAll")}</h2>
        <YearlyTimeline projection={projection} locale={locale} />
      </section>
    </AppShell>
  );
}
