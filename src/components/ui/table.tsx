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
  return <table className={cn("w-full min-w-[36rem] text-sm", className)} {...props} />;
}

export function Th({ className, ...props }: ComponentProps<"th">) {
  return (
    <th
      className={cn(
        "border-b border-line-soft bg-surface-2 px-3 py-2 text-left text-[11px] font-normal uppercase tracking-wider text-ink-3 whitespace-nowrap",
        className,
      )}
      {...props}
    />
  );
}

export function Td({ className, numeric, ...props }: ComponentProps<"td"> & { numeric?: boolean }) {
  return (
    <td
      className={cn(
        "border-b border-line-soft px-3 py-2 align-top",
        numeric && "text-right tabular-nums whitespace-nowrap",
        className,
      )}
      {...props}
    />
  );
}
