import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

type Tone = "neutral" | "positive" | "accent" | "warning" | "negative";

const TONES: Record<Tone, string> = {
  neutral: "border-line text-ink-3",
  positive: "border-positive text-positive",
  accent: "border-accent text-accent",
  warning: "border-warning text-warning",
  negative: "border-negative text-negative",
};

export function Badge({ children, tone = "neutral" }: { children: ReactNode; tone?: Tone }) {
  return (
    <span
      className={cn(
        // Casse normale : en capitales, quatre pastilles côte à côte criaient plus fort
        // que le nom du bien juste au-dessus.
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px]",
        TONES[tone],
      )}
    >
      {children}
    </span>
  );
}
