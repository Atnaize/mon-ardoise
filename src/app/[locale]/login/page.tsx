import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";

import { AppShell } from "@/components/app-shell";
import { SignInButton } from "@/components/sign-in-button";
import { currentUser } from "@/lib/session";

export default async function LoginPage({ params }: PageProps<"/[locale]/login">) {
  const { locale } = await params;
  const t = await getTranslations("auth");
  const user = await currentUser();

  if (user) {
    redirect(`/${locale}`);
  }

  // Dans la coquille, comme le reste : une page de connexion nue, sans en-tête ni
  // pied, se lit comme une erreur de chargement.
  return (
    <AppShell>
      <section className="flex flex-col items-start gap-5 pt-4">
        <span aria-hidden className="h-px w-8 bg-line" />
        <h1 className="font-display text-[2rem] leading-[1.08] font-semibold tracking-[-0.02em] text-balance">
          {t("loginTitle")}
        </h1>
        <p className="max-w-prose text-[1.0625rem] leading-relaxed text-pretty text-ink-2">
          {t("loginIntro")}
        </p>
        <div className="pt-1">
          <SignInButton />
        </div>
      </section>
    </AppShell>
  );
}
