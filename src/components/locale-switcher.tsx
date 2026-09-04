"use client";

import { useLocale, useTranslations } from "next-intl";

import { usePathname } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { cn } from "@/lib/cn";
import { switchLocaleAction } from "@/server/actions";

/**
 * Un formulaire et non des liens : le choix doit être écrit sur le compte avant la
 * navigation, sinon les deux se font la course et la préférence se perd une fois
 * sur deux.
 */
export function LocaleSwitcher() {
  const pathname = usePathname();
  const active = useLocale();
  const t = useTranslations("locale");

  return (
    <form action={switchLocaleAction} aria-label={t("label")} className="flex items-center gap-2">
      <input type="hidden" name="path" value={pathname} />
      {routing.locales.map((locale) => (
        <button
          key={locale}
          type="submit"
          name="locale"
          value={locale}
          aria-current={locale === active ? "true" : undefined}
          className={cn(
            "cursor-pointer text-xs underline-offset-4 transition-colors",
            locale === active
              ? "font-semibold text-ink"
              : "text-ink-3 hover:text-ink hover:underline",
          )}
        >
          {locale.toUpperCase()}
        </button>
      ))}
    </form>
  );
}
