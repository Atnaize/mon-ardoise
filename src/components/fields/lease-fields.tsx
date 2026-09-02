"use client";

import { useTranslations } from "next-intl";

import { Field, Input, Select } from "@/components/ui/field";
import { moneyField, percentField, textField } from "@/lib/to-form";

import { errorFor, prefixed, type FieldErrors } from "./prefix";

export interface LeaseDefaults {
  tenantLabel?: string | null;
  kind?: string;
  startDate?: string | null;
  endDate?: string | null;
  monthlyRent?: number | null;
  indexationRatePpm?: number;
  status?: string;
}

export function LeaseFields({
  prefix,
  errors,
  defaults = {},
  today,
}: {
  prefix?: string;
  errors: FieldErrors;
  defaults?: LeaseDefaults;
  today: string;
}) {
  const t = useTranslations();
  const name = (field: string) => prefixed(prefix, field);
  const error = (field: string) => errorFor(errors, prefix, field);

  return (
    <>
      <Field label={t("fields.tenantLabel")} name={name("tenantLabel")} error={error("tenantLabel")}>
        <Input
          name={name("tenantLabel")}
          placeholder={t("fields.tenantLabelPlaceholder")}
          defaultValue={textField(defaults.tenantLabel)}
          required
        />
      </Field>

      <Field label={t("fields.leaseKind")} name={name("kind")}>
        <Select name={name("kind")} defaultValue={defaults.kind ?? "one_year"}>
          <option value="one_year">{t("fields.leaseOneYear")}</option>
          <option value="three_six_nine">{t("fields.leaseThreeSixNine")}</option>
        </Select>
      </Field>

      <Field label={`${t("fields.monthlyRent")} · €`} name={name("monthlyRent")} error={error("monthlyRent")}>
        <Input
          name={name("monthlyRent")}
          inputMode="decimal"
          placeholder="1200"
          defaultValue={moneyField(defaults.monthlyRent)}
          required
        />
      </Field>

      <Field label={`${t("fields.indexationRate")} · %`} name={name("indexationRate")}>
        <Input
          name={name("indexationRate")}
          inputMode="decimal"
          defaultValue={percentField(defaults.indexationRatePpm ?? 20_000)}
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

      <Field label={t("fields.leaseStatus")} name={name("status")}>
        <Select name={name("status")} defaultValue={defaults.status ?? "planned"}>
          <option value="planned">{t("fields.leaseStatusPlanned")}</option>
          <option value="active">{t("fields.leaseStatusActive")}</option>
          <option value="ended">{t("fields.leaseStatusEnded")}</option>
        </Select>
      </Field>
    </>
  );
}
