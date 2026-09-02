"use client";

import { useTranslations } from "next-intl";

import { InlineForm } from "@/components/inline-form";
import { Field, Input } from "@/components/ui/field";
import { saveRentPaymentAction } from "@/server/actions";

export function RentPaymentForm({
  propertyId,
  entryId = null,
  dueMonth,
  leaseId,
  suggestedAmount,
  today,
  locale,
  label,
}: {
  propertyId: string;
  entryId?: string | null;
  dueMonth: number;
  leaseId: string | null;
  suggestedAmount: string;
  today: string;
  locale: string;
  label: string;
}) {
  const t = useTranslations("rent");

  return (
    <InlineForm
      label={label}
      locale={locale}
      action={saveRentPaymentAction.bind(null, propertyId, entryId)}
    >
      {(errors) => (
        <>
          <input type="hidden" name="dueMonth" value={dueMonth} />
          <input type="hidden" name="leaseId" value={leaseId ?? ""} />

          <Field label={`${t("paymentAmount")} · €`} name="amount" error={errors?.amount}>
            <Input
              name="amount"
              inputMode="decimal"
              defaultValue={suggestedAmount}
              autoFocus
              required
            />
          </Field>

          <Field label={t("paymentDate")} name="date" error={errors?.date}>
            <Input type="date" name="date" defaultValue={today} required />
          </Field>
        </>
      )}
    </InlineForm>
  );
}
