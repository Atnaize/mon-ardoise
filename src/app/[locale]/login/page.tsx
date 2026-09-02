import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";

import { SignInButton } from "@/components/sign-in-button";
import { currentUser } from "@/lib/session";

export default async function LoginPage({ params }: PageProps<"/[locale]/login">) {
  const { locale } = await params;
  const t = await getTranslations("auth");
  const user = await currentUser();

  if (user) {
    redirect(`/${locale}`);
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-6 px-5">
      <h1 className="font-display text-3xl font-extrabold tracking-tight">{t("loginTitle")}</h1>
      <p className="leading-relaxed text-ink-2">{t("loginIntro")}</p>
      <div>
        <SignInButton />
      </div>
    </main>
  );
}
