"use client";

import { useTranslations } from "next-intl";

import { errorFor, type FieldErrors } from "@/components/fields/prefix";
import { InlineForm } from "@/components/inline-form";
import { Field, Input, Select } from "@/components/ui/field";
import { ROLES } from "@/lib/schemas";
import { updateMemberAction } from "@/server/actions";

const ROLE_KEY = { owner: "roleOwner", editor: "roleEditor", viewer: "roleViewer" } as const;

/** Les deux quote-parts se saisissent en pourcentage ; la base les garde en pour mille. */
function toPercent(permille: number): string {
  return String(permille / 10);
}

export function MemberForm({
  propertyId,
  memberId,
  locale,
  label,
  defaults,
  lockedToOwner,
}: {
  propertyId: string;
  memberId: string;
  locale: string;
  label: string;
  defaults: {
    role: string;
    ownershipSharePermille: number;
    contributionSharePermille: number;
  };
  /** Dernier propriétaire : le rôle est figé, les quote-parts restent modifiables. */
  lockedToOwner: boolean;
}) {
  const t = useTranslations("members");

  return (
    <InlineForm
      label={label}
      locale={locale}
      variant="ghost"
      action={updateMemberAction.bind(null, propertyId, memberId)}
    >
      {(errors: FieldErrors) => (
        <>
          <Field
            label={t("role")}
            name="role"
            hint={lockedToOwner ? t("lastOwner") : undefined}
            error={errorFor(errors, undefined, "role")}
          >
            <Select name="role" defaultValue={defaults.role} disabled={lockedToOwner}>
              {ROLES.map((role) => (
                <option key={role} value={role}>
                  {t(ROLE_KEY[role])}
                </option>
              ))}
            </Select>
            {/* Un select désactivé n'est pas envoyé : le rôle part quand même. */}
            {lockedToOwner ? <input type="hidden" name="role" value="owner" /> : null}
          </Field>

          <Field
            label={t("ownershipShare")}
            name="ownershipShare"
            hint={t("ownershipShareHint")}
            error={errorFor(errors, undefined, "ownershipShare")}
          >
            <Input
              name="ownershipShare"
              inputMode="decimal"
              defaultValue={toPercent(defaults.ownershipSharePermille)}
            />
          </Field>

          <Field
            label={t("contributionShare")}
            name="contributionShare"
            hint={t("contributionShareHint")}
            error={errorFor(errors, undefined, "contributionShare")}
          >
            <Input
              name="contributionShare"
              inputMode="decimal"
              defaultValue={toPercent(defaults.contributionSharePermille)}
            />
          </Field>
        </>
      )}
    </InlineForm>
  );
}
