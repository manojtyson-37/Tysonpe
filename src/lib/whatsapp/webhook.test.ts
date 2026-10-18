import { describe, it, expect, vi, beforeEach } from "vitest";
import { verifyWebhookChallenge, processWhatsAppWebhook } from "./webhook";
import { db } from "@/lib/db";

vi.mock("@/lib/whatsapp/client", () => ({
  sendWhatsAppText: vi.fn().mockResolvedValue({ success: true, messageId: "wamid_mock_test" }),
  sanitizePhone: vi.fn((p) => p.replace(/\D/g, "")),
}));

describe("WhatsApp Webhook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("verifyWebhookChallenge", () => {
    it("returns challenge when token matches", () => {
      const res = verifyWebhookChallenge({
        mode: "subscribe",
        verifyToken: "secret_123",
        challenge: "test_challenge_code",
        expectedToken: "secret_123",
      });

      expect(res.isValid).toBe(true);
      expect(res.challenge).toBe("test_challenge_code");
    });

    it("rejects invalid token", () => {
      const res = verifyWebhookChallenge({
        mode: "subscribe",
        verifyToken: "wrong_token",
        challenge: "test_challenge_code",
        expectedToken: "secret_123",
      });

      expect(res.isValid).toBe(false);
    });
  });

  describe("processWhatsAppWebhook", () => {
    it("ignores non-whatsapp payloads", async () => {
      const res = await processWhatsAppWebhook({});
      expect(res.processed).toBe(false);
    });

    it("processes text messages and creates Lead and Messages", async () => {
      // Find or seed a test creator
      const creator = await db.creator.findFirst();
      if (!creator) return;

      const payload = {
        object: "whatsapp_business_account",
        entry: [
          {
            id: "2197739044402624",
            changes: [
              {
                field: "messages",
                value: {
                  messaging_product: "whatsapp",
                  contacts: [{ profile: { name: "Aarav Gupta" }, wa_id: "919999988888" }],
                  messages: [
                    {
                      from: "919999988888",
                      id: "wamid.inbound_1",
                      timestamp: "1710000000",
                      type: "text",
                      text: { body: "What is the fee for the course?" },
                    },
                  ],
                },
              },
            ],
          },
        ],
      };

      const res = await processWhatsAppWebhook(payload);
      expect(res.processed).toBe(true);
      expect(res.count).toBe(1);

      // Verify lead was created in db
      const lead = await db.lead.findFirst({
        where: { phone: "919999988888" },
        include: { messages: true },
      });

      expect(lead).not.toBeNull();
      expect(lead?.name).toBe("Aarav Gupta");
      expect(lead?.messages.length).toBeGreaterThanOrEqual(1);
    });
  });
});
