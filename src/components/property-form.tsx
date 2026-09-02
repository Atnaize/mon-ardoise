"use client";

import { useTranslations } from "next-intl";
import { useActionState, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Checkbox, Field, Input, Select } from "@/components/ui/field";
import { createPropertyAction } from "@/server/actions";
import type { ActionState } from "@/server/form";

export function PropertyForm({ locale, today }: { locale: string; today: string }) {
  const t = useTranslations();
  const [state, action, pending] = useActionState<ActionState, FormData>(createPropertyAction, {});
  const [withLoan, setWithLoan] = useState(false);
  const [withLease, setWithLease] = useState(false);

  const error = (path: string) => state.errors?.[path];

  return (
    <form action={action} className="flex flex-col gap-5">
      <input type="hidden" name="locale" value={locale} />

      <Card>
        <CardHeader title={t("property.sectionProperty")} />
        <CardBody className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Field label={t("fields.name")} name="property.name" error={error("property.name")}>
              <Input name="property.name" placeholder={t("fields.namePlaceholder")} required />
            </Field>
          </div>

          <Field label={t("fields.type")} name="property.type">
            <Select name="property.type" defaultValue="house">
              <option value="house">{t("property.type.house")}</option>
              <option value="apartment">{t("property.type.apartment")}</option>
            </Select>
          </Field>

          <Field label={t("fields.region")} name="property.region">
            <Select name="property.region" defaultValue="wallonie">
              <option value="wallonie">{t("property.region.wallonie")}</option>
              <option value="bruxelles">{t("property.region.bruxelles")}</option>
              <option value="flandre">{t("property.region.flandre")}</option>
            </Select>
          </Field>

          <Field label={t("fields.status")} name="property.status">
            <Select name="property.status" defaultValue="preparing">
              <option value="preparing">{t("property.status.preparing")}</option>
              <option value="rented">{t("property.status.rented")}</option>
              <option value="occupied">{t("property.status.occupied")}</option>
            </Select>
          </Field>

          <Field
            label={`${t("fields.acquisitionDate")} · ${t("fields.optional")}`}
            name="property.acquisitionDate"
            error={error("property.acquisitionDate")}
          >
            <Input type="date" name="property.acquisitionDate" />
          </Field>

          <Field
            label={`${t("fields.purchasePrice")} · €`}
            name="property.purchasePrice"
            error={error("property.purchasePrice")}
          >
            <Input name="property.purchasePrice" inputMode="decimal" placeholder="250000" />
          </Field>

          <Field
            label={`${t("fields.currentValue")} · €`}
            name="property.currentValue"
            error={error("property.currentValue")}
          >
            <Input name="property.currentValue" inputMode="decimal" placeholder="320000" />
          </Field>

          <Field
            label={`${t("fields.cadastralIncome")} · €`}
            name="property.cadastralIncome"
            hint={t("fields.cadastralIncomeHint")}
            error={error("property.cadastralIncome")}
          >
            <Input name="property.cadastralIncome" inputMode="decimal" placeholder="1250" />
          </Field>

          <Field
            label={`${t("fields.estimatedTaxYearly")} · €`}
            name="property.estimatedTaxYearly"
            hint={t("fields.estimatedTaxYearlyHint")}
            error={error("property.estimatedTaxYearly")}
          >
            <Input name="property.estimatedTaxYearly" inputMode="decimal" defaultValue="0" />
          </Field>

          <Field label={`${t("fields.valueGrowthRate")} · %`} name="property.valueGrowthRate">
            <Input name="property.valueGrowthRate" inputMode="decimal" defaultValue="1,5" />
          </Field>

          <Field label={`${t("fields.marginalTaxRate")} · %`} name="property.marginalTaxRate">
            <Input name="property.marginalTaxRate" inputMode="decimal" defaultValue="50" />
          </Field>

          <Field label={`${t("fields.horizonYears")} · ${t("fields.years")}`} name="property.horizonYears">
            <Input name="property.horizonYears" type="number" min={1} max={50} defaultValue={20} />
          </Field>
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title={t("property.sectionLoan")}
          action={
            <Checkbox
              name="includeLoan"
              label={t("property.includeLoan")}
              checked={withLoan}
              onChange={(event) => setWithLoan(event.target.checked)}
            />
          }
        />
        {withLoan ? (
          <CardBody className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Field label={t("fields.loanLabel")} name="loan.label" error={error("loan.label")}>
                <Input name="loan.label" placeholder={t("fields.loanLabelPlaceholder")} />
              </Field>
            </div>

            <Field label={`${t("fields.principal")} · €`} name="loan.principal" error={error("loan.principal")}>
              <Input name="loan.principal" inputMode="decimal" placeholder="150000" />
            </Field>

            <Field label={t("fields.startDate")} name="loan.startDate" error={error("loan.startDate")}>
              <Input type="date" name="loan.startDate" defaultValue={today} />
            </Field>

            <Field label={`${t("fields.termMonths")} · ${t("fields.months")}`} name="loan.termMonths">
              <Input name="loan.termMonths" type="number" min={1} max={600} defaultValue={240} />
            </Field>

            <Field label={`${t("fields.annualRate")} · %`} name="loan.annualRate" error={error("loan.annualRate")}>
              <Input name="loan.annualRate" inputMode="decimal" placeholder="3,06" />
            </Field>

            <div className="sm:col-span-2">
              <Field label={t("fields.rateBasis")} name="loan.rateBasis" hint={t("fields.rateBasisHint")}>
                <Select name="loan.rateBasis" defaultValue="nominal_12">
                  <option value="nominal_12">{t("fields.rateBasisNominal")}</option>
                  <option value="equivalent">{t("fields.rateBasisEquivalent")}</option>
                </Select>
              </Field>
            </div>

            <Field label={t("fields.amortization")} name="loan.amortization">
              <Select name="loan.amortization" defaultValue="annuity">
                <option value="annuity">{t("fields.amortizationAnnuity")}</option>
                <option value="constant_principal">{t("fields.amortizationConstant")}</option>
              </Select>
            </Field>

            <Field label={t("fields.deferralType")} name="loan.deferralType">
              <Select name="loan.deferralType" defaultValue="none">
                <option value="none">{t("fields.deferralNone")}</option>
                <option value="interest_only">{t("fields.deferralInterest")}</option>
                <option value="full">{t("fields.deferralFull")}</option>
              </Select>
            </Field>

            <Field label={`${t("fields.deferralMonths")} · ${t("fields.months")}`} name="loan.deferralMonths">
              <Input name="loan.deferralMonths" type="number" min={0} max={120} defaultValue={0} />
            </Field>
          </CardBody>
        ) : null}
      </Card>

      <Card>
        <CardHeader
          title={t("property.sectionLease")}
          action={
            <Checkbox
              name="includeLease"
              label={t("property.includeLease")}
              checked={withLease}
              onChange={(event) => setWithLease(event.target.checked)}
            />
          }
        />
        {withLease ? (
          <CardBody className="grid gap-4 sm:grid-cols-2">
            <Field label={t("fields.tenantLabel")} name="lease.tenantLabel" error={error("lease.tenantLabel")}>
              <Input name="lease.tenantLabel" placeholder={t("fields.tenantLabelPlaceholder")} />
            </Field>

            <Field label={t("fields.leaseKind")} name="lease.kind">
              <Select name="lease.kind" defaultValue="one_year">
                <option value="one_year">{t("fields.leaseOneYear")}</option>
                <option value="three_six_nine">{t("fields.leaseThreeSixNine")}</option>
              </Select>
            </Field>

            <Field label={`${t("fields.monthlyRent")} · €`} name="lease.monthlyRent" error={error("lease.monthlyRent")}>
              <Input name="lease.monthlyRent" inputMode="decimal" placeholder="1200" />
            </Field>

            <Field label={`${t("fields.indexationRate")} · %`} name="lease.indexationRate">
              <Input name="lease.indexationRate" inputMode="decimal" defaultValue="2" />
            </Field>

            <Field label={t("fields.startDate")} name="lease.startDate" error={error("lease.startDate")}>
              <Input type="date" name="lease.startDate" defaultValue={today} />
            </Field>

            <Field
              label={`${t("fields.endDate")} · ${t("fields.optional")}`}
              name="lease.endDate"
              hint={t("fields.endDateOptional")}
            >
              <Input type="date" name="lease.endDate" />
            </Field>

            <Field label={t("fields.leaseStatus")} name="lease.status">
              <Select name="lease.status" defaultValue="planned">
                <option value="planned">{t("fields.leaseStatusPlanned")}</option>
                <option value="active">{t("fields.leaseStatusActive")}</option>
                <option value="ended">{t("fields.leaseStatusEnded")}</option>
              </Select>
            </Field>
          </CardBody>
        ) : null}
      </Card>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {t("property.submit")}
        </Button>
      </div>
    </form>
  );
}
