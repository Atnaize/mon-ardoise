import { getTranslations } from "next-intl/server";
import { notFound, redirect } from "next/navigation";

import { AppShell } from "@/components/app-shell";
import { PropertyHeader } from "@/components/property-header";
import { RentLedgerView } from "@/components/rent-ledger-view";
import { Card, CardBody } from "@/components/ui/card";
import { Stat, StatGrid } from "@/components/ui/stat";
import { currentMonth, todayIso } from "@/lib/clock";
import { money, monthLabel } from "@/lib/format";
import { currentUser } from "@/lib/session";
import { roleOf } from "@/server/projection-input";
import { loadRentLedger } from "@/server/properties";

export default async function RentPage({ params }: PageProps<"/[locale]/properties/[id]/rent">) {
  const { locale, id } = await params;
  const t = await getTranslations();
  const user = await currentUser();

  if (!user) {
    redirect(`/${locale}/login`);
  }

  const loaded = await loadRentLedger(user.id, id);

  if (!loaded) {
    notFound();
  }

  const { bundle, ledger } = loaded;
  const role = roleOf(bundle);
  const activeLease = bundle.leases.find((entry) => entry.status !== "ended") ?? bundle.leases[0];

  // Sans bail, quatre montants à zéro et un « à jour » vert affirmeraient qu'un loyer
  // est encaissé. La page n'a qu'une chose à dire : il manque un bail.
  if (bundle.leases.length === 0) {
    return (
      <AppShell>
        <PropertyHeader
          name={bundle.property.name}
          propertyId={id}
          hasLease={false}
          role={role}
        />
        <p className="text-[13.5px] leading-normal text-ink-2">{t("rent.noLease")}</p>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <PropertyHeader
        name={bundle.property.name}
        propertyId={id}
        hasLease={bundle.leases.length > 0}
        role={role}
      />

      <p className="text-[13.5px] leading-normal text-ink-2">{t("rent.intro")}</p>

      <StatGrid>
        <Stat
          emphasis
          label={t("rent.outstanding")}
          hint={t("rent.outstandingHint", { month: monthLabel(currentMonth(), locale) })}
          value={money(ledger.outstanding, locale)}
          tone={ledger.outstanding > 0 ? "negative" : "positive"}
        />
        <Stat
          label={t("rent.expectedDue")}
          hint={t("rent.expectedDueHint")}
          value={money(ledger.expectedDue, locale)}
        />
        <Stat
          label={t("rent.receivedDue")}
          value={money(ledger.receivedDue, locale)}
          tone={ledger.receivedDue < ledger.expectedDue ? "negative" : "positive"}
        />
        {ledger.advance > 0 ? (
          <Stat
            label={t("rent.advance")}
            hint={t("rent.advanceHint", { total: money(ledger.receivedTotal, locale) })}
            value={money(ledger.advance, locale)}
            tone="positive"
          />
        ) : null}
      </StatGrid>

      <p
        className={`rounded-ui border-l-2 px-4 py-3 text-sm ${
          ledger.overdueMonths.length > 0
            ? "border-negative bg-surface text-negative"
            : "border-positive bg-surface text-ink-2"
        }`}
      >
        {t("rent.overdue", { count: ledger.overdueMonths.length })}
      </p>

      {ledger.rows.length === 0 ? (
        <Card>
          <CardBody>
            <p className="text-sm text-ink-3">{t("rent.nothingDue")}</p>
          </CardBody>
        </Card>
      ) : (
        <RentLedgerView
          ledger={ledger}
          propertyId={id}
          leaseId={activeLease?.id ?? null}
          locale={locale}
          today={todayIso()}
          canEdit={role !== "viewer"}
        />
      )}
    </AppShell>
  );
}
