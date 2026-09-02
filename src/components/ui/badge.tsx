import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

type Tone = "neutral" | "positive" | "accent" | "warning";

const TONES: Record<Tone, string> = {
  neutral: "border-line text-ink-3",
  positive: "border-positive text-positive",
  accent: "border-accent text-accent",
  warning: "border-warning text-warning",
};

export function Badge({ children, tone = "neutral" }: { children: ReactNode; tone?: Tone }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wider",
        TONES[tone],
      )}
    >
      {children}
    </span>
  );
}
