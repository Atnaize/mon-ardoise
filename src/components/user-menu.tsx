"use client";

import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";

import { LocaleSwitcher } from "@/components/locale-switcher";
import { SignOutButton } from "@/components/sign-out-button";
import { cn } from "@/lib/cn";

/** Les initiales, quand Google ne donne pas d'image. */
function initials(name: string, email: string): string {
  const source = name.trim() || email;
  const parts = source.split(/[\s.@_-]+/).filter(Boolean);

  return (parts.length > 1 ? parts[0][0] + parts[1][0] : source.slice(0, 2)).toUpperCase();
}

/**
 * Le compte tient dans un bouton en haut à droite : l'identité, la langue et la
 * déconnexion. C'est là qu'on va les chercher : un pied de page qui annonce
 * « connecté en tant que » se lit comme une information, pas comme un réglage.
 */
export function UserMenu({
  name,
  email,
  image,
}: {
  name: string;
  email: string;
  image?: string | null;
}) {
  const t = useTranslations();
  const [open, setOpen] = useState(false);
  const [broken, setBroken] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const onPointer = (event: MouseEvent | TouchEvent) => {
      if (!box.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", onPointer);
    document.addEventListener("touchstart", onPointer);
    document.addEventListener("keydown", onKey);

    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("touchstart", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={box} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={t("auth.account")}
        className={cn(
          "flex size-7 cursor-pointer items-center justify-center overflow-hidden rounded-full border text-[10.5px] font-semibold transition-colors",
          open
            ? "border-ink bg-ink text-ground"
            : "border-line bg-surface-2 text-ink-2 hover:border-ink-3 hover:text-ink",
        )}
      >
        {image && !broken ? (
          // Une <img> plutôt que next/image : l'avatar vient de Google, et le
          // composant exigerait de déclarer son domaine dans next.config.
          // `no-referrer` est indispensable : googleusercontent refuse l'image
          // quand la requête arrive avec un Referer d'un autre domaine.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={image}
            alt=""
            width={28}
            height={28}
            referrerPolicy="no-referrer"
            onError={() => setBroken(true)}
            className="size-full object-cover"
          />
        ) : (
          initials(name, email)
        )}
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute right-0 z-20 mt-2 flex w-60 flex-col rounded-ui border border-line bg-surface shadow-[0_12px_28px_-16px_rgba(0,0,0,0.35)]"
        >
          <div className="flex flex-col gap-0.5 px-3.5 py-3">
            <span className="text-[13px] font-medium text-ink">{name || email}</span>
            <span className="truncate text-[11.5px] text-ink-3">{email}</span>
          </div>

          <div className="flex items-baseline justify-between gap-3 border-t border-line-soft px-3.5 py-2.5">
            <span className="text-[11.5px] text-ink-3">{t("locale.label")}</span>
            <LocaleSwitcher />
          </div>

          <div className="border-t border-line-soft px-3.5 py-2.5">
            <SignOutButton />
          </div>
        </div>
      ) : null}
    </div>
  );
}
