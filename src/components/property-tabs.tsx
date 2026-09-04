"use client";

import { useTranslations } from "next-intl";

import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/cn";

/**
 * Les trois vues d'un bien. Collées en haut : la synthèse fait trente et une lignes
 * de tableau, et remonter tout en haut pour changer de vue n'est pas une navigation.
 *
 * Le nom du bien reste le titre des trois pages : c'est l'onglet actif qui dit où
 * on est, pas le titre. Sans ça, « L'ardoise » comme titre faisait perdre le bien.
 */
export function PropertyTabs({
  propertyId,
  hasLease,
  role,
}: {
  propertyId: string;
  /** Sans bail, l'ardoise n'a rien à montrer : l'onglet reste visible mais inerte. */
  hasLease: boolean;
  /** Un lecteur voit le bien sans pouvoir le régler. */
  role: "owner" | "editor" | "viewer";
}) {
  const t = useTranslations("property");
  const pathname = usePathname();
  const base = `/properties/${propertyId}`;

  const tabs = [
    { href: base, label: t("tabSummary"), disabled: false, why: undefined },
    {
      href: `${base}/rent`,
      label: t("tabRent"),
      disabled: !hasLease,
      why: t("tabRentDisabled"),
    },
    {
      href: `${base}/edit`,
      label: t("tabEdit"),
      disabled: role === "viewer",
      why: t("tabEditDisabled"),
    },
  ];

  return (
    <nav
      aria-label={t("tabsLabel")}
      className="sticky top-0 z-10 -mx-5 border-b border-line bg-ground/95 px-5 backdrop-blur-sm"
    >
      <ul className="m-0 flex list-none gap-5 p-0">
        {tabs.map((tab) => {
          const active = pathname === tab.href;
          const shared = "-mb-px inline-block border-b-2 py-2.5 text-[13.5px] transition-colors";

          return (
            <li key={tab.href}>
              {/* Grisé plutôt que caché : un onglet qui disparaît d'un bien à l'autre
                  déplace les deux autres sous le doigt, et n'explique pas pourquoi
                  l'ardoise est vide. Inerte, il dit qu'il manque un bail. */}
              {tab.disabled ? (
                <span
                  aria-disabled="true"
                  title={tab.why}
                  className={cn(shared, "cursor-not-allowed border-transparent text-ink-3/50")}
                >
                  {tab.label}
                </span>
              ) : (
                <Link
                  href={tab.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    shared,
                    active
                      ? "border-ink font-medium text-ink"
                      : "border-transparent text-ink-3 hover:text-ink-2",
                  )}
                >
                  {tab.label}
                </Link>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
