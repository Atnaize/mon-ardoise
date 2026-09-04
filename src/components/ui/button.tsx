import type { ComponentProps } from "react";

import { cn } from "@/lib/cn";

/**
 * Une seule action portée par un aplat : la principale. Tout le reste est du texte
 * avec un soulignement au survol : un cadre autour de « Modifier » et « Supprimer »
 * les fait peser autant que le contenu qu'ils modifient.
 */
type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-ink text-ground hover:bg-ink-2",
  secondary: "border border-line bg-surface text-ink hover:border-ink-3 hover:bg-surface-2",
  ghost: "text-ink-2 underline-offset-4 hover:text-ink hover:underline",
  danger: "text-negative underline-offset-4 hover:underline",
};

const SIZES: Record<Size, string> = {
  sm: "text-xs",
  md: "text-sm",
};

// Un aplat ou une bordure a besoin de respirer ; un lien textuel, non.
const PADDING: Record<Variant, Record<Size, string>> = {
  primary: { sm: "px-3 py-1.5", md: "px-4 py-2.5" },
  secondary: { sm: "px-3 py-1.5", md: "px-4 py-2.5" },
  ghost: { sm: "", md: "" },
  danger: { sm: "", md: "" },
};

export function Button({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ComponentProps<"button"> & { variant?: Variant; size?: Size }) {
  return (
    <button
      className={cn(
        "inline-flex cursor-pointer items-center justify-center gap-2 rounded-ui font-medium transition-colors disabled:cursor-default disabled:opacity-50",
        VARIANTS[variant],
        SIZES[size],
        PADDING[variant][size],
        className,
      )}
      {...props}
    />
  );
}
