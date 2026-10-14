/** Only allow same-site relative redirects (blocks //host, /\host, absolute URLs, javascript:). */
export function safeNext(next: unknown, fallback: string): string {
  if (typeof next !== "string") return fallback;
  if (!next.startsWith("/") || next.startsWith("//") || next.includes("\\")) return fallback;
  if (/[\u0000-\u001f]/.test(next)) return fallback; // control chars can be stripped by browsers
  return next;
}
