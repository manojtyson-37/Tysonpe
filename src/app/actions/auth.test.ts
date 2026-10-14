import { beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/lib/db";
import { setPreferredGateway, signup } from "./auth";

const session = vi.hoisted(() => ({ user: null as { id: string } | null }));
vi.mock("@/lib/auth/session", () => ({
  getCurrentUser: async () => (session.user ? db.user.findUnique({ where: { id: session.user.id } }) : null),
  setSession: async (userId: string) => {
    session.user = { id: userId };
  },
  safeNext: (next: unknown, fallback: string) => (typeof next === "string" && next ? next : fallback),
}));

vi.mock("next/navigation", () => ({
  redirect: (to: string) => {
    throw new Error(`REDIRECT:${to}`);
  },
}));

vi.mock("next/headers", () => ({
  headers: async () => new Headers({ "x-forwarded-for": "127.0.0.1" }),
}));

let count = 0;
beforeEach(() => {
  count++;
  session.user = null;
});

describe("signup preferredGateway", () => {
  it("saves chosen preferredGateway on signup and redirects to /demo", async () => {
    const fd = new FormData();
    fd.set("name", "Test User");
    fd.set("email", `demo-gw-${count}-${Date.now()}@test.test`);
    fd.set("password", "valid-password-123");
    fd.set("role", "learner");
    fd.set("preferredGateway", "easebuzz");

    await expect(signup(undefined, fd)).rejects.toThrow("REDIRECT:/demo");
    expect(session.user).not.toBeNull();
    const created = await db.user.findUniqueOrThrow({ where: { id: session.user!.id } });
    expect(created.preferredGateway).toBe("easebuzz");
  });

  it("defaults preferredGateway to razorpay when omitted", async () => {
    const fd = new FormData();
    fd.set("name", "Test User");
    fd.set("email", `demo-gw-def-${count}-${Date.now()}@test.test`);
    fd.set("password", "valid-password-123");
    fd.set("role", "learner");

    await expect(signup(undefined, fd)).rejects.toThrow("REDIRECT:/demo");
    const created = await db.user.findUniqueOrThrow({ where: { id: session.user!.id } });
    expect(created.preferredGateway).toBe("razorpay");
  });

  it("setPreferredGateway updates user preference and redirects to /demo", async () => {
    const user = await db.user.create({
      data: {
        email: `spg-${count}-${Date.now()}@test.test`,
        name: "Gateway Switcher",
        passwordHash: "hash",
        preferredGateway: "razorpay",
      },
    });
    session.user = { id: user.id };

    await expect(setPreferredGateway("easebuzz")).rejects.toThrow("REDIRECT:/demo");
    const updated = await db.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(updated.preferredGateway).toBe("easebuzz");
  });
});
