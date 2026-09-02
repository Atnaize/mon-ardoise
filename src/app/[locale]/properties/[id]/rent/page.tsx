import { getTranslations } from "next-intl/server";
import { notFound, redirect } from "next/navigation";

import { AppShell, PageTitle } from "@/components/app-shell";
import { RentLedgerView } from "@/components/rent-ledger-view";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { Stat, StatGrid } from "@/components/ui/stat";
import { Link } from "@/i18n/navigation";
import { todayIso } from "@/lib/clock";
import { money } from "@/lib/format";
import { currentUser } from "@/lib/session";
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
  const activeLease = bundle.leases.find((entry) => entry.status !== "ended") ?? bundle.leases[0];

  return (
    <AppShell>
      <PageTitle
        title={t("rent.title")}
        intro={`${bundle.property.name} · ${t("rent.intro")}`}
        action={
          <Link href={`/properties/${id}`}>
            <Button variant="ghost" size="sm">
              {t("common.back")}
            </Button>
          </Link>
        }
      />

      <StatGrid>
        <Stat
          emphasis
          label={t("rent.outstanding")}
          hint={t("rent.outstandingHint")}
          value={money(ledger.outstanding, locale)}
          tone={ledger.outstanding > 0 ? "negative" : "positive"}
        />
        <Stat
          label={t("rent.expectedToDate")}
          value={money(ledger.expectedToDate, locale)}
        />
        <Stat
          label={t("rent.receivedToDate")}
          value={money(ledger.receivedToDate, locale)}
          tone={ledger.receivedToDate < ledger.expectedToDate ? "negative" : "positive"}
        />
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

      {bundle.leases.length === 0 ? (
        <Card>
          <CardBody>
            <p className="text-sm text-ink-3">{t("rent.noLease")}</p>
          </CardBody>
        </Card>
      ) : ledger.rows.length === 0 ? (
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
        />
      )}
    </AppShell>
  );
}
