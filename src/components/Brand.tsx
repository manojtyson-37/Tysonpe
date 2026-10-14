import type { CSSProperties, ReactNode } from "react";
import { readableOn } from "@/lib/color";

/** Scopes a creator's brand colour to their storefront subtree. */
export function BrandScope({ color, children }: { color: string; children: ReactNode }) {
  const style = { "--brand": color, "--brand-ink": readableOn(color), "--brand-soft": `${color}1f` } as CSSProperties;
  return <div style={style}>{children}</div>;
}

export function Avatar({ name, size = 56 }: { name: string; size?: number }) {
  return (
    <span
      aria-hidden
      style={{ width: size, height: size, fontSize: size * 0.4 }}
      className="inline-flex shrink-0 items-center justify-center rounded-2xl bg-brand font-display font-extrabold text-brand-ink"
    >
      {name.trim().charAt(0).toUpperCase()}
    </span>
  );
}
