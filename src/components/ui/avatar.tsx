export type AvatarSize = "sm" | "md" | "lg" | "xl";

const SIZE_CLASS: Record<AvatarSize, string> = {
  sm: "size-8 text-sm",
  md: "size-10 text-base",
  lg: "size-14 text-xl",
  xl: "size-20 text-3xl",
};

/**
 * Letter tile (ink on paper, flat) with an optional photo. `size` is a named step, or a pixel number for
 * call sites that need an exact box. The tile is decorative: the name is always printed beside it.
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
      ? { className: "", style: { width: size, height: size, fontSize: size * 0.4 } }
      : { className: SIZE_CLASS[size], style: undefined };
  const cls = [
    "inline-flex shrink-0 items-center justify-center overflow-hidden rounded-control bg-brand text-brand-ink font-semibold",
    sized.className,
    className,
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <span aria-hidden={src && alt ? undefined : true} style={sized.style} className={cls}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element -- remote creator photos have no known size or host
        <img src={src} alt={alt ?? ""} className="size-full object-cover" />
      ) : (
        name.trim().charAt(0).toUpperCase()
      )}
    </span>
  );
}
