/**
 * Layout placeholder skeletons.
 *
 * Anti-slop: no `animate-pulse`, no spinners, no glow.
 * Static `bg-line` fill; the loading state is announced by a live region elsewhere.
 * All skeleton elements are `aria-hidden` — they are decorative placeholders.
 */

/** A single rectangular skeleton block. */
export function Skeleton({
  className,
  width,
  height,
}: {
  className?: string;
  width?: string | number;
  height?: string | number;
}) {
  const style: React.CSSProperties = {};
  if (width !== undefined) style.width = typeof width === "number" ? `${width}px` : width;
  if (height !== undefined) style.height = typeof height === "number" ? `${height}px` : height;

  return (
    <div
      aria-hidden="true"
      role="presentation"
      style={style}
      className={["rounded bg-line", className].filter(Boolean).join(" ")}
    />
  );
}

/** A stack of skeleton lines mimicking a paragraph of text. */
export function SkeletonText({
  lines = 3,
  className,
}: {
  lines?: number;
  className?: string;
}) {
  return (
    <div aria-hidden="true" className={["space-y-2", className].filter(Boolean).join(" ")}>
      {Array.from({ length: lines }, (_, i) => (
        <div
          key={i}
          className={[
            "h-3 rounded bg-line",
            // Last line is slightly shorter to look natural
            i === lines - 1 && lines > 1 ? "w-3/4" : "w-full",
          ]
            .filter(Boolean)
            .join(" ")}
        />
      ))}
    </div>
  );
}

/** A circular avatar placeholder. */
export function SkeletonAvatar({
  size = 40,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <div
      aria-hidden="true"
      role="presentation"
      style={{ width: `${size}px`, height: `${size}px` }}
      className={["shrink-0 rounded-full bg-line", className].filter(Boolean).join(" ")}
    />
  );
}
