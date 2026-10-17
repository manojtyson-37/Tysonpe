import type { CSSProperties, ReactNode } from "react";
import { brandRingColor, brandTextColor, readableOn } from "@/lib/color";
import { Avatar as UiAvatar } from "@/components/ui/avatar";

/** Warm ink: the fallback when a stored colour is not a six-digit hex (the write side only allows that, but the DB can be written directly). */
const FALLBACK_BRAND = "#16130f";

/** Scopes a creator's brand colour to their storefront subtree. */
export function BrandScope({ color, children }: { color: string; children: ReactNode }) {
  // The colour is interpolated into inline CSS, and React escapes style values but does not strip `;`, so it is validated here
  // and EVERY variable is derived from the validated value (a bad one would otherwise leave the avatar letter white on an invalid fill).
  const safe = /^#[0-9a-f]{6}$/i.test(color) ? color : FALLBACK_BRAND;
  // --brand-text / --brand-ring are the contrast-safe variants of --brand for text (>=4.5:1) and non-text UI (>=3:1); --brand itself is unchanged.
  const style = {
    "--brand": safe,
    "--brand-ink": readableOn(safe),
    "--brand-soft": `${safe}1f`,
    "--brand-text": brandTextColor(safe),
    "--brand-ring": brandRingColor(safe),
  } as CSSProperties;
  return <div style={style}>{children}</div>;
}

/** Storefront avatar: delegates to the ui primitive; `size` stays a pixel number for existing call sites. */
export function Avatar({ name, size = 56 }: { name: string; size?: number }) {
  return <UiAvatar name={name} size={size} />;
}
