"use client";

import { useTranslations } from "next-intl";

import { Field, Input, Select } from "@/components/ui/field";
import { moneyField, percentField, textField } from "@/lib/to-form";

import { errorFor, prefixed, type FieldErrors } from "./prefix";

export interface LoanDefaults {
  label?: string | null;
  principal?: number | null;
  startDate?: string | null;
  termMonths?: number;
  annualRatePpm?: number;
  rateBasis?: string;
  amortization?: string;
  deferralMonths?: number;
  deferralType?: string;
}

export function LoanFields({
  prefix,
  errors,
  defaults = {},
  today,
}: {
  prefix?: string;
  errors: FieldErrors;
  defaults?: LoanDefaults;
  today: string;
}) {
  const t = useTranslations();
  const name = (field: string) => prefixed(prefix, field);
  const error = (field: string) => errorFor(errors, prefix, field);

  return (
    <>
      <div className="sm:col-span-2">
        <Field label={t("fields.loanLabel")} name={name("label")} error={error("label")}>
          <Input
            name={name("label")}
            placeholder={t("fields.loanLabelPlaceholder")}
            defaultValue={textField(defaults.label)}
            required
          />
        </Field>
      </div>

      <Field label={`${t("fields.principal")} · €`} name={name("principal")} error={error("principal")}>
        <Input
          name={name("principal")}
          inputMode="decimal"
          placeholder="150000"
          defaultValue={moneyField(defaults.principal)}
          required
        />
      </Field>

      <Field label={t("fields.startDate")} name={name("startDate")} error={error("startDate")}>
        <Input
          type="date"
          name={name("startDate")}
          defaultValue={defaults.startDate ?? today}
          required
        />
      </Field>

      <Field label={`${t("fields.termMonths")} · ${t("fields.months")}`} name={name("termMonths")}>
        <Input
          name={name("termMonths")}
          type="number"
          min={1}
          max={600}
          defaultValue={defaults.termMonths ?? 240}
        />
      </Field>

      <Field label={`${t("fields.annualRate")} · %`} name={name("annualRate")} error={error("annualRate")}>
        <Input
          name={name("annualRate")}
          inputMode="decimal"
          placeholder="3,06"
          defaultValue={percentField(defaults.annualRatePpm)}
          required
        />
      </Field>
    </>
  );
}

export function LoanAdvancedFields({
  prefix,
  errors,
  defaults = {},
}: {
  prefix?: string;
  errors: FieldErrors;
  defaults?: LoanDefaults;
}) {
  const t = useTranslations();
  const name = (field: string) => prefixed(prefix, field);
  const error = (field: string) => errorFor(errors, prefix, field);

  return (
    <details className="rounded-ui border border-line-soft px-3 py-2.5 sm:col-span-2">
      <summary className="cursor-pointer text-xs font-medium text-ink-2">
        {t("fields.loanConventions")}
      </summary>

      <p className="mt-1.5 text-xs text-ink-3">{t("fields.loanConventionsHint")}</p>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Field
            label={t("fields.rateBasis")}
            name={name("rateBasis")}
            hint={t("fields.rateBasisHint")}
            error={error("rateBasis")}
          >
            <Select name={name("rateBasis")} defaultValue={defaults.rateBasis ?? "nominal_12"}>
              <option value="nominal_12">{t("fields.rateBasisNominal")}</option>
              <option value="equivalent">{t("fields.rateBasisEquivalent")}</option>
            </Select>
          </Field>
        </div>

        <div className="sm:col-span-2">
          <Field
            label={t("fields.amortization")}
            name={name("amortization")}
            error={error("amortization")}
          >
            <Select name={name("amortization")} defaultValue={defaults.amortization ?? "annuity"}>
              <option value="annuity">{t("fields.amortizationAnnuity")}</option>
              <option value="constant_principal">{t("fields.amortizationConstant")}</option>
            </Select>
          </Field>
        </div>

        <Field
          label={t("fields.deferralType")}
          name={name("deferralType")}
          error={error("deferralType")}
        >
          <Select name={name("deferralType")} defaultValue={defaults.deferralType ?? "none"}>
            <option value="none">{t("fields.deferralNone")}</option>
            <option value="interest_only">{t("fields.deferralInterest")}</option>
            <option value="full">{t("fields.deferralFull")}</option>
          </Select>
        </Field>

        <Field
          label={`${t("fields.deferralMonths")} · ${t("fields.months")}`}
          name={name("deferralMonths")}
          error={error("deferralMonths")}
        >
          <Input
            name={name("deferralMonths")}
            type="number"
            min={0}
            max={120}
            defaultValue={defaults.deferralMonths ?? 0}
          />
        </Field>
      </div>
    </details>
  );
}
