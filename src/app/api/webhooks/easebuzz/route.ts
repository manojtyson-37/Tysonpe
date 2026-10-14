import { AppError, handleEasebuzzCallback } from "@/lib/orders";
import { readCallbackFields } from "@/lib/payments/callback-fields";

export const runtime = "nodejs";

/** Server-to-server confirmation, so a buyer who closes the tab after paying is still enrolled. */
export async function POST(req: Request) {
  try {
    return Response.json(await handleEasebuzzCallback(await readCallbackFields(req)));
  } catch (e) {
    if (e instanceof AppError) {
      // 4xx tells the gateway not to retry bad input; 503 (not configured) and unexpected errors are retried.
      const status = e.code === "bad_signature" || e.code === "invalid_payload" ? 400 : e.code === "not_found" ? 404 : e.code === "provider_mismatch" ? 503 : 500;
      return Response.json({ error: e.code }, { status });
    }
    console.error("easebuzz webhook error", e);
    return Response.json({ error: "internal" }, { status: 500 });
  }
}
