// Pure helpers for the two simulated gateway screens (RazorpayDemoModal, EasebuzzHostedPage). They live here and not in
// the "use client" files so a server file can import them and tests can pin them without a DOM.

/** The 15-minute window the Easebuzz hosted page shows. */
export const EASEBUZZ_WINDOW_SECONDS = 15 * 60;

/** "MM:SS" for the countdown. Negative and fractional input is clamped to whole seconds >= 0. */
export function formatCountdown(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

/**
 * What the screen-reader-only status line says for a given time left. It is empty above five minutes and changes
 * value only when the clock crosses 5:00, 1:00 and 0:00, so a live region that reads it speaks three times in the whole
 * window, never once a second.
 */
export function countdownNotice(secondsLeft: number): string {
  if (secondsLeft <= 0) return "Time is up. This payment page has expired.";
  if (secondsLeft <= 60) return "1 minute left on this payment page.";
  if (secondsLeft <= 300) return "5 minutes left on this payment page.";
  return "";
}

/** The clock turns to the error colour in the last two minutes. */
export function isCountdownUrgent(secondsLeft: number): boolean {
  return secondsLeft < 120;
}

/** Escape and a click outside must not dismiss the Razorpay modal while the simulated payment is being settled. */
export function canDismissRazorpay(status: "idle" | "processing" | "success" | "failed"): boolean {
  return status !== "processing";
}
