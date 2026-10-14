import { z } from "zod";

/** Rupee string ("499", "499.50", "") -> integer paise. Throws via zod on bad input. */
export const rupeesToPaise = z
  .string()
  .trim()
  .regex(/^\d{1,7}(\.\d{1,2})?$/, "Enter an amount like 499 or 499.50")
  .transform((v) => Math.round(parseFloat(v) * 100));

/** http(s) only: blocks javascript:, data:, file: etc. Empty string allowed. */
export const httpUrl = z
  .string()
  .trim()
  .max(2000)
  .refine((v) => {
    if (v === "") return true;
    try {
      const u = new URL(v);
      return u.protocol === "https:" || u.protocol === "http:";
    } catch {
      return false;
    }
  }, "Enter a valid http(s) link");

export const PRODUCT_TYPES = ["course", "membership", "webinar", "download", "consultation"] as const;
export const GST_RATES = [0, 5, 12, 18, 28] as const;
export const CONTENT_KINDS = ["video", "pdf", "text", "link"] as const;

/** YouTube/Vimeo watch URL -> embeddable URL, else null. IDs are charset-checked before reaching an iframe src. */
export function toEmbedUrl(url: string): string | null {
  const ytId = /^[\w-]{5,20}$/;
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, "");
    const yt = (id: string | null | undefined) =>
      id && ytId.test(id) ? `https://www.youtube-nocookie.com/embed/${id}` : null;
    if (host === "youtu.be") return yt(u.pathname.slice(1));
    if (host === "youtube.com") return yt(u.searchParams.get("v"));
    if (host === "vimeo.com" && /^\/\d+$/.test(u.pathname)) return `https://player.vimeo.com/video${u.pathname}`;
  } catch {}
  return null;
}
