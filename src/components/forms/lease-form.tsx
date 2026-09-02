"use client";

import { LeaseFields, type LeaseDefaults } from "@/components/fields/lease-fields";
import { InlineForm } from "@/components/inline-form";
import { saveLeaseAction } from "@/server/actions";

export function LeaseForm({
  propertyId,
  leaseId = null,
  defaults,
  locale,
  today,
  label,
}: {
  propertyId: string;
  leaseId?: string | null;
  defaults?: LeaseDefaults;
  locale: string;
  today: string;
  label: string;
}) {
  return (
    <InlineForm
      label={label}
      locale={locale}
      action={saveLeaseAction.bind(null, propertyId, leaseId)}
    >
      {(errors) => <LeaseFields errors={errors} defaults={defaults} today={today} />}
    </InlineForm>
  );
}
