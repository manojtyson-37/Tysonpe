import { isValidElement, type ReactElement, type ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { Button } from "@/components/ui/button";
import NotFound from "./not-found";
import ErrorPage from "./error";
import ConsoleLoading from "./dashboard/(console)/(overview)/loading";
import LibraryLoading from "./(site)/library/(list)/loading";

const render = (el: React.ReactElement) => renderToStaticMarkup(el);
const hrefs = (html: string) => [...html.matchAll(/<a [^>]*href="([^"]*)"/g)].map((m) => m[1]);
const count = (html: string, needle: string) => html.split(needle).length - 1;

// Routes that exist today (the allow-list from the task). The demo storefront is /c/<handle> and is env-driven.
const ROUTES = ["/", "/demo", "/login", "/signup?role=creator", "/library"];

function find(node: ReactNode, pred: (el: ReactElement) => boolean, out: ReactElement[] = []): ReactElement[] {
  if (Array.isArray(node)) node.forEach((n) => find(n, pred, out));
  else if (isValidElement(node)) {
    if (pred(node)) out.push(node);
    find((node.props as { children?: ReactNode }).children, pred, out);
  }
  return out;
}

describe("not-found", () => {
  const html = render(<NotFound />);

  it("says what happened in plain words", () => {
    expect(html).toMatch(/<h1[^>]*>We can(&#x27;|')t find that page<\/h1>/);
    expect(html).toContain("mistyped, or the page may have been moved or removed");
  });

  it("offers exactly two links, both to routes that exist", () => {
    const links = hrefs(html);
    expect(links).toHaveLength(2);
    expect(links).toEqual(["/", "/demo"]);
    for (const href of links) expect(ROUTES).toContain(href);
  });

  it("stands on its own: it has its own main landmark and no search box or invented contact", () => {
    expect(html).toMatch(/<main id="main"/);
    expect(html).not.toMatch(/<input|<form|mailto:|support/i);
  });

  it("has no exclamation marks and meets the touch floor on the border box", () => {
    expect(html).not.toContain("!");
    expect(count(html, "pointer-coarse:min-h-11")).toBe(2);
    expect(count(html, "pointer-coarse:min-w-11")).toBe(2);
  });
});

describe("error boundary", () => {
  const error = Object.assign(new Error("connect ECONNREFUSED 10.0.0.7:5432"), { digest: "d4f9a1" });
  error.stack = "Error: connect ECONNREFUSED\n    at /srv/app/.next/server/chunks/db.js:12:3";

  // Next 16 hands error.tsx `retry` (re-fetches the server payload), not the old `reset` (re-renders the same
  // failed one). A server-component failure is the common case here, so reset would leave the button looking dead.
  it("wires the retry control to retry", () => {
    const retry = vi.fn();
    const tree = ErrorPage({ error, retry });
    const buttons = find(tree, (el) => el.type === Button);
    expect(buttons).toHaveLength(1);
    expect((buttons[0].props as { onClick: unknown }).onClick).toBe(retry);
    (buttons[0].props as { onClick: () => void }).onClick();
    expect(retry).toHaveBeenCalledTimes(1);
    expect(render(tree)).toMatch(/<button [^>]*type="button"[^>]*>Try again<\/button>/);
  });

  it("never prints the message or the stack, but labels the digest as a reference", () => {
    const html = render(ErrorPage({ error, retry: () => {} }));
    expect(html).not.toContain("ECONNREFUSED");
    expect(html).not.toContain("10.0.0.7");
    expect(html).not.toContain("/srv/app");
    expect(html).toContain("Error reference: ");
    expect(html).toContain('<span class="font-mono">d4f9a1</span>');
  });

  it("omits the reference line when there is no digest", () => {
    const html = render(ErrorPage({ error: new Error("boom"), retry: () => {} }));
    expect(html).not.toContain("Error reference");
    expect(html).not.toContain("boom");
  });

  it("links out to the home page, announces the failure once, and keeps the copy plain", () => {
    const html = render(ErrorPage({ error, retry: () => {} }));
    expect(hrefs(html)).toEqual(["/"]);
    expect(count(html, 'role="alert"')).toBe(1);
    expect(html).toMatch(/<main id="main"/);
    expect(html).not.toMatch(/oops|!|notified|status page/i);
  });

  it("is a client component, as Next requires of error.tsx", async () => {
    const { readFileSync } = await import("node:fs");
    expect(readFileSync(new URL("./error.tsx", import.meta.url), "utf8").trimStart()).toMatch(/^"use client";/);
  });
});

describe("console loading", () => {
  const html = render(<ConsoleLoading />);

  it("mirrors the Overview rhythm: header, four stats, chart card, checklist card, six order rows", () => {
    expect(html).toContain("grid gap-4 sm:grid-cols-2 xl:grid-cols-4");
    expect(html).toContain("mt-6 grid gap-6 lg:grid-cols-2");
    expect(count(html, "h-8 w-28")).toBe(4); // one value block per stat
    expect(count(html, "h-36 w-full")).toBe(1); // the chart
    expect(count(html, "px-6 py-3")).toBe(6); // order rows
    expect(count(html, "h-5 w-5") + count(html, "width:20px;height:20px")).toBe(3); // checklist dots
    expect(count(html, 'class="card')).toBe(3);
  });

  it("is static and hidden from assistive tech, with one status line", () => {
    expect(html).not.toMatch(/animate-|spinner/);
    expect(html).toMatch(/^<span role="status" class="sr-only">Loading this page<\/span><div aria-hidden="true">/);
    expect(count(html, 'role="status"')).toBe(1);
    expect(html).not.toMatch(/<main/); // the layout owns main#main
  });
});

describe("library loading", () => {
  const html = render(<LibraryLoading />);

  it("mirrors the library page: same container, heading and sub lines, five rows in a ruled list (no cards)", () => {
    expect(html).toMatch(/^<div class="mx-auto max-w-6xl px-4 py-10 sm:px-6">/);
    expect(html).toContain('<ul class="divide-y divide-line border-y border-line">');
    expect(count(html, "<li>")).toBe(5);
    expect(count(html, "px-3 py-4")).toBe(5); // the row padding the page uses
    expect(count(html, "sm:w-64")).toBe(5); // the progress bar slot
    expect(html).not.toContain('class="card');
    expect(html).not.toContain("lg:grid-cols-3");
  });

  it("is static and hidden from assistive tech, with one status line", () => {
    expect(html).not.toMatch(/animate-|spinner/);
    expect(count(html, 'role="status"')).toBe(1);
    expect(html).toContain('<div aria-hidden="true">');
    expect(html).not.toMatch(/<main/); // the (site) layout owns main#main
  });
});
