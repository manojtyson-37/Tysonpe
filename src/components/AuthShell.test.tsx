import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { AuthShell } from "./AuthShell";

const render = (el: React.ReactElement) => renderToStaticMarkup(el);

describe("AuthShell", () => {
  it("renders the title as the h1, the subtitle, the children in the card, and the footer", () => {
    const html = render(
      <AuthShell title="Welcome back" subtitle="Log in to continue." footer={<a href="/signup">Create an account</a>}>
        <form id="the-form" />
      </AuthShell>,
    );
    expect(html).toMatch(/<h1[^>]*>Welcome back<\/h1>/);
    expect(html).toMatch(/<p class="mt-1 text-sm text-muted">Log in to continue\.<\/p>/);
    expect(html).toMatch(/<div class="card mt-6 p-6"><form id="the-form"><\/form><\/div>/);
    expect(html).toMatch(/<p class="mt-5 text-center text-sm text-muted"><a href="\/signup">Create an account<\/a><\/p>/);
  });

  it("keeps the narrow centred column", () => {
    expect(render(<AuthShell title="T">x</AuthShell>)).toMatch(/^<div class="mx-auto w-full max-w-md px-4 py-16">/);
  });

  it("omits the subtitle and the footer cleanly when they are absent", () => {
    const html = render(<AuthShell title="Open your store">body</AuthShell>);
    expect(html).toContain("Open your store");
    expect(html).toContain("body");
    expect(html).not.toContain("<p");
    expect(html).not.toContain("text-center");
  });

  it("does not render a <main>: the surrounding shell owns the landmark", () => {
    expect(render(<AuthShell title="T">x</AuthShell>)).not.toContain("<main");
  });
});
