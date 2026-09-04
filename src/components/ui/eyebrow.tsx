import type { ReactNode } from "react";

/**
 * L'intitulé d'une section. En petites capitales espacées, il structure la page
 * sans peser, ce qui dispense de titres gras et garde le regard sur les chiffres.
 */
export function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <h2 className="text-[10.5px] tracking-[0.14em] text-ink-3 uppercase">{children}</h2>
  );
}
