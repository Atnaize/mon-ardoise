import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";

import { AppShell, PageTitle } from "@/components/app-shell";
import { PropertyForm } from "@/components/property-form";
import { currentUser } from "@/lib/session";

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export default async function NewPropertyPage({ params }: PageProps<"/[locale]/properties/new">) {
  const { locale } = await params;
  const t = await getTranslations("property");
  const user = await currentUser();

  if (!user) {
    redirect(`/${locale}/login`);
  }

  return (
    <AppShell>
      <PageTitle title={t("newTitle")} intro={t("newIntro")} />
      <PropertyForm locale={locale} today={today()} />
    </AppShell>
  );
}
