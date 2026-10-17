import { readFileSync } from "node:fs";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

const mocks = vi.hoisted(() => ({
  creator: { id: "cr_1", handle: "asha", displayName: "Asha Rao Academy", bio: "Books & tax, made simple.", brandColor: "#6d28d9" },
  updateProfile: Object.assign(() => undefined, { action: "updateProfile" }),
}));

vi.mock("@/lib/auth/session", () => ({ requireCreator: async () => ({ user: {}, creator: mocks.creator }) }));
vi.mock("@/app/actions/creator", () => ({ updateProfile: mocks.updateProfile }));

import { BrandColorField } from "@/components/BrandColorField";
import { ActionForm, Field, FormError, SavedNote, SubmitButton } from "@/components/form";
import { functionProps } from "@/test/rsc-safe";
import { legacyStyleFindings } from "@/test/style-scan";
import SettingsPage from "./dashboard/(console)/settings/page";

const PAGE_PATH = new URL("./dashboard/(console)/settings/page.tsx", import.meta.url);
const BOUNDARIES: unknown[] = [ActionForm, Field, FormError, SavedNote, SubmitButton, BrandColorField];

beforeEach(() => {
  mocks.creator.brandColor = "#6d28d9";
});

const call = async () => (await (SettingsPage as () => Promise<ReactNode>)()) as ReactNode;
const render = async () => renderToStaticMarkup(<>{await call()}</>);
const text = (html: string) => html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").replace(/&#x27;/g, "'");
const names = (html: string) => [...html.matchAll(/<(?:input|select|textarea)\b[^>]*\sname="([^"]+)"/g)].map((m) => m[1]);

describe("settings: form", () => {
  it("posts displayName, bio and brandColor, in that order, to updateProfile", async () => {
    expect(names(await render())).toEqual(["displayName", "bio", "brandColor"]);
  });

  it("prefills store name, bio and colour from the creator", async () => {
    const html = await render();
    expect(html).toMatch(/name="displayName"[^>]*value="Asha Rao Academy"/);
    expect(html).toContain("Books &amp; tax, made simple.</textarea>");
    expect(/<input\b[^>]*name="brandColor"[^>]*>/.exec(html)![0]).toContain('value="#6d28d9"');
  });

  it("submits the hex text input only; the native picker has no name and is labelled", async () => {
    const html = await render();
    expect(html.match(/name="brandColor"/g)).toHaveLength(1);
    const picker = /<input\b[^>]*type="color"[^>]*>/.exec(html)![0];
    expect(picker).not.toContain("name=");
    expect(picker).toContain('aria-label="Pick a colour"');
  });

  it("matches what the action accepts: a six-digit hex, required", async () => {
    const input = /<input\b[^>]*name="brandColor"[^>]*>/.exec(await render())![0];
    expect(input).toContain('pattern="#[0-9a-fA-F]{6}"');
    expect(input).toContain("required");
    expect(input).toContain('maxLength="7"');
  });

  it("labels the colour field and keeps the hint text", async () => {
    const html = await render();
    expect(html).toMatch(/<label[^>]*>Brand colour<\/label>/);
    expect(text(html)).toContain("Buttons and accents on your storefront use this colour.");
  });

  it("shows the store link and a Save settings submit", async () => {
    const html = await render();
    expect(text(html)).toContain("Store link: /c/asha (handles can't be changed yet).");
    expect(html).toMatch(/<button\b[^>]*type="submit"[^>]*>Save settings<\/button>/);
  });

  it("uses no .card, rounded-xl or p-6 box", async () => {
    const html = await render();
    const tokens = [...html.matchAll(/\sclass="([^"]*)"/g)].flatMap((m) => m[1].split(/\s+/));
    expect(tokens).not.toContain("card");
    expect(tokens).not.toContain("p-6");
    expect(html).not.toContain("rounded-xl");
  });
});

describe("settings: live colour preview", () => {
  it("renders the storefront preview from the stored colour, scoped like the storefront", async () => {
    const html = await render();
    expect(html).toContain('aria-label="Storefront colour preview"');
    expect(html).toContain("--brand:#6d28d9");
    expect(text(html)).toContain("Asha Rao Academy");
  });

  it.each([
    ["#fde68a", "Button text will be ink", "uses a darker shade"],
    ["#0f172a", "Button text will be white", "uses it as is"],
  ])("a stored %s reads: %s / %s", async (color, button, text2) => {
    mocks.creator.brandColor = color;
    const t = text(await render());
    expect(t).toContain(button);
    expect(t).toContain(text2);
  });
});

describe("settings: RSC boundary", () => {
  it("passes no function props beyond the server action handed to ActionForm", async () => {
    const visited = new Set<unknown>();
    expect(functionProps(await call(), BOUNDARIES, { onVisit: (t) => visited.add(t) })).toEqual(["<ActionForm>.action"]);
    for (const type of [ActionForm, Field, BrandColorField, SubmitButton]) expect(visited.has(type)).toBe(true);
  });

  it("positive control: the same walk reports a function prop planted in the page tree", async () => {
    const planted = (<>{await call()}<button onClick={() => {}}>x</button></>);
    expect(functionProps(planted, BOUNDARIES)).toEqual(["<ActionForm>.action", "<button>.onClick"]);
  });
});

describe("settings: source hygiene", () => {
  it("the page source has no legacy classes, ! utilities, glyphs or title tooltips", () => {
    expect(legacyStyleFindings(readFileSync(PAGE_PATH, "utf8"))).toEqual([]);
  });
});
