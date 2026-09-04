import { getTranslations } from "next-intl/server";
import { notFound, redirect } from "next/navigation";

import { AppShell } from "@/components/app-shell";
import { PropertyHeader } from "@/components/property-header";
import { DeleteForm } from "@/components/forms/delete-form";
import { MembersSection } from "@/components/members-section";
import { PropertyEditForm } from "@/components/property-edit-form";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { currentUser } from "@/lib/session";
import { deletePropertyAction } from "@/server/actions";
import { roleOf } from "@/server/projection-input";
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

  const role = roleOf(bundle);

  // Un lecteur n'a rien à faire ici : tout ce que la page propose lui serait
  // refusé à l'envoi. L'onglet le lui dit déjà ; l'URL directe aussi.
  if (role !== "owner" && role !== "editor") {
    redirect(`/${locale}/properties/${id}`);
  }

  return (
    <AppShell>
      <PropertyHeader
        name={bundle.property.name}
        propertyId={id}
        hasLease={bundle.leases.length > 0}
        role={role}
      />

      <PropertyEditForm propertyId={id} locale={locale} defaults={bundle.property} />

      {/* Les membres et la suppression sont des décisions sur le bien lui-même,
          pas sur son contenu : elles restent au propriétaire. */}
      {role === "owner" ? (
        <>
          <MembersSection propertyId={id} locale={locale} viewerId={user.id} />

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
        </>
      ) : null}
    </AppShell>
  );
}
