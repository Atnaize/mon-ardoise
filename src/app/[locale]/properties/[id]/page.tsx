import { getTranslations } from "next-intl/server";
import { notFound, redirect } from "next/navigation";

import { AppShell, PageTitle } from "@/components/app-shell";
import { CostBreakdown } from "@/components/cost-breakdown";
import { DeleteForm } from "@/components/forms/delete-form";
import { FlowLineForm } from "@/components/forms/flow-line-form";
import { LeaseForm } from "@/components/forms/lease-form";
import { LoanForm } from "@/components/forms/loan-form";
import { MonthlyTimeline, YearlyTimeline } from "@/components/timeline";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Stat, StatGrid } from "@/components/ui/stat";
import { Link } from "@/i18n/navigation";
import { money, monthLabel, percent } from "@/lib/format";
import { natureOf } from "@/lib/nature";
import { todayIso } from "@/lib/clock";
import { currentUser } from "@/lib/session";
import {
  deleteFlowLineAction,
  deleteLeaseAction,
  deleteLoanAction,
} from "@/server/actions";
import { loadProjection } from "@/server/properties";

const STATUS_TONE = { preparing: "warning", rented: "positive", occupied: "neutral" } as const;

const PERIODICITY_KEY = {
  monthly: "Monthly",
  quarterly: "Quarterly",
  yearly: "Yearly",
  every_n_years: "EveryNYears",
} as const;

