"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";

import { Checkbox, Field, Input, Select } from "@/components/ui/field";
import { moneyField, percentField, textField } from "@/lib/to-form";

import { errorFor, prefixed, type FieldErrors } from "./prefix";

export interface FlowLineDefaults {
  kind?: string;
  label?: string | null;
  amount?: number | null;
  amountMode?: string;
  recurrence?: string;
  recurrenceInterval?: number;
  startDate?: string | null;
  endDate?: string | null;
  indexationRatePpm?: number;
  capitalize?: boolean;
  isAcquisitionCost?: boolean;
  amortizationYears?: number | null;
}

export function FlowLineFields({
  prefix,
  errors,
  defaults = {},
  today,
}: {
  prefix?: string;
  errors: FieldErrors;
  defaults?: FlowLineDefaults;
  today: string;
}) {
  const t = useTranslations();
  const name = (field: string) => prefixed(prefix, field);
  const error = (field: string) => errorFor(errors, prefix, field);

  const [capitalize, setCapitalize] = useState(defaults.capitalize ?? false);
  const [acquisition, setAcquisition] = useState(defaults.isAcquisitionCost ?? false);
  const [recurrence, setRecurrence] = useState(defaults.recurrence ?? "yearly");
  const [amountMode, setAmountMode] = useState(defaults.amountMode ?? "fixed");

  return (
    <>
      <Field label={t("fields.flowKind")} name={name("kind")}>
        <Select name={name("kind")} defaultValue={defaults.kind ?? "expense"}>
          <option value="expense">{t("fields.flowExpense")}</option>
          <option value="income">{t("fields.flowIncome")}</option>
        </Select>
      </Field>

      <Field label={t("fields.label")} name={name("label")} error={error("label")}>
        <Input
          name={name("label")}
          placeholder="Précompte immobilier"
          defaultValue={textField(defaults.label)}
          required
        />
      </Field>

      <Field label={t("fields.amountMode")} name={name("amountMode")}>
        <Select
          name={name("amountMode")}
          value={amountMode}
          onChange={(event) => setAmountMode(event.target.value)}
        >
          <option value="fixed">{t("fields.amountFixed")}</option>
          <option value="percent_of_rent">{t("fields.amountPercentOfRent")}</option>
        </Select>
      </Field>

      <Field
        label={`${t("fields.amount")} · ${amountMode === "percent_of_rent" ? "%" : "€"}`}
        name={name("amount")}
        error={error("amount")}
      >
        <Input
          name={name("amount")}
          inputMode="decimal"
          placeholder={amountMode === "percent_of_rent" ? "8" : "900"}
          defaultValue={
            amountMode === "percent_of_rent"
              ? percentField(defaults.amount ?? undefined)
              : moneyField(defaults.amount)
          }
          required
        />
      </Field>

      <Field label={t("fields.recurrence")} name={name("recurrence")}>
        <Select
          name={name("recurrence")}
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

      <Field label={t("fields.recurrenceInterval")} name={name("recurrenceInterval")}>
        <Input
          name={name("recurrenceInterval")}
          type="number"
          min={1}
          max={50}
          defaultValue={defaults.recurrenceInterval ?? 1}
        />
      </Field>

      <Field label={`${t("fields.indexationRate")} · %`} name={name("indexationRate")}>
        <Input
          name={name("indexationRate")}
          inputMode="decimal"
          defaultValue={percentField(defaults.indexationRatePpm ?? 0)}
        />
      </Field>

      <Field label={t("fields.startDate")} name={name("startDate")} error={error("startDate")}>
        <Input type="date" name={name("startDate")} defaultValue={defaults.startDate ?? today} required />
      </Field>

      <Field
        label={`${t("fields.endDate")} · ${t("fields.optional")}`}
        name={name("endDate")}
        hint={t("fields.endDateOptional")}
      >
        <Input type="date" name={name("endDate")} defaultValue={textField(defaults.endDate)} />
      </Field>

      <div className="flex items-center sm:col-span-2">
        <Checkbox
          name={name("capitalize")}
          label={t("fields.capitalize")}
          checked={capitalize}
          onChange={(event) => setCapitalize(event.target.checked)}
        />
      </div>

      {capitalize ? (
        <Field
          label={`${t("fields.amortizationYears")} · ${t("fields.years")}`}
          name={name("amortizationYears")}
        >
          <Input
            name={name("amortizationYears")}
            type="number"
            min={1}
            max={50}
            defaultValue={defaults.amortizationYears ?? 10}
          />
        </Field>
      ) : (
        <input type="hidden" name={name("amortizationYears")} value="" />
      )}

      {recurrence === "one_off" ? (
        <div className="flex flex-col gap-2 sm:col-span-2">
          <Checkbox
            name={name("isAcquisitionCost")}
            label={t("fields.isAcquisitionCost")}
            checked={acquisition}
            onChange={(event) => setAcquisition(event.target.checked)}
          />
          <p className="text-xs text-ink-3">
            {acquisition ? t("fields.isAcquisitionCostHint") : t("fields.oneOffNote")}
          </p>
        </div>
      ) : null}
    </>
  );
}
