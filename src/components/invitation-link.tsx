"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { formatCode } from "@/lib/invitation";

/**
 * Le code et son lien. Il n'y a pas d'e-mail sortant : ce bouton est le seul
 * moyen de faire parvenir une invitation, donc il montre le code en clair,
 * groupé pour être dicté, et copie l'URL complète d'un clic.
 */
export function InvitationLink({ code, url }: { code: string; url: string }) {
  const t = useTranslations("members");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) {
      return;
    }

    const timer = setTimeout(() => setCopied(false), 2500);

    return () => clearTimeout(timer);
  }, [copied]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      // Presse-papier refusé (page non sécurisée, permission coupée) : le code
      // reste affiché et sélectionnable, ce qui suffit à le transmettre.
      setCopied(false);
    }
  }

  return (
    <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
      <code className="rounded-ui bg-surface-2 px-2 py-0.5 font-mono text-[12.5px] tracking-wider text-ink select-all">
        {formatCode(code)}
      </code>
      <button
        type="button"
        onClick={copy}
        className="cursor-pointer text-xs text-ink-2 underline-offset-4 transition-colors hover:text-ink hover:underline"
      >
        {copied ? t("copied") : t("copy")}
      </button>
    </span>
  );
}
