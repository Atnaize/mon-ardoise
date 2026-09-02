"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";

import { Checkbox, Field, Input, Select } from "@/components/ui/field";
import { natureOf } from "@/lib/nature";
import type { Nature } from "@/lib/schemas";
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
  amortizationYears?: number | null;
  isAcquisitionCost?: boolean;
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

  const [nature, setNature] = useState<Nature>(
    defaults.recurrence
      ? natureOf({
          recurrence: defaults.recurrence,
          isAcquisitionCost: defaults.isAcquisitionCost ?? false,
        })
      : "recurring",
  );
  const [periodicity, setPeriodicity] = useState(
    defaults.recurrence && defaults.recurrence !== "one_off" ? defaults.recurrence : "yearly",
  );
  const [capitalize, setCapitalize] = useState(defaults.capitalize ?? false);
  const [amountMode, setAmountMode] = useState(defaults.amountMode ?? "fixed");

  const recurring = nature === "recurring";

  return (
    <>
      <div className="flex flex-col gap-2 sm:col-span-2">
        <Field label={t("fields.nature")} name={name("nature")}>
          <Select
            name={name("nature")}
            value={nature}
            onChange={(event) => setNature(event.target.value as Nature)}
          >
            <option value="upfront">{t("fields.natureUpfront")}</option>
            <option value="one_off">{t("fields.natureOneOff")}</option>
            <option value="recurring">{t("fields.natureRecurring")}</option>
          </Select>
        </Field>
        <p className="rounded-ui bg-surface-2 px-3 py-2 text-xs leading-relaxed text-ink-2">
          {t(`fields.nature${nature === "upfront" ? "Upfront" : nature === "one_off" ? "OneOff" : "Recurring"}Hint`)}
        </p>
      </div>

      <Field label={t("fields.flowKind")} name={name("kind")}>
        <Select name={name("kind")} defaultValue={defaults.kind ?? "expense"}>
          <option value="expense">{t("fields.flowExpense")}</option>
          <option value="income">{t("fields.flowIncome")}</option>
        </Select>
      </Field>

      <Field label={t("fields.label")} name={name("label")} error={error("label")}>
        <Input
          name={name("label")}
          placeholder={t("fields.labelPlaceholder")}
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

      {recurring ? (
        <>
          <Field label={t("fields.periodicity")} name={name("periodicity")}>
            <Select
              name={name("periodicity")}
              value={periodicity}
              onChange={(event) => setPeriodicity(event.target.value)}
            >
              <option value="monthly">{t("fields.recurrenceMonthly")}</option>
              <option value="quarterly">{t("fields.recurrenceQuarterly")}</option>
              <option value="yearly">{t("fields.recurrenceYearly")}</option>
              <option value="every_n_years">{t("fields.recurrenceEveryNYears")}</option>
            </Select>
          </Field>

          {periodicity === "every_n_years" ? (
            <Field label={t("fields.recurrenceInterval")} name={name("recurrenceInterval")}>
              <Input
                name={name("recurrenceInterval")}
                type="number"
                min={1}
                max={50}
                defaultValue={defaults.recurrenceInterval ?? 10}
              />
            </Field>
          ) : (
            <input type="hidden" name={name("recurrenceInterval")} value="1" />
          )}

          <Field label={`${t("fields.indexationRate")} · %`} name={name("indexationRate")}>
            <Input
              name={name("indexationRate")}
              inputMode="decimal"
              defaultValue={percentField(defaults.indexationRatePpm ?? 0)}
            />
          </Field>
        </>
      ) : (
        <>
          <input type="hidden" name={name("recurrenceInterval")} value="1" />
          <input type="hidden" name={name("indexationRate")} value="0" />
        </>
      )}

      <Field label={t("fields.startDate")} name={name("startDate")} error={error("startDate")}>
        <Input type="date" name={name("startDate")} defaultValue={defaults.startDate ?? today} required />
      </Field>

      <Field
        label={`${t("fields.endDate")} · ${t("fields.optional")}`}
        name={name("endDate")}
        hint={recurring ? t("fields.endDateOptional") : t("fields.endDateIgnored")}
      >
        <Input type="date" name={name("endDate")} defaultValue={textField(defaults.endDate)} />
      </Field>

      {recurring ? (
        <input type="hidden" name={name("amortizationYears")} value="" />
      ) : (
        <>
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
        </>
      )}
    </>
  );
}
