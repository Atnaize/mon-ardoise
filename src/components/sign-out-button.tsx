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
      className="rounded-sm border border-line px-3 py-1.5 text-xs font-medium text-ink-2 transition-colors hover:border-accent hover:text-accent"
    >
      {t("signOut")}
    </button>
  );
}
