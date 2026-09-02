"use client";

import { useTranslations } from "next-intl";
import { useActionState, useState } from "react";

import { LeaseFields } from "@/components/fields/lease-fields";
import { LoanFields } from "@/components/fields/loan-fields";
import { PropertyFields } from "@/components/fields/property-fields";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/field";
import { createPropertyAction } from "@/server/actions";
import type { ActionState } from "@/server/form";

export function PropertyForm({ locale, today }: { locale: string; today: string }) {
  const t = useTranslations();
  const [state, action, pending] = useActionState<ActionState, FormData>(createPropertyAction, {});
  const [withLoan, setWithLoan] = useState(false);
  const [withLease, setWithLease] = useState(false);

  return (
    <form action={action} className="flex flex-col gap-5">
      <input type="hidden" name="locale" value={locale} />

      <Card>
        <CardHeader title={t("property.sectionProperty")} />
        <CardBody className="grid gap-4 sm:grid-cols-2">
          <PropertyFields prefix="property" errors={state.errors} />
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title={t("property.sectionLoan")}
          action={
            <Checkbox
              name="includeLoan"
              label={t("property.includeLoan")}
              checked={withLoan}
              onChange={(event) => setWithLoan(event.target.checked)}
            />
          }
        />
        {withLoan ? (
          <CardBody className="grid gap-4 sm:grid-cols-2">
            <LoanFields prefix="loan" errors={state.errors} today={today} />
          </CardBody>
        ) : null}
      </Card>

      <Card>
        <CardHeader
          title={t("property.sectionLease")}
          action={
            <Checkbox
              name="includeLease"
              label={t("property.includeLease")}
              checked={withLease}
              onChange={(event) => setWithLease(event.target.checked)}
            />
          }
        />
        {withLease ? (
          <CardBody className="grid gap-4 sm:grid-cols-2">
            <LeaseFields prefix="lease" errors={state.errors} today={today} />
          </CardBody>
        ) : null}
      </Card>

      <div>
        <Button type="submit" disabled={pending}>
          {t("property.submit")}
        </Button>
      </div>
    </form>
  );
}
