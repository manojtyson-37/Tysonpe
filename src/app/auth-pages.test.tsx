import { isValidElement, type ReactElement, type ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

const demo = vi.hoisted(() => ({ password: null as null | string }));
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
vi.mock("@/lib/demo", () => ({ demoLoginPassword: () => demo.password, DEMO_HANDLE: "" }));
vi.mock("@/components/SiteNav", () => ({ SiteNav: () => <nav data-testid="site-nav" /> }));

import { AuthShell } from "@/components/AuthShell";
import { LoginForm } from "@/components/LoginForm";
import { SignupForm } from "@/components/SignupForm";
import LoginPage from "./(site)/login/page";
import SignupPage, { generateMetadata as signupMetadata } from "./(site)/signup/page";
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

  // The h1 is only the label; the field the form acts on is the prop. Pin it for every variant.
  it("sign up: SignupForm receives initialRole creator for role=creator, learner otherwise", async () => {
    const initialRole = async (sp: Record<string, string>) => {
      const forms = elementsOfType(await SignupPage(params(sp)), SignupForm);
      expect(forms).toHaveLength(1);
      return (forms[0].props as { initialRole: string }).initialRole;
    };
    expect(await initialRole({ role: "creator" })).toBe("creator");
    expect(await initialRole({})).toBe("learner");
    expect(await initialRole({ role: "admin" })).toBe("learner");
    expect(await initialRole({ next: "/library" })).toBe("learner");
  });

  it("sign up: the tab title agrees with the heading", async () => {
    const title = async (sp: Record<string, string>) => ((await signupMetadata(params(sp))) as { title: string }).title;
    expect(await title({ role: "creator" })).toBe("Open your store");
    expect(await title({})).toBe("Create your account");
    expect(await title({ role: "admin" })).toBe("Create your account");
  });

  it("sign up: the log in footer link carries a safe next and drops an unsafe one", async () => {
    const link = (out: string) => /Already have an account\? <a [^>]*href="([^"]*)"/.exec(out)?.[1];
    expect(link(html(await SignupPage(params())))).toBe("/login");
    expect(link(html(await SignupPage(params({ next: "/library/p1" }))))).toBe("/login?next=%2Flibrary%2Fp1");
    expect(link(html(await SignupPage(params({ next: "https://evil.example" }))))).toBe("/login");
    expect(link(html(await SignupPage(params({ next: "//evil.example" }))))).toBe("/login");
  });

  it("sign up: role=creator opens a store, and the footer links to log in", async () => {
    const tree = await SignupPage(params({ role: "creator" }));
    expect(elementsOfType(tree, AuthShell)).toHaveLength(1);
    const out = html(tree);
    expect(out).toMatch(/<h1[^>]*>Open your store<\/h1>/);
    expect(out).toContain("Free to start. No card needed.");
    expect(out).toMatch(/Already have an account\? <a [^>]*href="\/login"[^>]*>Log in<\/a>/);
  });

  // The forms render fields only: the heading, subtitle, card and footer come from AuthShell, once.
  it("sign up and log in each render one heading, one card and no second footer", async () => {
    const signup = html(await SignupPage(params({ role: "creator" })));
    expect(signup.match(/<h1\b/g)).toHaveLength(1);
    expect(signup.match(/Already have an account/g)).toHaveLength(1);
    expect(signup).not.toMatch(/<h[2-6]\b/);
    const login = html(await LoginPage(params()));
    expect(login.match(/<h1\b/g)).toHaveLength(1);
    expect(login.match(/New here\?/g)).toHaveLength(1);
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

describe("the pages hand the forms what they act on (mutation survivors M80 to M83, M87, M91)", () => {
  const props = async <T,>(page: Promise<ReactNode>, form: unknown) => {
    const found = elementsOfType(await page, form);
    expect(found).toHaveLength(1);
    return found[0].props as T;
  };

  it("sign up passes a safe next to SignupForm, and drops an unsafe one", async () => {
    expect((await props<{ next?: string }>(SignupPage(params({ next: "/library/p1" })), SignupForm)).next).toBe("/library/p1");
    expect((await props<{ next?: string }>(SignupPage(params()), SignupForm)).next).toBeUndefined();
    expect((await props<{ next?: string }>(SignupPage(params({ next: "https://evil.example" })), SignupForm)).next).toBeUndefined();
  });

  it("log in passes a safe next to LoginForm, and drops an unsafe one", async () => {
    expect((await props<{ next?: string }>(LoginPage(params({ next: "/library/p1" })), LoginForm)).next).toBe("/library/p1");
    expect((await props<{ next?: string }>(LoginPage(params()), LoginForm)).next).toBeUndefined();
    expect((await props<{ next?: string }>(LoginPage(params({ next: "//evil.example" })), LoginForm)).next).toBeUndefined();
  });

  it("log in shows the demo accounts only where lib/demo says so", async () => {
    demo.password = null;
    expect((await props<{ demoPassword?: string }>(LoginPage(params()), LoginForm)).demoPassword).toBeUndefined();
    expect(html(await LoginPage(params()))).not.toContain("demo.tysonpe.test");
    demo.password = "pw-demo";
    expect((await props<{ demoPassword?: string }>(LoginPage(params()), LoginForm)).demoPassword).toBe("pw-demo");
    expect(html(await LoginPage(params()))).toContain("Asha (creator)");
    expect(html(await LoginPage(params()))).not.toContain("pw-demo");
    demo.password = null;
  });

  it("a signed-in user visiting sign up goes to next, else the library", async () => {
    session.user = { id: "u1", name: "Asha", creator: null };
    await expect(SignupPage(params({ next: "/library/p1" }))).rejects.toThrow("REDIRECT /library/p1");
    await expect(SignupPage(params({ next: "https://evil.example" }))).rejects.toThrow("REDIRECT /library");
    session.user = null;
  });

  it("sign up's subtitle is exactly the promised line, nothing appended", async () => {
    expect(html(await SignupPage(params()))).toMatch(/<p class="[^"]*">Free to start\. No card needed\.<\/p>/);
  });
});
