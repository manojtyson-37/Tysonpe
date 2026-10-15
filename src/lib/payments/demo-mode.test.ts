import { afterEach, describe, expect, it, vi } from "vitest";
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
});
