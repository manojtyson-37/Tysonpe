import { AvatarImage } from "./avatar-image";

export type AvatarSize = "sm" | "md" | "lg" | "xl";

const SIZE_CLASS: Record<AvatarSize, string> = {
  sm: "size-8 text-sm",
  md: "size-10 text-base",
  lg: "size-14 text-xl",
  xl: "size-20 text-3xl",
};

/**
 * Letter tile (brand fill, flat) with an optional photo. `size` is a named step, or a pixel number for
 * call sites that need an exact box. The tile is decorative: the name is always printed beside it.
 * The letter is always drawn; a photo layers over it, so a photo that fails to load falls back to the letter.
 */
export function Avatar({
  name,
  src,
  alt,
  size = "md",
  className,
}: {
  name: string;
  src?: string;
  /** Alt text for a photo. Leave empty when the name is printed next to the avatar. */
  alt?: string;
  size?: AvatarSize | number;
  className?: string;
}) {
  const sized =
    typeof size === "number"
      ? // 12px floor: below that the letter is unreadable and the tile should read as a plain swatch.
        { className: "", style: { width: size, height: size, fontSize: Math.max(12, size * 0.4) } }
      : { className: SIZE_CLASS[size], style: undefined };
  const cls = [
    "relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-control bg-brand text-brand-ink font-semibold",
    sized.className,
    className,
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <span aria-hidden={src && alt ? undefined : true} style={sized.style} className={cls}>
      <span aria-hidden="true">{name.trim().charAt(0).toUpperCase()}</span>
      {src ? <AvatarImage src={src} alt={alt ?? ""} /> : null}
    </span>
  );
}
