import { describe, expect, it } from "vitest";
import {
  DEFAULT_INTEGRATIONS_CONFIG,
  generateWebhookSignature,
} from "./service";

describe("integrations service", () => {
  describe("generateWebhookSignature", () => {
    it("generates a deterministic HMAC-SHA256 hex signature", () => {
      const payload = JSON.stringify({ event: "order.paid", amountPaise: 50000 });
      const secret = "whsec_test_secret_123456";

      const sig1 = generateWebhookSignature(payload, secret);
      const sig2 = generateWebhookSignature(payload, secret);

      expect(sig1).toBe(sig2);
      expect(sig1).toMatch(/^[a-f0-9]{64}$/);
    });

    it("produces different signatures for different secrets or payloads", () => {
      const payload = JSON.stringify({ event: "order.paid" });
      const sigA = generateWebhookSignature(payload, "secret_a");
      const sigB = generateWebhookSignature(payload, "secret_b");
      const sigC = generateWebhookSignature(JSON.stringify({ event: "lead.created" }), "secret_a");

      expect(sigA).not.toBe(sigB);
      expect(sigA).not.toBe(sigC);
    });
  });

  describe("DEFAULT_INTEGRATIONS_CONFIG", () => {
    it("provides sane default configuration for all channels", () => {
      expect(DEFAULT_INTEGRATIONS_CONFIG.webhooks).toEqual([]);
      expect(DEFAULT_INTEGRATIONS_CONFIG.tracking.enabled).toBe(true);
      expect(DEFAULT_INTEGRATIONS_CONFIG.liveClass.defaultProvider).toBe("zoom");
      expect(DEFAULT_INTEGRATIONS_CONFIG.emailMarketing.provider).toBe("none");
      expect(DEFAULT_INTEGRATIONS_CONFIG.telegram.autoInviteOnPurchase).toBe(false);
      expect(DEFAULT_INTEGRATIONS_CONFIG.googleSheets.sheetName).toBe("Tysonpe Orders");
      expect(DEFAULT_INTEGRATIONS_CONFIG.discord.autoNotifyOnPurchase).toBe(true);
      expect(DEFAULT_INTEGRATIONS_CONFIG.sms.senderId).toBe("TYSONP");
      expect(DEFAULT_INTEGRATIONS_CONFIG.customDomain.verified).toBe(false);
    });
  });

  describe("testGoogleSheetsSync", () => {
    it("rejects empty spreadsheet IDs", async () => {
      const { testGoogleSheetsSync } = await import("./service");
      const res = await testGoogleSheetsSync("");
      expect(res.success).toBe(false);
      expect(res.error).toContain("Google Spreadsheet ID");
    });

    it("simulates row append when spreadsheet ID is valid", async () => {
      const { testGoogleSheetsSync } = await import("./service");
      const res = await testGoogleSheetsSync("1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms");
      expect(res.success).toBe(true);
      expect(res.rowsAppended).toBe(1);
      expect(res.sampleRow?.length).toBeGreaterThan(5);
    });
  });

  describe("testSendSms", () => {
    it("enforces exact 6-character DLT sender IDs", async () => {
      const { testSendSms } = await import("./service");
      const badRes = await testSendSms("fast2sms", "TOOLONG123", "key");
      expect(badRes.success).toBe(false);
      expect(badRes.error).toContain("6-character");

      const goodRes = await testSendSms("fast2sms", "TYSONP", "key");
      expect(goodRes.success).toBe(true);
      expect(goodRes.previewText).toContain("[TYSONP]");
    });
  });

  describe("verifyCustomDomain", () => {
    it("rejects invalid domains missing dots", async () => {
      const { verifyCustomDomain } = await import("./service");
      const bad = await verifyCustomDomain("invalidlocalhost");
      expect(bad.verified).toBe(false);
      expect(bad.error).toContain("valid domain");
    });

    it("verifies clean subdomains and returns CNAME target", async () => {
      const { verifyCustomDomain } = await import("./service");
      const res = await verifyCustomDomain("https://learn.creator.com/");
      expect(res.verified).toBe(true);
      expect(res.sslActive).toBe(true);
      expect(res.dnsRecord?.target).toBe("cname.tysonpe.com");
      expect(res.dnsRecord?.host).toBe("learn.creator.com");
    });
  });
});
