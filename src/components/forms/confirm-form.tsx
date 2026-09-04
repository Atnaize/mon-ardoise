"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";

/**
 * Une action sans retour arrière, en deux temps : le déclencheur, puis la
 * question à sa place. Un `confirm()` de navigateur ferait le même travail, mais
 * il sort de la page, ne se traduit pas et ne se met pas en forme.
 *
 * La question s'affiche avant le bouton, jamais sous le curseur : deux clics au
 * même endroit ne valent pas mieux qu'un seul.
 */
function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" variant="danger" size="sm" disabled={pending}>
      {label}
    </Button>
  );
}

export function ConfirmForm({
  action,
  locale,
  label,
  question,
}: {
  action: (formData: FormData) => Promise<void>;
  locale: string;
  label: string;
  /** Ce que la confirmation annonce. Par défaut, qu'il n'y a pas de retour arrière. */
  question?: string;
}) {
  const t = useTranslations("common");
  const [armed, setArmed] = useState(false);

  if (!armed) {
    return (
      <Button variant="danger" size="sm" onClick={() => setArmed(true)}>
        {label}
      </Button>
    );
  }

  return (
    <form action={action} className="flex flex-wrap items-center gap-3">
      <input type="hidden" name="locale" value={locale} />
      <span role="alert" className="text-xs text-ink-2">
        {question ?? t("irreversible")}
      </span>
      <Submit label={label} />
      <Button type="button" variant="ghost" size="sm" onClick={() => setArmed(false)}>
        {t("cancel")}
      </Button>
    </form>
  );
}
