import { describe, expect, it, vi, beforeEach } from "vitest";
import { saveCreatorGatewaysAction, testGatewayConnectionAction } from "./creator-gateways";

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/auth/session", () => ({
  requireCreator: vi.fn().mockResolvedValue({
    user: { id: "user_test", email: "creator@test.com" },
    creator: { id: "creator_test", handle: "asharao", planKey: "PRO" },
  }),
}));

vi.mock("@/lib/integrations/service", () => {
  let stored = {};
  return {
    getCreatorIntegrations: vi.fn().mockResolvedValue({ paymentGateways: {} }),
    saveCreatorIntegrations: vi.fn().mockImplementation((_id, val) => {
      stored = val;
      return Promise.resolve(val);
    }),
  };
});

describe("Creator Gateways Actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("saves sanitized gateway credentials with auto-generated basic auth header for Jodo", async () => {
    const res = await saveCreatorGatewaysAction({
      jodo: {
        enabled: true,
        baseUrl: "https://ext.devtest1.jodopay.com",
        apiKey: "81329eb5c322",
        apiSecret: "818a40d7-fc13-4480-9b7a-4fc6de2bd74a",
      },
      razorpay: {
        enabled: true,
        keyId: "rzp_test_12345678",
        keySecret: "secret_12345678",
      },
      easebuzz: {
        enabled: false,
        key: "EASEKEY123",
        salt: "EASESALT123",
        env: "test",
      },
    });

    expect(res.ok).toBe(true);
    expect(res.data?.jodo.enabled).toBe(true);
    expect(res.data?.jodo.authHeader).toContain("Basic ");
    expect(res.data?.razorpay.keyId).toBe("rzp_test_12345678");
    expect(res.data?.easebuzz.enabled).toBe(false);
  });

  it("validates Razorpay Key ID format correctly", async () => {
    const valid = await testGatewayConnectionAction("razorpay", {
      keyId: "rzp_test_1234567890",
      keySecret: "validsecret123",
    });
    expect(valid.ok).toBe(true);
    expect(valid.message).toContain("Test Sandbox");

    const invalid = await testGatewayConnectionAction("razorpay", {
      keyId: "invalid_key",
      keySecret: "secret",
    });
    expect(invalid.ok).toBe(false);
    expect(invalid.message).toContain("Invalid Key ID format");
  });

  it("validates Easebuzz key and salt presence", async () => {
    const valid = await testGatewayConnectionAction("easebuzz", {
      key: "MERCHANTKEY",
      salt: "MERCHANTSALT",
      env: "test",
    });
    expect(valid.ok).toBe(true);
    expect(valid.message).toContain("Easebuzz Test Sandbox merchant credentials validated");

    const invalid = await testGatewayConnectionAction("easebuzz", {
      key: "",
      salt: "",
    });
    expect(invalid.ok).toBe(false);
  });
});
