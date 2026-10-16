import type { CSSProperties, ReactNode } from "react";
import { readableOn } from "@/lib/color";
import { Avatar as UiAvatar } from "@/components/ui/avatar";

/** Scopes a creator's brand colour to their storefront subtree. */
export function BrandScope({ color, children }: { color: string; children: ReactNode }) {
  const style = { "--brand": color, "--brand-ink": readableOn(color), "--brand-soft": `${color}1f` } as CSSProperties;
  return <div style={style}>{children}</div>;
}

/** Storefront avatar: delegates to the ui primitive; `size` stays a pixel number for existing call sites. */
export function Avatar({ name, size = 56 }: { name: string; size?: number }) {
  return <UiAvatar name={name} size={size} />;
}
