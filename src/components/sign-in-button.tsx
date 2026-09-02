"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";

import { authClient } from "@/lib/auth-client";

export function SignInButton({ callbackURL = "/" }: { callbackURL?: string }) {
  const t = useTranslations("auth");
  const [pending, setPending] = useState(false);

  async function start() {
    setPending(true);
    await authClient.signIn.social({ provider: "google", callbackURL });
  }

  return (
    <button
      type="button"
      onClick={start}
      disabled={pending}
      className="inline-flex items-center justify-center rounded-sm bg-accent px-5 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
    >
      {t("signInWithGoogle")}
    </button>
  );
}
