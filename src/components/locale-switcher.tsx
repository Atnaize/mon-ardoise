"use client";

import { useLocale, useTranslations } from "next-intl";

import { Link, usePathname } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";

export function LocaleSwitcher() {
  const pathname = usePathname();
  const active = useLocale();
  const t = useTranslations("locale");

  return (
    <nav aria-label={t("label")} className="flex items-center gap-1">
      {routing.locales.map((locale) => (
        <Link
          key={locale}
          href={pathname}
          locale={locale}
          aria-current={locale === active ? "true" : undefined}
          className={
            locale === active
              ? "rounded-sm bg-surface-2 px-2 py-1 text-xs font-semibold text-ink"
              : "rounded-sm px-2 py-1 text-xs text-ink-3 transition-colors hover:text-accent"
          }
        >
          {locale.toUpperCase()}
        </Link>
      ))}
    </nav>
  );
}
