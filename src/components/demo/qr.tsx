// The sample QR drawing. Raw hex fills are allowed in this file only: a QR is printed ink on white and the UPI mark
// carries its own brand colours, so neither is an app token. The page labels it "Sample QR, not scannable".

const INK = "#16130f";
const PAPER = "#ffffff";
const UPI_GREEN = "#097939";
const UPI_ORANGE = "#e65100";

// Finder squares (top-left corner of each 30-unit square) and the data dots, in a 120-unit grid.
const FINDERS: ReadonlyArray<readonly [number, number]> = [
  [5, 5],
  [85, 5],
  [5, 85],
];
const DOTS: ReadonlyArray<readonly [number, number]> = [
  [45, 15], [55, 15], [65, 15], [75, 15],
  [45, 25], [65, 25],
  [45, 35], [55, 35], [75, 35],
  [15, 55], [25, 55], [15, 65], [35, 65], [25, 75],
  [85, 55], [105, 55], [95, 65], [105, 75],
  [45, 85], [65, 85], [55, 95], [75, 95], [65, 105],
];

/** Decorative QR-style drawing, `role="img"` with a name that says it cannot be scanned. */
export function SampleQr({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Sample QR code, not scannable"
    >
      {FINDERS.map(([x, y]) => (
        <g key={`${x}-${y}`}>
          <rect x={x} y={y} width="30" height="30" rx="4" fill={INK} />
          <rect x={x + 5} y={y + 5} width="20" height="20" rx="2" fill={PAPER} />
          <rect x={x + 10} y={y + 10} width="10" height="10" rx="1" fill={INK} />
        </g>
      ))}
      {DOTS.map(([cx, cy]) => (
        <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="3" fill={INK} />
      ))}
      <rect x="42" y="42" width="36" height="36" rx="8" fill={PAPER} stroke={INK} strokeWidth="2" />
      <path d="M52 50L62 60L52 70" stroke={UPI_GREEN} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M58 50L68 60L58 70" stroke={UPI_ORANGE} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
