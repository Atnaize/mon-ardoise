import type { ComponentProps } from "react";

import { cn } from "@/lib/cn";

export function TableScroll({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn("overflow-x-auto rounded-ui border border-line-soft bg-surface", className)}
      {...props}
    />
  );
}

export function Table({ className, ...props }: ComponentProps<"table">) {
  return (
    <table
      // Pas de largeur minimale par défaut : la colonne de lecture fait 34 rem, et
      // un tableau qui la dépasse défile horizontalement, ce qu'on veut éviter.
      className={cn("w-full border-collapse text-sm", className)}
      {...props}
    />
  );
}

export function Th({ className, ...props }: ComponentProps<"th">) {
  return (
    <th
      className={cn(
        "px-1.5 py-2 text-left text-[10px] font-normal tracking-[0.08em] whitespace-nowrap text-ink-3 uppercase max-[30rem]:px-1 max-[30rem]:text-[9.5px]",
        className,
      )}
      {...props}
    />
  );
}

export function Td({ className, numeric, ...props }: ComponentProps<"td"> & { numeric?: boolean }) {
  return (
    <td
      // Pas de `first:pl-0` ici : le pseudo-sélecteur l'emporte en spécificité sur un
      // `pl-*` passé par l'appelant, ce qui écrasait le retrait des lignes de mois.
      className={cn(
        "border-t border-line-soft px-1.5 py-2 align-baseline text-[13.5px] text-ink-2 max-[30rem]:px-1 max-[30rem]:py-1.5 max-[30rem]:text-xs",
        numeric && "text-right tabular-nums whitespace-nowrap",
        className,
      )}
      {...props}
    />
  );
}
