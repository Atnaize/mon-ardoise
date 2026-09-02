"use client";

import { useTranslations } from "next-intl";
import { useActionState, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Checkbox, Field, Input, Select } from "@/components/ui/field";
import { addFlowLineAction } from "@/server/actions";
import type { ActionState } from "@/server/form";

export function FlowLineForm({
  propertyId,
  locale,
  today,
}: {
  propertyId: string;
  locale: string;
  today: string;
}) {
  const t = useTranslations();
  const [open, setOpen] = useState(false);
  const [capitalize, setCapitalize] = useState(false);
  const [recurrence, setRecurrence] = useState("yearly");

  const boundAction = addFlowLineAction.bind(null, propertyId);
  const [state, action, pending] = useActionState<ActionState, FormData>(boundAction, {});
  const handled = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (state.succeededAt && state.succeededAt !== handled.current) {
      handled.current = state.succeededAt;
      setOpen(false);
      setCapitalize(false);
    }
  }, [state.succeededAt]);

  if (!open) {
    return (
      <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>
        {t("summary.addLine")}
      </Button>
    );
  }

  return (
    <form
      action={action}
      className="grid w-full gap-4 border-t border-line-soft pt-4 sm:grid-cols-2"
    >
      <input type="hidden" name="locale" value={locale} />

      <Field label={t("fields.flowKind")} name="kind">
        <Select name="kind" defaultValue="expense">
          <option value="expense">{t("fields.flowExpense")}</option>
          <option value="income">{t("fields.flowIncome")}</option>
        </Select>
      </Field>

      <Field label={t("fields.category")} name="category" error={state.errors?.category}>
        <Input name="category" placeholder="precompte_immobilier" required />
      </Field>

      <Field label={t("fields.label")} name="label" error={state.errors?.label}>
        <Input name="label" placeholder="Précompte immobilier" required />
      </Field>

      <Field label={`${t("fields.amount")} · €`} name="amount" error={state.errors?.amount}>
        <Input name="amount" inputMode="decimal" placeholder="900" required />
      </Field>

      <Field label={t("fields.amountMode")} name="amountMode">
        <Select name="amountMode" defaultValue="fixed">
          <option value="fixed">{t("fields.amountFixed")}</option>
          <option value="percent_of_rent">{t("fields.amountPercentOfRent")}</option>
        </Select>
      </Field>

      <Field label={t("fields.recurrence")} name="recurrence">
        <Select
          name="recurrence"
          value={recurrence}
          onChange={(event) => setRecurrence(event.target.value)}
        >
          <option value="one_off">{t("fields.recurrenceOneOff")}</option>
          <option value="monthly">{t("fields.recurrenceMonthly")}</option>
          <option value="quarterly">{t("fields.recurrenceQuarterly")}</option>
          <option value="yearly">{t("fields.recurrenceYearly")}</option>
          <option value="every_n_years">{t("fields.recurrenceEveryNYears")}</option>
        </Select>
      </Field>

      <Field label={t("fields.recurrenceInterval")} name="recurrenceInterval">
        <Input
          name="recurrenceInterval"
          type="number"
          min={1}
          max={50}
          defaultValue={recurrence === "every_n_years" ? 10 : 1}
        />
      </Field>

      <Field label={`${t("fields.indexationRate")} · %`} name="indexationRate">
        <Input name="indexationRate" inputMode="decimal" defaultValue="0" />
      </Field>

      <Field label={t("fields.startDate")} name="startDate" error={state.errors?.startDate}>
        <Input type="date" name="startDate" defaultValue={today} required />
      </Field>

      <Field
        label={`${t("fields.endDate")} · ${t("fields.optional")}`}
        name="endDate"
        hint={t("fields.endDateOptional")}
      >
        <Input type="date" name="endDate" />
      </Field>

      <div className="flex items-center sm:col-span-2">
        <Checkbox
          name="capitalize"
          label={t("fields.capitalize")}
          checked={capitalize}
          onChange={(event) => setCapitalize(event.target.checked)}
        />
      </div>

      {capitalize ? (
        <Field
          label={`${t("fields.amortizationYears")} · ${t("fields.years")}`}
          name="amortizationYears"
        >
          <Input name="amortizationYears" type="number" min={1} max={50} defaultValue={10} />
        </Field>
      ) : (
        <input type="hidden" name="amortizationYears" value="" />
      )}

      <div className="flex items-center gap-3 sm:col-span-2">
        <Button type="submit" size="sm" disabled={pending}>
          {t("common.save")}
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
          {t("common.cancel")}
        </Button>
      </div>
    </form>
  );
}
