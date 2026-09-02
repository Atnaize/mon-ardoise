import { getTranslations } from "next-intl/server";

import { AppShell, PageTitle } from "@/components/app-shell";
import { SignInButton } from "@/components/sign-in-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { Link } from "@/i18n/navigation";
import { money } from "@/lib/format";
import { currentUser } from "@/lib/session";
import { listProperties } from "@/server/properties";

const STATUS_TONE = {
  preparing: "warning",
  rented: "positive",
  occupied: "neutral",
} as const;

export default async function HomePage({ params }: PageProps<"/[locale]">) {
  const { locale } = await params;
  const t = await getTranslations();
  const user = await currentUser();

  if (!user) {
    return (
      <AppShell>
        <section className="flex flex-col gap-5 pt-6">
          <h1 className="font-display text-3xl font-extrabold leading-tight tracking-tight text-balance sm:text-5xl">
            {t("home.guestTitle")}
          </h1>
          <p className="max-w-prose leading-relaxed text-ink-2">{t("home.guestBody")}</p>
          <div className="pt-2">
            <SignInButton />
          </div>
        </section>
      </AppShell>
    );
  }

  const properties = await listProperties(user.id);

  return (
    <AppShell>
      <PageTitle
        title={t("property.list")}
        action={
          <Link href="/properties/new">
            <Button>{t("property.add")}</Button>
          </Link>
        }
      />

      {properties.length === 0 ? (
        <Card>
          <CardBody className="flex flex-col items-start gap-3">
            <h2 className="font-display text-base font-bold">{t("home.emptyTitle")}</h2>
            <p className="max-w-prose text-sm text-ink-2">{t("home.emptyBody")}</p>
            <Link href="/properties/new">
              <Button>{t("property.add")}</Button>
            </Link>
          </CardBody>
        </Card>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {properties.map(({ bundle, indicators }) => (
            <li key={bundle.property.id}>
              <Link
                href={`/properties/${bundle.property.id}`}
                className="block rounded-ui border border-line-soft bg-surface p-4 transition-colors hover:border-accent"
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="font-display text-base font-bold tracking-tight text-ink">
                    {bundle.property.name}
                  </span>
                  <Badge tone={STATUS_TONE[bundle.property.status]}>
                    {t(`property.status.${bundle.property.status}`)}
                  </Badge>
                </div>
                <dl className="mt-3 flex flex-col gap-1">
                  <div className="flex items-baseline justify-between gap-3">
                    <dt className="text-xs text-ink-3">{t("summary.effort")}</dt>
                    <dd
                      className={`font-display text-lg font-bold tabular-nums ${
                        indicators.monthlyEffort > 0 ? "text-negative" : "text-positive"
                      }`}
                    >
                      {money(indicators.monthlyEffort, locale)}
                    </dd>
                  </div>
                  <div className="flex items-baseline justify-between gap-3">
                    <dt className="text-xs text-ink-3">{t("summary.outstanding")}</dt>
                    <dd className="text-sm tabular-nums text-ink-2">
                      {money(indicators.finalOutstandingBalance, locale)}
                    </dd>
                  </div>
                </dl>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </AppShell>
  );
}
