import { NextRequest, NextResponse } from "next/server";
import {
  findCreatorByInboundToken,
  processInboundWebhook,
} from "@/lib/inbound-webhooks/service";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const match = await findCreatorByInboundToken(token);

  if (!match) {
    return NextResponse.json(
      { ok: false, error: "Endpoint not found" },
      { status: 404 }
    );
  }

  return NextResponse.json({
    ok: true,
    service: "Tysonpe Inbound Webhook Relay",
    endpointName: match.endpoint.name,
    creator: match.creatorName,
    partner: match.endpoint.partner,
    status: "active",
  });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const match = await findCreatorByInboundToken(token);

  if (!match) {
    return NextResponse.json(
      { ok: false, error: "Inbound webhook endpoint not found or disabled" },
      { status: 404 }
    );
  }

  const { creatorId, endpoint } = match;

  // Optional Secret Validation
  if (endpoint.secret) {
    const headerSecret =
      req.headers.get("x-webhook-secret") ||
      req.headers.get("x-tysonpe-secret") ||
      req.headers.get("x-api-key") ||
      req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");

    const urlSecret = req.nextUrl.searchParams.get("secret");

    if (headerSecret !== endpoint.secret && urlSecret !== endpoint.secret) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized: Invalid webhook secret token" },
        { status: 401 }
      );
    }
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON payload" },
      { status: 400 }
    );
  }

  const result = await processInboundWebhook(creatorId, endpoint.id, body);

  if (!result.ok) {
    return NextResponse.json(
      {
        ok: false,
        order_id: result.orderId,
        error: result.error || "Failed to automate payment record",
      },
      { status: 500 }
    );
  }

  return NextResponse.json(
    {
      ok: true,
      event_id: body.event_id || body.id,
      order_id: result.orderId,
      invoice_no: result.invoiceNo,
      status: "processed",
      amount_paise: result.amountPaise,
      customer_name: result.customerName,
      customer_email: result.customerEmail,
    },
    { status: 200 }
  );
}
