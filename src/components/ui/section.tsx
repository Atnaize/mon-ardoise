import type { ReactNode } from "react";

import { Eyebrow } from "@/components/ui/eyebrow";

/**
 * Une section de la page : un filet, un intitulé en petites capitales, et son
 * contenu. Pas de cadre : sur une colonne de lecture étroite, des boîtes empilées
 * hachent la page là où un filet suffit à séparer.
 */
export function Section({
  title,
  hint,
  action,
  children,
}: {
  title: ReactNode;
  hint?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3 border-t border-line pt-6">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
        <div className="flex flex-col gap-1.5">
          <Eyebrow>{title}</Eyebrow>
          {hint ? (
            <p className="text-[11.5px] leading-normal text-ink-3">{hint}</p>
          ) : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

/** Une liste d'éléments séparés par des filets, chacun avec ses actions discrètes. */
export function SectionList({ children }: { children: ReactNode }) {
  return <ul className="m-0 flex list-none flex-col p-0">{children}</ul>;
}

export function SectionItem({
  title,
  detail,
  actions,
}: {
  title: ReactNode;
  detail: ReactNode;
  actions: ReactNode;
}) {
  return (
    <li className="flex flex-col gap-1.5 border-t border-line-soft py-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <span className="text-sm font-medium text-ink">{title}</span>
        <span className="text-[12.5px] tabular-nums text-ink-3">{detail}</span>
      </div>
      <div className="flex flex-wrap items-center gap-4">{actions}</div>
    </li>
  );
}
