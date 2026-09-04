import { hasLocale } from "next-intl";
import { getTranslations } from "next-intl/server";

import { AppShell, PageTitle } from "@/components/app-shell";
import { Landing } from "@/components/landing";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { Link, redirect } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { money } from "@/lib/format";
import { currentUser } from "@/lib/session";
import { listProperties } from "@/server/properties";

export default async function HomePage({ params }: PageProps<"/[locale]">) {
  const { locale } = await params;
  const t = await getTranslations();
  const user = await currentUser();

  // La langue du compte décide de la langue d'entrée : sans ça, elle n'est qu'une
  // colonne en base. Seule cette page redirige : un lien profond partagé reste dans
  // la langue de son URL.
  if (user && hasLocale(routing.locales, user.locale) && user.locale !== locale) {
    redirect({ href: "/", locale: user.locale });
  }

  if (!user) {
    return (
      <AppShell width="wide">
        <Landing locale={locale} />
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
            <h2 className="font-display text-base font-semibold">{t("home.emptyTitle")}</h2>
            <p className="max-w-prose text-sm text-ink-2">{t("home.emptyBody")}</p>
            <Link href="/properties/new">
              <Button>{t("property.add")}</Button>
            </Link>
          </CardBody>
        </Card>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {properties.map(({ bundle, indicators, outstandingRent, overdueCount }) => (
            <li key={bundle.property.id}>
              <Link
                href={`/properties/${bundle.property.id}`}
                className="block rounded-ui border border-line-soft bg-surface p-4 transition-colors hover:border-accent"
              >
                <span className="font-display text-base font-semibold tracking-tight text-ink">
                  {bundle.property.name}
                </span>
                <dl className="mt-3 flex flex-col gap-1">
                  <div className="flex items-baseline justify-between gap-3">
                    <dt className="text-xs text-ink-3">{t("summary.effort")}</dt>
                    <dd
                      className={`font-display text-lg font-semibold tabular-nums ${
                        indicators.monthlyEffort > 0 ? "text-negative" : "text-positive"
                      }`}
                    >
                      {money(indicators.monthlyEffort, locale)}
                    </dd>
                  </div>
                  {/* Sans bail, « à jour » se lit comme un loyer encaissé. Rien n'est
                      attendu : il n'y a ni bonne ni mauvaise nouvelle à annoncer. */}
                  <div className="flex items-baseline justify-between gap-3">
                    <dt className="text-xs text-ink-3">{t("rent.outstanding")}</dt>
                    <dd
                      className={`text-sm tabular-nums ${
                        bundle.leases.length === 0
                          ? "text-ink-3"
                          : outstandingRent > 0
                            ? "font-medium text-negative"
                            : "text-positive"
                      }`}
                    >
                      {bundle.leases.length === 0
                        ? t("rent.none")
                        : outstandingRent > 0
                          ? `${money(outstandingRent, locale)} · ${t("rent.overdue", { count: overdueCount })}`
                          : t("rent.clear")}
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
