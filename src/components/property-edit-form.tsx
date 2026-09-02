"use client";

import { useTranslations } from "next-intl";
import { useActionState } from "react";

import { PropertyFields, type PropertyDefaults } from "@/components/fields/property-fields";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { updatePropertyAction } from "@/server/actions";
import type { ActionState } from "@/server/form";

export function PropertyEditForm({
  propertyId,
  locale,
  defaults,
}: {
  propertyId: string;
  locale: string;
  defaults: PropertyDefaults;
}) {
  const t = useTranslations();
  const [state, action, pending] = useActionState<ActionState, FormData>(
    updatePropertyAction.bind(null, propertyId),
    {},
  );

  return (
    <form action={action} className="flex flex-col gap-5">
      <input type="hidden" name="locale" value={locale} />

      <Card>
        <CardHeader title={t("property.sectionProperty")} />
        <CardBody className="grid gap-4 sm:grid-cols-2">
          <PropertyFields errors={state.errors} defaults={defaults} />
        </CardBody>
      </Card>

      <div>
        <Button type="submit" disabled={pending}>
          {t("common.save")}
        </Button>
      </div>
    </form>
  );
}
