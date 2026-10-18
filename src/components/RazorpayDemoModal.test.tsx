// The Razorpay replica keeps the gateway's own look, but only through the [data-skin="razorpay"] variables in globals.css.
// These tests render the modal's body to HTML (Dialog is stubbed: it portals into `document.body`, which exists only in a
// browser, so the real one renders nothing on the server) and scan the source for the things the rebuild removed.
import { readFileSync } from "node:fs";
import path from "node:path";
import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const D = vi.hoisted(() => ({ props: undefined as undefined | Record<string, unknown> }));
vi.mock("@/components/ui/dialog", () => ({
  Dialog: (props: Record<string, unknown> & { children?: ReactNode }) => {
    D.props = props;
    return createElement("div", { "data-dialog-stub": "" }, props.children);
  },
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("@/app/actions/checkout", () => ({ settleDemoAction: vi.fn() }));

import { RazorpayDemoModal, type RazorpayDemoModalProps } from "./RazorpayDemoModal";
import { skinSourceFindings } from "@/test/gateway-skin";

const props: RazorpayDemoModalProps = {
  isOpen: true,
  onClose: () => {},
  orderId: "ord_1",
  amountPaise: 123456,
  productTitle: "Brand Strategy Masterclass",
  buyer: { name: "Asha Rao", email: "asha@example.com" },
};
const html = () => renderToStaticMarkup(createElement(RazorpayDemoModal, props));
const source = readFileSync(path.join(__dirname, "RazorpayDemoModal.tsx"), "utf8");

beforeEach(() => {
  D.props = undefined;
});

describe("RazorpayDemoModal: skin and honesty", () => {
  it("puts data-skin=razorpay on the replica's root element", () => {
    const out = html();
    expect(out).toContain('data-skin="razorpay"');
    expect(out.match(/data-skin=/g)).toHaveLength(1);
    expect(out).toMatch(/<div data-dialog-stub=""><div data-skin="razorpay"/);
  });

  it("labels itself Simulated and says no real details are sent", () => {
    const out = html();
    expect(out).toMatch(/>Simulated</);
    expect(out).toContain("No real card, UPI or bank details are sent.");
  });

  it("makes no security, encryption or compliance claim", () => {
    expect(html()).not.toMatch(/secure|encrypt|SSL|PCI|bank-grade|256/i);
  });

  it("shows the amount in rupees with tabular figures, and the merchant", () => {
    const out = html();
    expect(out).toContain("₹1,234.56");
    expect(out).toMatch(/tabular-nums[^>]*>₹1,234\.56</);
    expect(out).toContain("Brand Strategy Masterclass");
  });

  it("has no exclamation marks in the copy it renders", () => {
    expect(html().replace(/<[^>]*>/g, " ")).not.toContain("!");
  });

  it("draws icons as SVG, not text glyphs", () => {
    const out = html();
    expect(out).toContain("<svg");
    expect(out).not.toMatch(/[✓✕←→×•]/);
  });

  it("the close button has an accessible name, and the method switcher is a labelled group of toggle buttons", () => {
    const out = html();
    expect(out).toMatch(/<button[^>]*aria-label="Close payment modal"/);
    expect(out).toMatch(/role="group" aria-label="Payment method"/);
    expect(out.match(/aria-pressed="(true|false)"/g)!.length).toBeGreaterThanOrEqual(4);
  });

  it("outcomes are native radio inputs in a labelled fieldset, success first and checked", () => {
    const out = html();
    expect(out).toMatch(/<legend[^>]*>Simulated outcome<\/legend>/);
    const radios = [...out.matchAll(/<input[^>]*name="rzp-outcome"[^>]*>/g)].map((m) => m[0]);
    expect(radios).toHaveLength(2);
    expect(radios[0]).toContain('value="success"');
    expect(radios[0]).toContain('checked=""');
    expect(radios[1]).toContain('value="failure"');
    expect(radios[1]).not.toContain('checked=""');
  });

  it("touch targets are raised to 44px on coarse pointers for the pay button, tabs and outcome choices", () => {
    expect(html().match(/pointer-coarse:min-h-11/g)!.length).toBeGreaterThanOrEqual(8);
  });
});

describe("RazorpayDemoModal: narrow header", () => {
  it("lets the merchant name wrap to two lines and keeps the amount label on one line", () => {
    const out = html();
    expect(out).toMatch(/line-clamp-2[^>]*>Brand Strategy Masterclass</);
    expect(out).not.toMatch(/truncate[^>]*>Brand Strategy Masterclass</);
    expect(out).toMatch(/whitespace-nowrap[^>]*>Amount to pay</);
  });
});

describe("RazorpayDemoModal: it is a Dialog", () => {
  it("hands Dialog the open flag, a title that names the merchant, and the bare layout", () => {
    html();
    expect(D.props).toMatchObject({ open: true, bare: true });
    expect(String(D.props!.title)).toContain("Brand Strategy Masterclass");
    expect(String(D.props!.title)).toContain("Razorpay");
  });

  it("stays mounted when closed (Dialog owns the exit and the focus return) with open=false", () => {
    renderToStaticMarkup(createElement(RazorpayDemoModal, { ...props, isOpen: false }));
    expect(D.props).toMatchObject({ open: false });
  });

  it("passes the owner's onClose straight through while idle", () => {
    const onClose = vi.fn();
    renderToStaticMarkup(createElement(RazorpayDemoModal, { ...props, onClose }));
    expect(D.props!.onClose).toBe(onClose);
  });

  it("no longer hand-rolls a dialog: no role=dialog, aria-modal or window keydown listener in the source", () => {
    expect(source).not.toMatch(/role="dialog"|aria-modal|addEventListener|fixed inset-0/);
  });
});

describe("RazorpayDemoModal: source scan", () => {
  it("has no palette colour, hex or rgb, pixel text size, glyph, rounded-xl, title tooltip or shadow other than shadow-float", () => {
    expect(skinSourceFindings(source)).toEqual([]);
  });

  it("reads every colour from the skin variables", () => {
    expect(source).toMatch(/bg-\(--skin-surface\)/);
    expect(source).toMatch(/text-\(--skin-ink\)/);
    expect(source).toMatch(/border-\(--skin-line\)/);
  });

  it("sets autocomplete and input mode on the card and VPA fields", () => {
    for (const token of ['autoComplete="cc-number"', 'autoComplete="cc-exp"', 'autoComplete="cc-csc"', 'autoComplete="cc-name"', 'inputMode="email"', 'autoComplete="off"'])
      expect(source).toContain(token);
  });

  it("does not touch the settle call's arguments", () => {
    expect(source).toContain("await settleDemoAction(orderId, outcome)");
  });
});
