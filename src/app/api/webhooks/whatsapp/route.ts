import { verifyWebhookChallenge, processWhatsAppWebhook } from "@/lib/whatsapp/webhook";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const mode = url.searchParams.get("hub.mode");
  const verifyToken = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");

  const verification = verifyWebhookChallenge({ mode, verifyToken, challenge });

  if (verification.isValid && verification.challenge) {
    return new Response(verification.challenge, {
      status: 200,
      headers: { "Content-Type": "text/plain" },
    });
  }

  return Response.json({ error: "Invalid verification token" }, { status: 403 });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const result = await processWhatsAppWebhook(body);
    return Response.json(result, { status: 200 });
  } catch (error) {
    console.error("[WhatsApp Webhook] Error processing event:", error);
    return Response.json({ error: "Internal error" }, { status: 500 });
  }
}
