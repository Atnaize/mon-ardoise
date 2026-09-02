import type { ReactNode } from "react";

import { getTranslations } from "next-intl/server";

import { LocaleSwitcher } from "@/components/locale-switcher";
import { SignOutButton } from "@/components/sign-out-button";
import { Link } from "@/i18n/navigation";
import { currentUser } from "@/lib/session";

export async function AppShell({ children }: { children: ReactNode }) {
  const t = await getTranslations("app");
  const user = await currentUser();

  return (
    <div className="mx-auto flex min-h-dvh max-w-5xl flex-col px-4 pb-16 sm:px-6">
      <header className="flex items-center justify-between gap-4 border-b border-line py-4">
        <Link href="/" className="font-display text-base font-extrabold tracking-tight text-ink">
          {t("name")}
        </Link>
        <div className="flex items-center gap-3">
          <LocaleSwitcher />
          {user ? <SignOutButton /> : null}
        </div>
      </header>
      <main className="flex flex-1 flex-col gap-8 pt-8">{children}</main>
    </div>
  );
}

export function PageTitle({ title, intro, action }: { title: string; intro?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="flex flex-col gap-2">
        <h1 className="font-display text-2xl font-extrabold tracking-tight text-balance sm:text-3xl">
          {title}
        </h1>
        {intro ? <p className="max-w-prose text-sm leading-relaxed text-ink-2">{intro}</p> : null}
      </div>
      {action}
    </div>
  );
}
