import { AppError, handleEasebuzzCallback } from "@/lib/orders";
import { readCallbackFields } from "@/lib/payments/callback-fields";

export const runtime = "nodejs";

const text = (body: string, status: number) => new Response(body, { status, headers: { "content-type": "text/plain; charset=utf-8" } });

/** surl/furl target: Easebuzz POSTs the buyer's browser here; we verify, then 303 to a normal page. */
export async function POST(req: Request) {
  const base = process.env.NEXT_PUBLIC_APP_URL;
  if (!base) return text("Payments are not configured.", 500);
  const fields = await readCallbackFields(req);
  try {
    const { orderId, paid, needsReview } = await handleEasebuzzCallback(fields, "return");
    if (needsReview && !paid)
      return text(`We received your payment but could not match it to your order automatically. Please contact support and quote reference ${fields.txnid ?? "unknown"}.`, 409);
    const to = paid ? `/checkout/success/${orderId}` : `/checkout/pay/${orderId}?failed=1`;
    return Response.redirect(new URL(to, base), 303);
  } catch (e) {
    if (e instanceof AppError) {
      // Unverifiable or unknown: never reveal why, and never mark anything paid.
      if (e.code === "bad_signature" || e.code === "invalid_payload") return text("Payment could not be verified. Please contact support if money was debited.", 400);
      if (e.code === "not_found") return text("Order not found.", 404);
      return text("Payments are temporarily unavailable.", 503);
    }
    console.error("easebuzz return error", e);
    return text("Something went wrong.", 500);
  }
}
