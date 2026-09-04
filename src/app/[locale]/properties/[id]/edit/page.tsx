import { getTranslations } from "next-intl/server";
import { notFound, redirect } from "next/navigation";

import { AppShell } from "@/components/app-shell";
import { PropertyHeader } from "@/components/property-header";
import { DeleteForm } from "@/components/forms/delete-form";
import { PropertyEditForm } from "@/components/property-edit-form";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { currentUser } from "@/lib/session";
import { deletePropertyAction } from "@/server/actions";
import { loadPropertyBundle } from "@/server/properties";

export default async function EditPropertyPage({
  params,
}: PageProps<"/[locale]/properties/[id]/edit">) {
  const { locale, id } = await params;
  const t = await getTranslations();
  const user = await currentUser();

  if (!user) {
    redirect(`/${locale}/login`);
  }

  const bundle = await loadPropertyBundle(user.id, id);

  if (!bundle) {
    notFound();
  }

  return (
    <AppShell>
      <PropertyHeader
        name={bundle.property.name}
        propertyId={id}
        hasLease={bundle.leases.length > 0}
      />

      <PropertyEditForm propertyId={id} locale={locale} defaults={bundle.property} />

      <Card className="border-negative">
        <CardHeader title={t("property.dangerZone")} hint={t("property.dangerHint")} />
        <CardBody>
          <DeleteForm
            action={deletePropertyAction.bind(null, id)}
            locale={locale}
            label={t("property.delete")}
          />
        </CardBody>
      </Card>
    </AppShell>
  );
}
