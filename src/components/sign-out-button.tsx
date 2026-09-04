"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";

import { authClient } from "@/lib/auth-client";

export function SignOutButton() {
  const t = useTranslations("auth");
  const router = useRouter();

  async function stop() {
    await authClient.signOut();
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={stop}
      className="w-full cursor-pointer text-left text-[13px] text-ink-2 underline-offset-4 transition-colors hover:text-ink hover:underline"
    >
      {t("signOut")}
    </button>
  );
}
