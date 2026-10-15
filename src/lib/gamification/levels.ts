const FLOORS = [0, 100, 250, 500, 1000, 2000, 3500, 5500, 8000, 12000]; // L1..L10
const STEP_ABOVE_10 = 5000;

const floorOf = (level: number) => (level <= 10 ? FLOORS[level - 1] : FLOORS[9] + STEP_ABOVE_10 * (level - 10));

export function levelFor(rawPoints: number) {
  const points = Math.max(0, Math.floor(rawPoints));
  let level: number;
  if (points >= FLOORS[9]) level = 10 + Math.floor((points - FLOORS[9]) / STEP_ABOVE_10);
  else level = FLOORS.filter((f) => f <= points).length;
  const floor = floorOf(level);
  const next = floorOf(level + 1);
  return { level, floor, next, into: points - floor, span: next - floor };
}
