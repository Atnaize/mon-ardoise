"use client";

import { useTranslations } from "next-intl";
import { useActionState, useEffect, useRef, useState, type ReactNode } from "react";

import type { FieldErrors } from "@/components/fields/prefix";
import { Button } from "@/components/ui/button";
import type { ActionState } from "@/server/form";

export function InlineForm({
  label,
  locale,
  action,
  children,
}: {
  label: string;
  locale: string;
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  children: (errors: FieldErrors) => ReactNode;
}) {
  const t = useTranslations("common");
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState<ActionState, FormData>(action, {});
  const handled = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (state.succeededAt && state.succeededAt !== handled.current) {
      handled.current = state.succeededAt;
      setOpen(false);
    }
  }, [state.succeededAt]);

  if (!open) {
    return (
      <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>
        {label}
      </Button>
    );
  }

  return (
    <form
      action={formAction}
      className="grid w-full gap-4 border-t border-line-soft pt-4 sm:grid-cols-2"
    >
      <input type="hidden" name="locale" value={locale} />
      {children(state.errors)}
      <div className="flex items-center gap-3 sm:col-span-2">
        <Button type="submit" size="sm" disabled={pending}>
          {t("save")}
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
          {t("cancel")}
        </Button>
      </div>
    </form>
  );
}
