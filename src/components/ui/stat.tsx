import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

type Tone = "neutral" | "positive" | "negative" | "accent";

const TONES: Record<Tone, string> = {
  neutral: "text-ink",
  positive: "text-positive",
  negative: "text-negative",
  accent: "text-accent",
};

export function Stat({
  label,
  value,
  hint,
  tone = "neutral",
  emphasis = false,
}: {
  label: ReactNode;
  value: ReactNode;
  hint?: ReactNode;
  tone?: Tone;
  emphasis?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-1 rounded-ui border bg-surface px-3.5 py-3",
        emphasis ? "border-accent" : "border-line-soft",
      )}
    >
      <span className="text-xs text-ink-3">{label}</span>
      <span
        className={cn(
          "font-display font-bold tabular-nums tracking-tight",
          emphasis ? "text-2xl" : "text-lg",
          TONES[tone],
        )}
      >
        {value}
      </span>
      {hint ? <span className="text-xs text-ink-3">{hint}</span> : null}
    </div>
  );
}

export function StatGrid({ children }: { children: ReactNode }) {
  return <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">{children}</div>;
}
