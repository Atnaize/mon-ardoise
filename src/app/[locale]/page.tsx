import { getTranslations } from "next-intl/server";

import { LocaleSwitcher } from "@/components/locale-switcher";
import { SignInButton } from "@/components/sign-in-button";
import { SignOutButton } from "@/components/sign-out-button";
import { currentUser } from "@/lib/session";

const FOUNDATIONS = ["auth", "db", "i18n", "pwa", "engine", "ci"] as const;

export default async function HomePage() {
  const t = await getTranslations();
  const user = await currentUser();

  return (
    <div className="mx-auto flex min-h-dvh max-w-3xl flex-col px-5 pb-16">
      <header className="flex items-center justify-between gap-4 border-b border-line py-5">
        <span className="font-display text-lg font-extrabold tracking-tight">{t("app.name")}</span>
        <div className="flex items-center gap-3">
          <LocaleSwitcher />
          {user ? <SignOutButton /> : null}
        </div>
      </header>

      <main className="flex flex-1 flex-col gap-10 pt-12">
        {user ? (
          <section className="flex flex-col gap-4">
            <p className="font-mono text-xs uppercase tracking-widest text-ink-3">
              {t("auth.signedInAs", { name: user.name })}
            </p>
            <h1 className="font-display text-3xl font-extrabold leading-tight tracking-tight text-balance sm:text-4xl">
              {t("home.emptyTitle")}
            </h1>
            <p className="max-w-prose leading-relaxed text-ink-2">{t("home.emptyBody")}</p>
          </section>
        ) : (
          <section className="flex flex-col gap-5">
            <h1 className="font-display text-3xl font-extrabold leading-tight tracking-tight text-balance sm:text-5xl">
              {t("home.guestTitle")}
            </h1>
            <p className="max-w-prose leading-relaxed text-ink-2">{t("home.guestBody")}</p>
            <div className="pt-2">
              <SignInButton />
            </div>
          </section>
        )}

        <section className="flex flex-col gap-4 rounded-sm border border-line-soft bg-surface p-5">
          <h2 className="font-mono text-xs uppercase tracking-widest text-accent-ink">
            {t("home.foundationsTitle")}
          </h2>
          <ul className="grid gap-2 sm:grid-cols-2">
            {FOUNDATIONS.map((key) => (
              <li key={key} className="flex items-baseline gap-2 text-sm text-ink-2">
                <span aria-hidden="true" className="text-positive">
                  &#10003;
                </span>
                {t(`home.foundations.${key}`)}
              </li>
            ))}
          </ul>
        </section>
      </main>

      <footer className="border-t border-line pt-5 font-mono text-xs text-ink-3">
        {t("app.tagline")}
      </footer>
    </div>
  );
}
