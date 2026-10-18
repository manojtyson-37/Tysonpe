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
    });
  });
});
