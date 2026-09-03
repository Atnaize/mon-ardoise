"use client";

import { useTranslations } from "next-intl";

import { Field, Input, Select } from "@/components/ui/field";
import { moneyField, percentField, textField } from "@/lib/to-form";

import { errorFor, prefixed, type FieldErrors } from "./prefix";

export interface PropertyDefaults {
  name?: string | null;
  type?: string;
  region?: string;
  status?: string;
  acquisitionDate?: string | null;
  purchasePrice?: number | null;
  currentValue?: number | null;
  valueGrowthRatePpm?: number;
  horizonYears?: number;
}

export function PropertyFields({
  prefix,
  errors,
  defaults = {},
}: {
  prefix?: string;
  errors: FieldErrors;
  defaults?: PropertyDefaults;
}) {
  const t = useTranslations();
  const name = (field: string) => prefixed(prefix, field);
  const error = (field: string) => errorFor(errors, prefix, field);

  return (
    <>
      <div className="sm:col-span-2">
        <Field label={t("fields.name")} name={name("name")} error={error("name")}>
          <Input
            name={name("name")}
            placeholder={t("fields.namePlaceholder")}
            defaultValue={textField(defaults.name)}
            required
          />
        </Field>
      </div>

      <Field label={t("fields.type")} name={name("type")}>
        <Select name={name("type")} defaultValue={defaults.type ?? "house"}>
          <option value="house">{t("property.type.house")}</option>
          <option value="apartment">{t("property.type.apartment")}</option>
        </Select>
      </Field>

      <Field label={t("fields.region")} name={name("region")}>
        <Select name={name("region")} defaultValue={defaults.region ?? "wallonie"}>
          <option value="wallonie">{t("property.region.wallonie")}</option>
          <option value="bruxelles">{t("property.region.bruxelles")}</option>
          <option value="flandre">{t("property.region.flandre")}</option>
        </Select>
      </Field>

      <Field label={t("fields.status")} name={name("status")}>
        <Select name={name("status")} defaultValue={defaults.status ?? "preparing"}>
          <option value="preparing">{t("property.status.preparing")}</option>
          <option value="rented">{t("property.status.rented")}</option>
          <option value="occupied">{t("property.status.occupied")}</option>
        </Select>
      </Field>

      <Field
        label={`${t("fields.acquisitionDate")} · ${t("fields.optional")}`}
        name={name("acquisitionDate")}
        error={error("acquisitionDate")}
      >
        <Input
          type="date"
          name={name("acquisitionDate")}
          defaultValue={textField(defaults.acquisitionDate)}
        />
      </Field>

      <Field
        label={`${t("fields.purchasePrice")} · €`}
        name={name("purchasePrice")}
        error={error("purchasePrice")}
      >
        <Input
          name={name("purchasePrice")}
          inputMode="decimal"
          placeholder="250000"
          defaultValue={moneyField(defaults.purchasePrice)}
        />
      </Field>

      <Field
        label={`${t("fields.currentValue")} · €`}
        name={name("currentValue")}
        hint={t("fields.currentValueHint")}
        error={error("currentValue")}
      >
        <Input
          name={name("currentValue")}
          inputMode="decimal"
          placeholder="320000"
          defaultValue={moneyField(defaults.currentValue)}
        />
      </Field>

      <Field
        label={`${t("fields.valueGrowthRate")} · %`}
        name={name("valueGrowthRate")}
        hint={t("fields.valueGrowthRateHint")}
      >
        <Input
          name={name("valueGrowthRate")}
          inputMode="decimal"
          defaultValue={percentField(defaults.valueGrowthRatePpm ?? 0)}
        />
      </Field>

      <Field
        label={`${t("fields.horizonYears")} · ${t("fields.years")}`}
        name={name("horizonYears")}
      >
        <Input
          name={name("horizonYears")}
          type="number"
          min={1}
          max={50}
          defaultValue={defaults.horizonYears ?? 20}
        />
      </Field>
    </>
  );
}
