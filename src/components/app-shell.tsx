import type { ReactNode } from "react";

import { getTranslations } from "next-intl/server";

import { AppFooter } from "@/components/app-footer";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { UserMenu } from "@/components/user-menu";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/cn";
import { currentUser } from "@/lib/session";

export async function AppShell({
  children,
  width = "reading",
}: {
  children: ReactNode;
  /** « wide » n'est là que pour la page d'entrée : elle se présente, elle ne se consulte pas. */
  width?: "reading" | "wide";
}) {
  const t = await getTranslations("app");
  const user = await currentUser();

  return (
    // Une colonne de lecture, pas un tableau de bord pleine largeur : c'est cette
    // contrainte qui fait l'aération. Le tableau annuel est dessiné pour y tenir.
    // Le pied de page, lui, sort de la colonne : sa bande traverse toute la largeur
    // et referme la page, la colonne gardant son alignement à l'intérieur.
    <div className="flex min-h-dvh flex-col">
      <div
        className={cn(
          "mx-auto flex w-full flex-1 flex-col px-5",
          width === "wide" ? "max-w-[44rem]" : "max-w-[34rem]",
        )}
      >
        <header className="flex items-center justify-between gap-4 border-b border-line py-4">
          <Link href="/" className="font-display text-base font-semibold tracking-tight text-ink">
            {t("name")}
          </Link>
          {/* Connecté, la langue passe dans le menu du compte : c'est un réglage
              d'utilisateur, pas une commande de l'en-tête. */}
          {user ? (
            <UserMenu name={user.name} email={user.email} image={user.image} />
          ) : (
            <LocaleSwitcher />
          )}
        </header>
        <main className="flex flex-1 flex-col gap-8 pt-8 pb-16">{children}</main>
      </div>
      <AppFooter />
    </div>
  );
}

export function PageTitle({ title, intro, action }: { title: string; intro?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="flex flex-col gap-2">
        <h1 className="font-display text-2xl font-semibold tracking-tight text-balance sm:text-3xl">
          {title}
        </h1>
        {intro ? <p className="max-w-prose text-sm leading-relaxed text-ink-2">{intro}</p> : null}
      </div>
      {action}
    </div>
  );
}
