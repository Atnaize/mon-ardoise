"use client";

import { FlowLineFields, type FlowLineDefaults } from "@/components/fields/flow-line-fields";
import { InlineForm } from "@/components/inline-form";
import { saveFlowLineAction } from "@/server/actions";

export function FlowLineForm({
  propertyId,
  lineId = null,
  defaults,
  locale,
  today,
  label,
}: {
  propertyId: string;
  lineId?: string | null;
  defaults?: FlowLineDefaults;
  locale: string;
  today: string;
  label: string;
}) {
  return (
    <InlineForm
      variant={lineId ? "ghost" : "secondary"}
      label={label}
      locale={locale}
      action={saveFlowLineAction.bind(null, propertyId, lineId)}
    >
      {(errors) => <FlowLineFields errors={errors} defaults={defaults} today={today} />}
    </InlineForm>
  );
}
