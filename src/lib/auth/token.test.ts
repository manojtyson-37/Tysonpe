import { SignJWT } from "jose";
import { afterEach, describe, expect, it, vi } from "vitest";
import { signSessionToken, verifySessionToken } from "./token";

describe("session token", () => {
  it("round-trips a user id", async () => {
    const t = await signSessionToken("user_1");
    expect(await verifySessionToken(t)).toBe("user_1");
  });
  it("rejects tampered tokens", async () => {
    const t = await signSessionToken("user_1");
    const bad = t.slice(0, -2) + (t.endsWith("aa") ? "bb" : "aa");
    expect(await verifySessionToken(bad)).toBeNull();
  });
  it("rejects garbage and empty", async () => {
    expect(await verifySessionToken("nope")).toBeNull();
    expect(await verifySessionToken("")).toBeNull();
  });
  it("rejects tokens signed with another secret", async () => {
    const t = await new SignJWT({}).setProtectedHeader({ alg: "HS256" }).setSubject("u")
      .setExpirationTime("1h").sign(new TextEncoder().encode("a-different-secret-a-different-secret"));
    expect(await verifySessionToken(t)).toBeNull();
  });
  it("rejects expired tokens", async () => {
    const t = await new SignJWT({}).setProtectedHeader({ alg: "HS256" }).setSubject("u")
      .setExpirationTime(Math.floor(Date.now() / 1000) - 10)
      .sign(new TextEncoder().encode(process.env.SESSION_SECRET!));
    expect(await verifySessionToken(t)).toBeNull();
  });
});

describe("production secret guard", () => {
  afterEach(() => vi.unstubAllEnvs());
  it.each([
    "dev-only-secret-change-me-0123456789abcdef",
    "generate-a-random-string-of-32+-chars",
    "short",
  ])("refuses %j in production", async (secret) => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("SESSION_SECRET", secret);
    await expect(signSessionToken("u")).rejects.toThrow(/SESSION_SECRET/);
  });
  it("accepts a real random secret in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("SESSION_SECRET", "k9Qz3vT7xL1mW8pR5yN2cB6dF4hJ0aSe");
    expect(await verifySessionToken(await signSessionToken("u"))).toBe("u");
  });
});
