import type { ComponentProps, ReactNode } from "react";

import { cn } from "@/lib/cn";

const CONTROL =
  "w-full rounded-ui border border-line bg-surface px-3 py-2 text-sm text-ink outline-none placeholder:text-ink-3 focus-visible:border-accent";

export function Field({
  label,
  name,
  hint,
  error,
  children,
}: {
  label: ReactNode;
  name: string;
  hint?: ReactNode;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={name} className="text-xs font-medium text-ink-2">
        {label}
      </label>
      {children}
      {hint && !error ? <p className="text-xs text-ink-3">{hint}</p> : null}
      {error ? (
        <p role="alert" className="text-xs text-negative">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input id={props.name} className={cn(CONTROL, className)} {...props} />;
}

export function Select({ className, ...props }: ComponentProps<"select">) {
  return <select id={props.name} className={cn(CONTROL, "pr-8", className)} {...props} />;
}

export function Checkbox({ label, className, ...props }: ComponentProps<"input"> & { label: ReactNode }) {
  return (
    <label className="flex items-center gap-2.5 text-sm text-ink-2">
      <input
        type="checkbox"
        className={cn("size-4 rounded-ui accent-accent", className)}
        {...props}
      />
      {label}
    </label>
  );
}
