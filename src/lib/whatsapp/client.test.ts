import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  sanitizePhone,
  getWhatsAppConfig,
  sendWhatsAppText,
  sendWhatsAppTemplate,
  createWhatsAppTemplate,
  listWhatsAppTemplates,
  invalidateWhatsAppCache,
} from "./client";

describe("whatsapp client", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    invalidateWhatsAppCache();
    process.env.WHATSAPP_ACCESS_TOKEN = "test_token";
    process.env.WHATSAPP_PHONE_NUMBER_ID = "1298109926710710";
    process.env.WHATSAPP_BUSINESS_ACCOUNT_ID = "2197739044402624";
  });


  describe("sanitizePhone", () => {
    it("formats 10-digit Indian numbers with 91 prefix", () => {
      expect(sanitizePhone("9876543210")).toBe("919876543210");
      expect(sanitizePhone("+91 98765-43210")).toBe("919876543210");
    });

    it("leaves full international numbers intact", () => {
      expect(sanitizePhone("+1 555-149-7566")).toBe("15551497566");
      expect(sanitizePhone("919876543210")).toBe("919876543210");
    });
  });

  describe("getWhatsAppConfig", () => {
    it("reads env variables properly", () => {
      const config = getWhatsAppConfig();
      expect(typeof config.token).toBe("string");
      expect(typeof config.phoneNumberId).toBe("string");
      expect(typeof config.wabaId).toBe("string");
    });
  });

  describe("sendWhatsAppText", () => {
    it("calls Meta graph api when credentials are present", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ messages: [{ id: "wamid.HBgL" }] }),
      });
      vi.stubGlobal("fetch", mockFetch);

      const res = await sendWhatsAppText("+91 9876543210", "Hello creator");
      expect(res.success).toBe(true);
      expect(res.messageId).toBe("wamid.HBgL");
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it("returns error message when fetch fails", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        json: async () => ({ error: { message: "Recipient number not allowed in Sandbox" } }),
      });
      vi.stubGlobal("fetch", mockFetch);

      const res = await sendWhatsAppText("9999999999", "Test");
      expect(res.success).toBe(false);
      expect(res.error).toContain("Recipient number not allowed");
    });

    it("sends template message with body parameters", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ messages: [{ id: "wamid.TPL1" }] }),
      });
      vi.stubGlobal("fetch", mockFetch);

      const res = await sendWhatsAppTemplate("+91 9876543210", "order_confirmed", "en_US", ["Rahul", "₹4,999"]);
      expect(res.success).toBe(true);
      expect(res.messageId).toBe("wamid.TPL1");

      const callArgs = mockFetch.mock.calls[0];
      const sentBody = JSON.parse(callArgs[1].body);
      expect(sentBody.type).toBe("template");
      expect(sentBody.template.name).toBe("order_confirmed");
      expect(sentBody.template.components[0].parameters[0].text).toBe("Rahul");
    });
  });


  describe("createWhatsAppTemplate", () => {
    it("submits template payload with example variables", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ id: "12345678", status: "PENDING" }),
      });
      vi.stubGlobal("fetch", mockFetch);

      const res = await createWhatsAppTemplate({
        name: "Test Order Confirmation",
        category: "UTILITY",
        bodyText: "Hi {{1}}, order {{2}} confirmed",
        sampleValues: ["Rahul", "Course 1"],
      });

      expect(res.success).toBe(true);
      expect(res.templateId).toBe("12345678");
      expect(res.status).toBe("PENDING");

      const callArgs = mockFetch.mock.calls[0];
      const sentBody = JSON.parse(callArgs[1].body);
      expect(sentBody.name).toBe("test_order_confirmation");
      expect(sentBody.category).toBe("UTILITY");
      expect(sentBody.components[0].example.body_text[0]).toEqual(["Rahul", "Course 1"]);
    });
  });

  describe("listWhatsAppTemplates", () => {
    it("fetches template list from WABA endpoint", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          data: [{ id: "tpl_1", name: "hello_world", status: "APPROVED" }],
        }),
      });
      vi.stubGlobal("fetch", mockFetch);

      const res = await listWhatsAppTemplates();
      expect(res.templates).toHaveLength(1);
      expect(res.templates[0].name).toBe("hello_world");
    });
  });
});
