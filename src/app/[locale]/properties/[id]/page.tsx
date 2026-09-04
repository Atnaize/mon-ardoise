import { getTranslations } from "next-intl/server";
import { notFound, redirect } from "next/navigation";

import { AppShell } from "@/components/app-shell";
import { CostBreakdown } from "@/components/cost-breakdown";
import { DeleteForm } from "@/components/forms/delete-form";
import { FlowLineForm } from "@/components/forms/flow-line-form";
import { LeaseForm } from "@/components/forms/lease-form";
import { LoanForm } from "@/components/forms/loan-form";
import { Headline } from "@/components/headline";
import { NetPositionChart } from "@/components/net-position-chart";
import { PropertyHeader } from "@/components/property-header";
import { chartPoints, landmarksOf, Timeline } from "@/components/timeline";
import { Badge } from "@/components/ui/badge";
import { Section, SectionItem, SectionList } from "@/components/ui/section";
import { Stat, StatGrid } from "@/components/ui/stat";
import { yearOf } from "@/engine/month";
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
  const landmarks = landmarksOf(projection, indicators.referenceMonth);
  const lastLoanEnd = (landmarks.lastInstalment ?? last.month) + 1;
  const atReference =
    projection.find((row) => row.month >= indicators.referenceMonth) ?? projection[0];
  const growthPpm = bundle.property.valueGrowthRatePpm;
  const now = todayIso();

  return (
    <AppShell>
      <PropertyHeader
        name={bundle.property.name}
        propertyId={id}
        hasLease={bundle.leases.length > 0}
      />

      <div className="flex flex-wrap items-center gap-2">
        <Badge>{t(`property.type.${bundle.property.type}`)}</Badge>
        <Badge>
          {bundle.property.horizonYears} {t("fields.years")}
        </Badge>
      </div>

      <Headline indicators={indicators} locale={locale} />

      <NetPositionChart
        points={chartPoints(projection, landmarks, {
          now: t("summary.chartNow"),
          ahead: t("summary.chartAhead"),
          end: money(last.netPosition, locale),
        })}
        locale={locale}
        caption={t("summary.chartCaption")}
      />

      <Section title={t("summary.dossier")}>
        <StatGrid>
          {indicators.oneOffCostsAhead > 0 ? (
            <Stat
              label={t("summary.oneOffAhead")}
              hint={t("summary.oneOffAheadHint")}
              value={money(indicators.oneOffCostsAhead, locale)}
              tone="negative"
            />
          ) : null}
          <Stat
            label={t("summary.equityBuilt")}
            hint={t("summary.equityBuiltHint")}
            value={money(indicators.monthlyEquityBuilt, locale)}
            tone="positive"
          />
          <Stat
            label={t("summary.netAfterLoans")}
            hint={
              indicators.monthlyNetAfterLoans == null
                ? undefined
                : t("summary.netAfterLoansHint", {
                    month: monthLabel(lastLoanEnd, locale),
                  })
            }
            value={
              indicators.monthlyNetAfterLoans == null
                ? t("summary.netAfterLoansNever")
                : money(indicators.monthlyNetAfterLoans, locale)
            }
            tone={(indicators.monthlyNetAfterLoans ?? 0) > 0 ? "positive" : "neutral"}
          />
          <Stat
            label={t("summary.cashInvested")}
            hint={t("summary.cashInvestedHint")}
            value={money(indicators.cashInvested, locale)}
          />
          <Stat
            label={t("summary.propertyValue")}
            hint={
              growthPpm === 0
                ? t("summary.propertyValueFlat")
                : t("summary.propertyValueGrown", {
                    rate: percent(growthPpm, locale),
                    year: yearOf(last.month),
                  })
            }
            value={money(last.propertyValue, locale)}
          />
          <Stat
            label={t("summary.netWorthNow")}
            hint={t("summary.netWorthNowHint", {
              value: money(atReference.propertyValue, locale),
              debt: money(atReference.outstandingBalance, locale),
            })}
            value={money(indicators.netWorthNow, locale)}
          />
          <Stat
            label={t("summary.cashInjected")}
            hint={t("summary.cashInjectedHint")}
            value={money(indicators.cashInjectedNow, locale)}
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
          <Stat
            label={t("summary.totalCreditCost")}
            hint={t("summary.totalCreditCostHint")}
            value={money(indicators.totalCreditCost, locale)}
            tone="negative"
          />
        </StatGrid>
      </Section>

      <Section title={t("summary.costsTitle")}>
        <CostBreakdown
          indicators={indicators}
          purchasePrice={bundle.property.purchasePrice ?? 0}
          creditCost={indicators.totalCreditCost}
          endYear={yearOf(last.month)}
          locale={locale}
        />
      </Section>

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

      <Section
        title={t("summary.loans")}
        action={
          <LoanForm propertyId={id} locale={locale} today={now} label={t("summary.addLoan")} />
        }
      >
        {bundle.loans.length === 0 ? (
          <p className="text-[13.5px] text-ink-3">{t("summary.loansEmpty")}</p>
        ) : (
          <SectionList>
            {bundle.loans.map(({ loan, ratePeriods }) => (
              <SectionItem
                key={loan.id}
                title={loan.label}
                detail={`${money(loan.principal, locale)} · ${percent(
                  ratePeriods[0]?.annualRatePpm ?? null,
                  locale,
                )} · ${loan.termMonths} ${t("fields.months")} · ${loan.startDate}`}
                actions={
                  <>
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
                  </>
                }
              />
            ))}
          </SectionList>
        )}
      </Section>

      <Section
        title={t("summary.leases")}
        action={
          <LeaseForm propertyId={id} locale={locale} today={now} label={t("summary.addLease")} />
        }
      >
        {bundle.leases.length === 0 ? (
          <p className="text-[13.5px] text-ink-3">{t("summary.leasesEmpty")}</p>
        ) : (
          <SectionList>
            {bundle.leases.map((entry) => (
              <SectionItem
                key={entry.id}
                title={entry.tenantLabel}
                detail={`${money(entry.monthlyRent, locale)} · ${percent(
                  entry.indexationRatePpm,
                  locale,
                )} · ${entry.startDate} → ${entry.endDate ?? "-"}`}
                actions={
                  <>
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
                  </>
                }
              />
            ))}
          </SectionList>
        )}
      </Section>

      <Section
        title={t("summary.lines")}
        action={
          <FlowLineForm
            propertyId={id}
            locale={locale}
            today={now}
            label={t("summary.addLine")}
          />
        }
      >
        {bundle.lines.length === 0 ? (
          <p className="text-[13.5px] text-ink-3">{t("summary.linesEmpty")}</p>
        ) : (
          <SectionList>
            {bundle.lines.map((line) => (
              <SectionItem
                key={line.id}
                title={
                  <span className="flex flex-col gap-0.5">
                    {line.label}
                    <span className="text-[11.5px] font-normal text-ink-3">
                      {t(`fields.flow${line.kind === "expense" ? "Expense" : "Income"}`)} ·{" "}
                      {t(`fields.nature${NATURE_KEY[natureOf(line)]}`)}
                      {line.recurrence !== "one_off"
                        ? ` · ${t(`fields.recurrence${PERIODICITY_KEY[line.recurrence]}`)}`
                        : ""}
                      {line.capitalize && line.amortizationYears
                        ? ` · ${line.amortizationYears} ${t("fields.years")}`
                        : ""}
                    </span>
                  </span>
                }
                detail={
                  <span className={line.kind === "expense" ? "text-negative" : "text-positive"}>
                    {line.amountMode === "percent_of_rent"
                      ? percent(line.amount, locale)
                      : money(line.amount, locale)}
                  </span>
                }
                actions={
                  <>
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
                  </>
                }
              />
            ))}
          </SectionList>
        )}
      </Section>

      <Section title={t("summary.timelineAll")} hint={t("summary.timelineAllHint")}>
        <Timeline
          projection={projection}
          locale={locale}
          referenceMonth={indicators.referenceMonth}
        />
      </Section>
    </AppShell>
  );
}
