"use client";

import { useTranslations } from "next-intl";

import { errorFor, type FieldErrors } from "@/components/fields/prefix";
import { InlineForm } from "@/components/inline-form";
import { Field, Input, Select } from "@/components/ui/field";
import { ROLES } from "@/lib/schemas";
import { createInvitationAction } from "@/server/actions";

const ROLE_KEY = { owner: "roleOwner", editor: "roleEditor", viewer: "roleViewer" } as const;

export function InvitationForm({
  propertyId,
  locale,
  label,
}: {
  propertyId: string;
  locale: string;
  label: string;
}) {
  const t = useTranslations("members");

  return (
    <InlineForm
      label={label}
      locale={locale}
      action={createInvitationAction.bind(null, propertyId)}
    >
      {(errors: FieldErrors) => (
        <>
          <Field label={t("role")} name="role" error={errorFor(errors, undefined, "role")}>
            <Select name="role" defaultValue="viewer">
              {ROLES.map((role) => (
                <option key={role} value={role}>
                  {t(ROLE_KEY[role])}
                </option>
              ))}
            </Select>
          </Field>

          <Field
            label={t("inviteEmail")}
            name="email"
            hint={t("inviteEmailHint")}
            error={errorFor(errors, undefined, "email")}
          >
            <Input name="email" type="email" autoComplete="off" placeholder="nom@exemple.be" />
          </Field>
        </>
      )}
    </InlineForm>
  );
}
