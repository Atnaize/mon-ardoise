"use client";

import {
  LoanAdvancedFields,
  LoanFields,
  type LoanDefaults,
} from "@/components/fields/loan-fields";
import { InlineForm } from "@/components/inline-form";
import { saveLoanAction } from "@/server/actions";

export function LoanForm({
  propertyId,
  loanId = null,
  defaults,
  locale,
  today,
  label,
}: {
  propertyId: string;
  loanId?: string | null;
  defaults?: LoanDefaults;
  locale: string;
  today: string;
  label: string;
}) {
  return (
    <InlineForm
      label={label}
      locale={locale}
      variant={loanId ? "ghost" : "secondary"}
      action={saveLoanAction.bind(null, propertyId, loanId)}
    >
      {(errors) => (
        <>
          <LoanFields errors={errors} defaults={defaults} today={today} />
          <LoanAdvancedFields errors={errors} defaults={defaults} />
        </>
      )}
    </InlineForm>
  );
}
