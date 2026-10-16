import { isValidElement, type ReactElement, type ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

const session = vi.hoisted(() => ({ user: null as null | { id: string; name: string; creator: unknown } }));

vi.mock("next/navigation", () => ({
  redirect: (to: string) => {
    throw new Error(`REDIRECT ${to}`);
  },
  usePathname: () => "/",
}));
vi.mock("@/app/actions/auth", () => ({
  login: async () => ({}),
  signup: async () => ({}),
  becomeCreator: async () => ({}),
  logout: async () => {},
}));
vi.mock("@/lib/auth/session", async (importActual) => ({
  ...(await importActual<typeof import("@/lib/auth/session")>()),
  getCurrentUser: async () => session.user,
  requireUser: async () => ({ id: "u1", name: "Asha Rao", creator: null }),
}));
vi.mock("@/components/SiteNav", () => ({ SiteNav: () => <nav data-testid="site-nav" /> }));

import { AuthShell } from "@/components/AuthShell";
import LoginPage from "./(site)/login/page";
import SignupPage from "./(site)/signup/page";
import Onboarding from "./dashboard/onboarding/page";

const params = (sp: Record<string, string> = {}) => ({ searchParams: Promise.resolve(sp) }) as never;

function elementsOfType(node: ReactNode, type: unknown, out: ReactElement[] = []): ReactElement[] {
  if (Array.isArray(node)) node.forEach((n) => elementsOfType(n, type, out));
  else if (isValidElement(node)) {
    if (node.type === type) out.push(node);
    elementsOfType((node.props as { children?: ReactNode }).children, type, out);
  }
  return out;
}

const html = (el: ReactNode) => renderToStaticMarkup(<>{el}</>);

describe("the auth pages render through AuthShell", () => {
  it("log in: heading, subtitle, form and the sign-up footer link", async () => {
    const tree = await LoginPage(params());
    expect(elementsOfType(tree, AuthShell)).toHaveLength(1);
    const out = html(tree);
    expect(out).toMatch(/<h1[^>]*>Welcome back<\/h1>/);
    expect(out).toContain("Log in to your library or dashboard.");
    expect(out).toContain('<form');
    expect(out).toMatch(/New here\? <a [^>]*href="\/signup"[^>]*>Create an account<\/a>/);
  });

  it("log in: the footer link carries a safe next through to sign up", async () => {
    const out = html(await LoginPage(params({ next: "/library/p1" })));
    expect(out).toContain('href="/signup?next=%2Flibrary%2Fp1"');
  });

  it("sign up: learner heading by default, and for an unknown role", async () => {
    for (const sp of [{}, { role: "admin" }, { next: "/library" }] as Record<string, string>[]) {
      const out = html(await SignupPage(params(sp)));
      expect(out).toMatch(/<h1[^>]*>Create your account<\/h1>/);
    }
  });

  it("sign up: role=creator opens a store, and the footer links to log in", async () => {
    const tree = await SignupPage(params({ role: "creator" }));
    expect(elementsOfType(tree, AuthShell)).toHaveLength(1);
    const out = html(tree);
    expect(out).toMatch(/<h1[^>]*>Open your store<\/h1>/);
    expect(out).toContain("Free to start. No card needed.");
    expect(out).toMatch(/Already have an account\? <a [^>]*href="\/login"[^>]*>Log in<\/a>/);
  });

  it("log in and sign up still redirect a signed-in user", async () => {
    session.user = { id: "u1", name: "Asha", creator: null };
    await expect(LoginPage(params({ next: "/library/p1" }))).rejects.toThrow("REDIRECT /library/p1");
    await expect(SignupPage(params())).rejects.toThrow("REDIRECT /library");
    session.user = null;
  });

  it("onboarding: AuthShell inside a <main>, public nav kept, no footer line", async () => {
    const tree = await Onboarding();
    expect(elementsOfType(tree, AuthShell)).toHaveLength(1);
    const out = html(tree);
    expect(out).toContain('data-testid="site-nav"');
    expect(out).toMatch(/<main id="main"[^>]*>/);
    expect(out).toMatch(/<h1[^>]*>Open your store<\/h1>/);
    expect(out).toContain("Pick the name and link buyers will see.");
    expect(out).toContain('name="handle"');
    expect(out).not.toContain("text-center text-sm text-muted");
  });
});
