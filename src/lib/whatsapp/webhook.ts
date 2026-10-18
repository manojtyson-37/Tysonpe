import { db } from "@/lib/db";
import { sendWhatsAppText, sanitizePhone } from "./client";

export interface MetaWebhookPayload {
  object?: string;
  entry?: Array<{
    id?: string;
    changes?: Array<{
      field?: string;
      value?: {
        messaging_product?: string;
        metadata?: {
          phone_number_id?: string;
          display_phone_number?: string;
        };
        contacts?: Array<{
          profile?: { name?: string };
          wa_id?: string;
        }>;
        messages?: Array<{
          from: string;
          id: string;
          timestamp: string;
          type: string;
          text?: { body: string };
        }>;
      };
    }>;
  }>;
}

export function verifyWebhookChallenge(params: {
  mode: string | null;
  verifyToken: string | null;
  challenge: string | null;
  expectedToken?: string;
}): { isValid: boolean; challenge?: string } {
  const secret = params.expectedToken || process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || "tysonpe_wa_verify_token";

  if (params.mode === "subscribe" && params.verifyToken === secret && params.challenge) {
    return { isValid: true, challenge: params.challenge };
  }

  return { isValid: false };
}

export async function processWhatsAppWebhook(payload: MetaWebhookPayload) {
  if (payload.object !== "whatsapp_business_account" && !payload.entry) {
    return { processed: false, reason: "not_whatsapp_event" };
  }

  const entries = payload.entry || [];
  let processedCount = 0;

  for (const entry of entries) {
    for (const change of entry.changes || []) {
      if (change.field !== "messages" || !change.value?.messages) continue;

      const contact = change.value.contacts?.[0];
      const customerName = contact?.profile?.name || null;


      for (const msg of change.value.messages) {
        if (msg.type !== "text" || !msg.text?.body) continue;

        const customerPhone = sanitizePhone(msg.from);
        const msgText = msg.text.body.trim();
        const waMessageId = msg.id;

        // Resolve creator: default to the demo handle or first creator
        const defaultHandle = process.env.NEXT_PUBLIC_DEMO_HANDLE || "asha-rao";
        let creator = await db.creator.findFirst({
          where: { handle: defaultHandle },
          include: { products: { where: { status: "published" }, take: 3 } },
        });

        if (!creator) {
          creator = await db.creator.findFirst({
            include: { products: { where: { status: "published" }, take: 3 } },
          });
        }

        if (!creator) continue;


        // Upsert Lead
        const lead = await db.lead.upsert({
          where: {
            creatorId_phone: {
              creatorId: creator.id,
              phone: customerPhone,
            },
          },
          update: {
            name: customerName || undefined,
            lastInboundAt: new Date(),
            status: "INQUIRY",
          },
          create: {
            creatorId: creator.id,
            phone: customerPhone,
            name: customerName,
            status: "INQUIRY",
            lastInboundAt: new Date(),
          },
        });

        // Store Inbound Message
        await db.whatsAppMessage.create({
          data: {
            leadId: lead.id,
            creatorId: creator.id,
            direction: "INBOUND",
            sender: "CUSTOMER",
            body: msgText,
            status: "RECEIVED",
            waMessageId,
          },
        });

        processedCount++;

        // Auto-reply if bot is not paused
        if (!lead.botPaused) {
          const replyText = generateBotReply(msgText, creator.displayName, creator.products);

          // Send back on WhatsApp
          const sendRes = await sendWhatsAppText(customerPhone, replyText);

          // Store Outbound Bot Message
          await db.whatsAppMessage.create({
            data: {
              leadId: lead.id,
              creatorId: creator.id,
              direction: "OUTBOUND",
              sender: "BOT",
              body: replyText,
              status: sendRes.success ? "SENT" : "FAILED",
              waMessageId: sendRes.messageId || null,
            },
          });
        }
      }
    }
  }

  return { processed: true, count: processedCount };
}

function generateBotReply(
  inboundText: string,
  creatorName: string,
  products: Array<{ title: string; pricePaise: number }>
): string {
  const lower = inboundText.toLowerCase();

  if (lower.includes("price") || lower.includes("cost") || lower.includes("fee") || lower.includes("kitna")) {
    const productList = products
      .map((p) => `• *${p.title}*: ₹${Math.round(p.pricePaise / 100).toLocaleString("en-IN")}`)
      .join("\n");

    return `Hi! Here are ${creatorName}'s available programs:\n\n${productList}\n\nWould you like a direct checkout link or do you have any specific curriculum questions?`;
  }

  if (lower.includes("human") || lower.includes("agent") || lower.includes("call") || lower.includes("urgent")) {
    return `Got it! I've flagged this for ${creatorName}'s team. An agent will take over this chat shortly.`;
  }

  return `Hi! Thanks for reaching out to ${creatorName}. How can we help you today with your learning or courses?`;
}
