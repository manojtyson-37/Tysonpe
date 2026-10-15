import { afterEach, describe, expect, it, vi } from "vitest";
import { demoLoginPassword } from "@/lib/demo";
import { simulatedPaymentsAllowed } from "./demo-mode";
import { MockProvider } from "./mock";

afterEach(() => vi.unstubAllEnvs());

describe("simulated payments in production", () => {
  it("are refused in production by default", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("DEMO_DEPLOYMENT", "");
    expect(simulatedPaymentsAllowed()).toBe(false);
    expect(() => new MockProvider()).toThrow(/disabled in production/);
  });

  it("are refused when DEMO_DEPLOYMENT is anything but 1", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("DEMO_DEPLOYMENT", "true");
    expect(simulatedPaymentsAllowed()).toBe(false);
  });

  it("are allowed on an explicit demo deployment", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("DEMO_DEPLOYMENT", "1");
    expect(simulatedPaymentsAllowed()).toBe(true);
    expect(() => new MockProvider()).not.toThrow();
  });

  it("are allowed outside production", () => {
    vi.stubEnv("NODE_ENV", "development");
    expect(simulatedPaymentsAllowed()).toBe(true);
  });

  it("fail closed when live gateway keys are configured, even with DEMO_DEPLOYMENT=1", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("DEMO_DEPLOYMENT", "1");
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubEnv("RAZORPAY_KEY_ID", "rzp_live_dummy");
    expect(simulatedPaymentsAllowed()).toBe(false);
    vi.stubEnv("RAZORPAY_KEY_ID", "");
    vi.stubEnv("EASEBUZZ_ENV", "prod");
    expect(simulatedPaymentsAllowed()).toBe(false);
    err.mockRestore();
  });
});

describe("demoLoginPassword", () => {
  it("is null in production without DEMO_DEPLOYMENT, so no demo credentials reach the page", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("DEMO_DEPLOYMENT", "");
    expect(demoLoginPassword()).toBeNull();
  });

  it("is the configured password on a demo deployment and defaults outside production", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("DEMO_DEPLOYMENT", "1");
    vi.stubEnv("DEMO_PASSWORD", "custom-pass-123");
    expect(demoLoginPassword()).toBe("custom-pass-123");
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("DEMO_PASSWORD", "");
    expect(demoLoginPassword()).toBe("tysonpe-demo-1"); // empty override falls back to the default
  });
});