const NATURE_KEY = { upfront: "Upfront", one_off: "OneOff", recurring: "Recurring" } as const;

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

  const { bundle, projection, indicators, ledger } = loaded;
  const last = projection.at(-1)!;
  const growthPpm = bundle.property.valueGrowthRatePpm;
  const now = todayIso();

  return (
    <AppShell>
      <PageTitle
        title={bundle.property.name}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Link href={`/properties/${id}/rent`}>
              <Button size="sm">{t("rent.link")}</Button>
            </Link>
            <Link href={`/properties/${id}/edit`}>
              <Button variant="secondary" size="sm">
                {t("property.edit")}
              </Button>
            </Link>
            <Link href="/">
              <Button variant="ghost" size="sm">
                {t("common.back")}
              </Button>
            </Link>
          </div>
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
        <Stat label={t("summary.cashOnCash")} value={percent(indicators.cashOnCashPpm, locale)} />
        <Stat label={t("summary.cashInvested")} value={money(indicators.cashInvested, locale)} />
        <Stat
          label={t("summary.propertyValue")}
          hint={
            growthPpm === 0
              ? t("summary.propertyValueFlat")
              : t("summary.propertyValueGrown", {
                  rate: percent(growthPpm, locale),
                  years: bundle.property.horizonYears,
                })
          }
          value={money(last.propertyValue, locale)}
        />
        <Stat
          label={t("summary.netWorth")}
          hint={t("summary.netWorthHint", {
            value: money(last.propertyValue, locale),
            debt: money(last.outstandingBalance, locale),
            month: monthLabel(last.month, locale),
          })}
          value={money(indicators.finalNetWorth, locale)}
        />
      </StatGrid>

      <CostBreakdown
        indicators={indicators}
        purchasePrice={bundle.property.purchasePrice ?? 0}
        creditCost={indicators.totalCreditCost}
        horizonYears={bundle.property.horizonYears}
        locale={locale}
      />

      {ledger.outstanding > 0 ? (
        <Link
          href={`/properties/${id}/rent`}
          className="rounded-ui border-l-2 border-negative bg-surface px-4 py-3 text-sm text-negative transition-colors hover:bg-surface-2"
        >
          {t("rent.overdue", { count: ledger.overdueMonths.length })} ·{" "}
          {money(ledger.outstanding, locale)}
        </Link>
      ) : null}

      {indicators.rentStartMonth == null ? (
        <p className="rounded-ui border-l-2 border-warning bg-surface px-4 py-3 text-sm text-ink-2">
          {t("summary.noRent")}
        </p>
      ) : null}

      <Card>
        <CardHeader
          title={t("summary.loans")}
          action={
            <LoanForm propertyId={id} locale={locale} today={now} label={t("summary.addLoan")} />
          }
        />
        <CardBody>
          {bundle.loans.length === 0 ? (
            <p className="text-sm text-ink-3">{t("summary.loansEmpty")}</p>
          ) : (
            <ul className="flex flex-col divide-y divide-line-soft">
              {bundle.loans.map(({ loan, ratePeriods }) => (
                <li key={loan.id} className="flex flex-col gap-3 py-3 first:pt-0">
                  <div className="flex flex-wrap items-baseline justify-between gap-3">
                    <span className="text-sm font-medium text-ink">{loan.label}</span>
                    <span className="text-sm tabular-nums text-ink-2">
                      {money(loan.principal, locale)} ·{" "}
                      {percent(ratePeriods[0]?.annualRatePpm ?? null, locale)} · {loan.termMonths}{" "}
                      {t("fields.months")} · {loan.startDate}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <LoanForm
                      propertyId={id}
                      loanId={loan.id}
                      locale={locale}
                      today={now}
                      label={t("summary.edit")}
                      defaults={{
                        ...loan,
                        annualRatePpm: ratePeriods[0]?.annualRatePpm,
                        rateBasis: ratePeriods[0]?.rateBasis,
                      }}
                    />
                    <DeleteForm
                      action={deleteLoanAction.bind(null, id, loan.id)}
                      locale={locale}
                      label={t("summary.delete")}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title={t("summary.leases")}
          action={
            <LeaseForm propertyId={id} locale={locale} today={now} label={t("summary.addLease")} />
          }
        />
        <CardBody>
          {bundle.leases.length === 0 ? (
            <p className="text-sm text-ink-3">{t("summary.leasesEmpty")}</p>
          ) : (
            <ul className="flex flex-col divide-y divide-line-soft">
              {bundle.leases.map((entry) => (
                <li key={entry.id} className="flex flex-col gap-3 py-3 first:pt-0">
                  <div className="flex flex-wrap items-baseline justify-between gap-3">
                    <span className="text-sm font-medium text-ink">{entry.tenantLabel}</span>
                    <span className="text-sm tabular-nums text-ink-2">
                      {money(entry.monthlyRent, locale)} ·{" "}
                      {percent(entry.indexationRatePpm, locale)} · {entry.startDate} →{" "}
                      {entry.endDate ?? "—"}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <LeaseForm
                      propertyId={id}
                      leaseId={entry.id}
                      locale={locale}
                      today={now}
                      label={t("summary.edit")}
                      defaults={entry}
                    />
                    <DeleteForm
                      action={deleteLeaseAction.bind(null, id, entry.id)}
                      locale={locale}
                      label={t("summary.delete")}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title={t("summary.lines")}
          action={
            <FlowLineForm propertyId={id} locale={locale} today={now} label={t("summary.addLine")} />
          }
        />
        <CardBody>
          {bundle.lines.length === 0 ? (
            <p className="text-sm text-ink-3">{t("summary.linesEmpty")}</p>
          ) : (
            <ul className="flex flex-col divide-y divide-line-soft">
              {bundle.lines.map((line) => (
                <li key={line.id} className="flex flex-col gap-3 py-3 first:pt-0">
                  <div className="flex flex-wrap items-baseline justify-between gap-3">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-sm font-medium text-ink">{line.label}</span>
                      <span className="text-xs text-ink-3">
                        {t(`fields.flow${line.kind === "expense" ? "Expense" : "Income"}`)} ·{" "}
                        {t(`fields.nature${NATURE_KEY[natureOf(line)]}`)}
                        {line.recurrence !== "one_off"
                          ? ` · ${t(`fields.recurrence${PERIODICITY_KEY[line.recurrence]}`)}`
                          : ""}
                        {line.capitalize && line.amortizationYears
                          ? ` · ${line.amortizationYears} ${t("fields.years")}`
                          : ""}
                      </span>
                    </div>
                    <span
                      className={`text-sm tabular-nums ${
                        line.kind === "expense" ? "text-negative" : "text-positive"
                      }`}
                    >
                      {line.amountMode === "percent_of_rent"
                        ? percent(line.amount, locale)
                        : money(line.amount, locale)}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <FlowLineForm
                      propertyId={id}
                      lineId={line.id}
                      locale={locale}
                      today={now}
                      label={t("summary.edit")}
                      defaults={line}
                    />
                    <DeleteForm
                      action={deleteFlowLineAction.bind(null, id, line.id)}
                      locale={locale}
                      label={t("summary.delete")}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>

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
