import { AppError, handleWebhook } from "@/lib/orders";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const raw = await req.text(); // signature is over the exact raw body
  try {
    const result = await handleWebhook(
      raw,
      req.headers.get("x-razorpay-signature"),
      req.headers.get("x-razorpay-event-id"),
    );
    return Response.json(result);
  } catch (e) {
    if (e instanceof AppError) {
      const status = e.code === "bad_signature" ? 400 : e.code === "invalid_payload" ? 400 : 500;
      return Response.json({ error: e.code }, { status });
    }
    console.error("webhook error", e);
    return Response.json({ error: "internal" }, { status: 500 });
  }
}
