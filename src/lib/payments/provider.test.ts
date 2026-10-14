import { afterEach, describe, expect, it, vi } from "vitest";
import { getProvider } from "./index";
import { hmacHex } from "./signature";

describe("getProvider", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("uses mock only when PAYMENTS_MODE=mock is explicit", () => {
    vi.stubEnv("PAYMENTS_MODE", "mock");
    expect(getProvider().name).toBe("mock");
  });
  it("PAYMENTS_MODE=demo forces the simulated gateway even when real keys are configured", () => {
    vi.stubEnv("PAYMENTS_MODE", "demo");
    vi.stubEnv("RAZORPAY_KEY_ID", "rzp_test_abc");
    vi.stubEnv("RAZORPAY_KEY_SECRET", "s");
    vi.stubEnv("EASEBUZZ_KEY", "k");
    vi.stubEnv("EASEBUZZ_SALT", "s");
    expect(getProvider().name).toBe("mock");
  });
  it("demo mode is refused in production", () => {
    vi.stubEnv("PAYMENTS_MODE", "demo");
    vi.stubEnv("NODE_ENV", "production");
    expect(() => getProvider()).toThrow(/production/);
  });
  it("without keys and without explicit mock mode it refuses to start", () => {
    vi.stubEnv("PAYMENTS_MODE", "");
    expect(() => getProvider()).toThrow(/PAYMENTS_MODE|RAZORPAY/);
  });
  it("mock is refused in production even if requested", () => {
    vi.stubEnv("PAYMENTS_MODE", "mock");
    vi.stubEnv("NODE_ENV", "production");
    expect(() => getProvider()).toThrow(/production/);
  });
  it("uses Razorpay when keys are present, wiring key vs webhook secrets correctly", () => {
    vi.stubEnv("RAZORPAY_KEY_ID", "rzp_test_abc");
    vi.stubEnv("RAZORPAY_KEY_SECRET", "key_secret");
    vi.stubEnv("RAZORPAY_WEBHOOK_SECRET", "hook_secret");
    const p = getProvider();
    expect(p.name).toBe("razorpay");
    expect(p.publicKey).toBe("rzp_test_abc");
    // payment signatures use the KEY secret, webhook signatures use the WEBHOOK secret
    expect(p.verifyPayment("o", "p", hmacHex("key_secret", "o|p"))).toBe(true);
    expect(p.verifyPayment("o", "p", hmacHex("hook_secret", "o|p"))).toBe(false);
    expect(p.verifyWebhook("{}", hmacHex("hook_secret", "{}"))).toBe(true);
    expect(p.verifyWebhook("{}", hmacHex("key_secret", "{}"))).toBe(false);
  });
});
