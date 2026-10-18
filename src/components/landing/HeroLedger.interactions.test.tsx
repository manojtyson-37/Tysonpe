// Drives HeroLedger's handlers with the same synchronous hook store QuizEditor.interactions.test.tsx uses: the component is
// called as a plain function, the returned tree is walked, and a control's onChange is invoked as React would invoke it.
//
// WHAT THIS CANNOT PROVE (needs a real React runtime, i.e. a browser):
// - that a real keystroke reaches onChange, that the browser keeps the caret in place while the value is rewritten
//   (digits-only sanitising), that a screen reader announces the <output> change once, or the focus ring on the controls;
// - batching of several setState calls in one event (each handler here sets exactly one value).
import { isValidElement, type ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

const H = vi.hoisted(() => ({ slots: [] as unknown[], i: 0, effects: [] as Array<() => void> }));
vi.mock("react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react")>();
  const useState = (init: unknown) => {
    const idx = H.i++;
    if (!(idx in H.slots)) H.slots[idx] = typeof init === "function" ? (init as () => unknown)() : init;
    const set = (v: unknown) => {
      H.slots[idx] = typeof v === "function" ? (v as (p: unknown) => unknown)(H.slots[idx]) : v;
    };
    return [H.slots[idx], set];
  };
  const useEffect = (fn: () => void) => {
    H.effects.push(fn);
  };
  const useId = () => ":r0:";
  return { ...actual, default: { ...actual, useState, useEffect, useId }, useState, useEffect, useId };
});

import { GST_RATES } from "@/lib/validation";
import { DEFAULT_PRICE_RUPEES, PLAN_OPTIONS } from "@/lib/landing-ledger";
import { formatINR } from "@/lib/money";
import { HeroLedger } from "./HeroLedger";

type P = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
type El = { type: unknown; props: P };

function walk(node: ReactNode, out: El[] = []): El[] {
  if (Array.isArray(node)) {
    node.forEach((c) => walk(c, out));
    return out;
  }
  if (!isValidElement(node)) return out;
  const props = node.props as P;
  out.push({ type: node.type, props });
  walk(props.children, out);
  return out;
}

function mount(gstRates: readonly number[] = GST_RATES) {
  H.slots = [];
  H.effects = [];
  let tree: ReactNode;
  const render = () => {
    H.i = 0;
    H.effects = [];
    tree = HeroLedger({ gstRates });
  };
  render();
  const els = () => walk(tree);
  const control = (label: string) => {
    const found = els().find((e) => e.props.label === label);
    expect(found, label).toBeDefined();
    return found!.props;
  };
  const type = (value: string) => {
    control("Sale price, GST included").onChange({ target: { value } });
    render();
  };
  const choose = (label: string, value: string) => {
    control(label).onChange({ target: { value } });
    render();
  };
  const html = () => renderToStaticMarkup(tree as never);
  // A metric row's value on its own (the caption repeats some of these figures, so reading the page text would mask a wrong row).
  const row = (label: string) => {
    const m = new RegExp(`<dt[^>]*>${label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}</dt><dd[^>]*>([\\s\\S]*?)</dd>`).exec(html());
    expect(m, label).not.toBeNull();
    return m![1].replace(/<[^>]+>/g, "");
  };
  const caption = () => /<figcaption[^>]*>([\s\S]*?)<\/figcaption>/.exec(html())![1].replace(/<!-- -->/g, "");
  const text = () => html().replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
  // The figure alone: the output also carries a visually hidden "Net after fees " prefix for screen readers.
  const net = () =>
    /<output[^>]*>(.*?)<\/output>/.exec(html())?.[1].replace(/<span class="sr-only">[^<]*<\/span>/, "").replace(/<[^>]+>/g, "") ?? null;
  return { type, choose, control, html, text, net, row, caption, effects: () => H.effects.length };
}

describe("HeroLedger: the default state is the static ledger", () => {
  it("shows the Rs 2,999 Basic sale", () => {
    const m = mount();
    expect(m.net()).toBe("₹2,639.12");
    const t = m.text();
    for (const part of ["Learner pays, GST included", "₹2,999", "of which GST at 18%", "₹457.47", "Platform fee, Basic 10%", "−₹299.90", "Gateway fee 2%", "−₹59.98", "Net after fees"]) {
      expect(t, part).toContain(part);
    }
  });

  it("derives every row: it registers no effect and holds no mirrored state beyond the three controls", () => {
    const m = mount();
    expect(m.effects()).toBe(0);
    expect(H.slots).toHaveLength(3);
  });

  it("the price field is numeric, off autofill, and the GST and plan selects offer the real rates and plans", () => {
    const m = mount();
    const price = m.control("Sale price, GST included");
    expect(price).toMatchObject({ inputMode: "numeric", autoComplete: "off", prefix: "₹", value: "2999" });
    // no maxLength: a cap would cut a pasted over-limit number into a valid-looking one
    expect(price.maxLength).toBeUndefined();
    const html = m.html();
    for (const g of GST_RATES) expect(html).toContain(`<option value="${g}"`);
    for (const p of PLAN_OPTIONS) expect(html).toContain(`<option value="${p.key}"`);
    expect(html.match(/\(draft\)/g)).toHaveLength(3);
    expect(html).toContain('<option value="basic" selected="">Basic</option>');
  });
});

describe("HeroLedger: input -> derived rows", () => {
  it("typing a price recomputes every row", () => {
    const m = mount();
    m.type("5000");
    expect(m.net()).toBe("₹4,400");
    const t = m.text();
    expect(t).toContain("₹5,000");
    expect(t).toContain("−₹500");
    expect(t).toContain("−₹100");
    expect(t).toContain("₹762.71"); // 500000 * 18 / 118 = 76271.19 paise
  });

  const PRICE = "Sale price, GST included";

  it("strips only the rupee sign and leading blanks: the field shows what was typed, commas and inner spaces included", () => {
    const m = mount();
    m.type("₹1,00,000");
    expect(m.control(PRICE).value).toBe("1,00,000");
    m.type("₹ 1,000");
    expect(m.control(PRICE).value).toBe("1,000");
    m.type("\u00a01000");
    expect(m.control(PRICE).value).toBe("1000");
    m.type("1 2");
    expect(m.control(PRICE).value).toBe("1 2");
  });

  it.each([
    ["1000", "₹880"],
    ["1,000", "₹880"],
    ["1,00,000", "₹88,000"],
    ["100,000", "₹88,000"],
    ["₹ 10,00,000", "₹8,80,000"],
    ["₹1,000,000", "₹8,80,000"],
    ["  750 ", "₹660"],
    ["\u00a0750\u202f", "₹660"],
  ])("%j is read as the number it looks like and is accepted", (typed, net) => {
    const m = mount();
    m.type(typed);
    expect(m.net()).toBe(net);
    expect(m.text()).not.toContain("Showing");
    expect(m.control(PRICE)["aria-invalid"]).toBeUndefined();
  });

  it.each([
    ["29.99"], ["12.5"], ["2999.00"], ["12ab3"], ["₹1,00,00,00,000"], ["1,00,00,001"],
    // a comma that is not Indian or Western grouping is not removed to make a number
    ["29,99"], ["2,99"], ["1,0,0"], ["1,00,0"], ["1,0000"], [",100"], ["100,"], ["1,,000"], ["0,500"],
    // spaces are not a grouping separator: " 1 2 " must not become 12, and "1 000" is refused rather than guessed
    [" 1 2 "], ["1 000"], ["1\u00a0000"],
  ])(
    "%j is not rewritten into another price: the field keeps it, the ledger falls back and says so",
    (typed) => {
      const m = mount();
      m.type("5000");
      m.type(typed);
      expect(m.control(PRICE).value).toBe(typed.replace(/₹/g, "").trimStart());
      expect(m.net()).toBe("₹2,639.12");
      expect(m.text()).toContain("Showing ₹2,999 until then");
      expect(m.control(PRICE)["aria-invalid"]).toBe(true);
    },
  );

  it("29.99 is never read as Rs 2,999, and 29,99 is never read as 2,999 either", () => {
    const m = mount();
    m.type("29.99");
    expect(m.control(PRICE).value).toBe("29.99");
    expect(m.text()).toContain("Enter whole rupees");
    m.type("29,99");
    expect(m.control(PRICE).value).toBe("29,99");
    expect(m.net()).toBe("₹2,639.12");
    expect(m.text()).toContain("Enter whole rupees");
  });

  it("a valid price clears the fallback note", () => {
    const m = mount();
    m.type("");
    m.type("750");
    expect(m.text()).not.toContain("Showing");
    expect(m.control("Sale price, GST included")["aria-invalid"]).toBeUndefined();
    expect(m.net()).toBe("₹660");
  });

  it("the GST rate changes the GST row and not the net (GST sits inside the price)", () => {
    const m = mount();
    m.choose("GST rate", "5");
    expect(m.text()).toContain("of which GST at 5%");
    expect(m.text()).toContain("₹142.81"); // 299900 * 5 / 105 = 14280.95 paise, rounded
    expect(m.net()).toBe("₹2,639.12");
    m.choose("GST rate", "0");
    expect(m.text()).toContain("of which GST at 0%");
  });

  it("at 0% GST the caption does not talk about a Rs 0 of GST sitting inside the price", () => {
    const m = mount();
    m.choose("GST rate", "0");
    const caption = /<figcaption[^>]*>([\s\S]*?)<\/figcaption>/.exec(m.html())![1];
    expect(caption).not.toContain("₹0 of GST");
    expect(caption).toContain("No GST is included at 0%, so there is none to remit.");
    expect(caption).toContain("Real settlement starts after launch");
    m.choose("GST rate", "18");
    expect(m.html()).toContain("sits inside the price and is yours to remit");
  });

  it("a draft plan changes the fees, is flagged draft, and its monthly fee is not netted", () => {
    const m = mount();
    m.choose("Plan", "pro");
    const t = m.text();
    expect(t).toContain("Platform fee, Pro 5.5%");
    expect(m.net()).toBe("₹2,774.07");
    expect(t).toContain("Pro is draft pricing");
    expect(t).toContain("₹5,000 monthly fee is not netted");
    m.choose("Plan", "basic");
    expect(m.text()).toContain("Monthly plan fees are not netted");
    expect(m.text()).not.toContain("draft pricing");
  });

  it("ignores a plan or rate value that is not offered", () => {
    const m = mount();
    m.choose("Plan", "platinum");
    expect(m.net()).toBe("₹2,639.12");
    m.choose("GST rate", "not-a-number");
    expect(m.text()).toContain("of which GST at 18%");
  });
});

describe("HeroLedger: pinned details", () => {
  it("the selects are controlled: after a choice they hold the chosen value, not the initial one", () => {
    const m = mount();
    expect(m.control("GST rate").value).toBe(18);
    expect(m.control("Plan").value).toBe("basic");
    m.choose("GST rate", "5");
    m.choose("Plan", "pro");
    expect(m.control("GST rate").value).toBe(5);
    expect(m.control("Plan").value).toBe("pro");
    expect(m.html()).toContain('<option value="5" selected="">5%</option>');
    expect(m.html()).toContain('<option value="pro" selected="">Pro (draft)</option>');
  });

  it("the GST row follows the price and the rate on its own, and the caption agrees with it", () => {
    const m = mount();
    expect(m.row("of which GST at 18%")).toBe("₹457.47");
    m.type("5000");
    expect(m.row("of which GST at 18%")).toBe("₹762.71");
    expect(m.caption()).toContain("The ₹762.71 of GST sits inside");
    m.choose("GST rate", "5");
    expect(m.row("of which GST at 5%")).toBe("₹238.10"); // 500000 * 5 / 105 = 23809.52 paise
    expect(m.caption()).toContain("The ₹238.10 of GST sits inside");
  });

  it("the fallback sale carries its GST: the default price's GST at the chosen rate", () => {
    const m = mount();
    m.type("abc");
    expect(m.row("of which GST at 18%")).toBe("₹457.47");
    m.choose("GST rate", "5");
    m.type("29.99");
    expect(m.row("of which GST at 5%")).toBe("₹142.81");
    expect(m.net()).toBe("₹2,639.12");
  });

  it("each row prints its own figure: sale, fees and net, apart from the caption", () => {
    const m = mount();
    m.type("5000");
    expect(m.row("Learner pays, GST included")).toBe("₹5,000");
    expect(m.row("Platform fee, Basic 10%")).toBe("−₹500");
    expect(m.row("Gateway fee 2%")).toBe("−₹100");
  });

  it("ignores a numeric GST rate the form does not offer, and a rate of 100", () => {
    const m = mount();
    m.choose("GST rate", "7");
    expect(m.control("GST rate").value).toBe(18);
    m.choose("GST rate", "100");
    expect(m.control("GST rate").value).toBe(18);
    expect(m.row("of which GST at 18%")).toBe("₹457.47");
    m.choose("GST rate", "28");
    expect(m.control("GST rate").value).toBe(28);
  });

  it("words its title, hint and option labels exactly", () => {
    const m = mount();
    expect(m.html()).toContain(">Order ledger</p>");
    expect(m.html()).toContain(">Sample sale</p>");
    expect(m.control("Sale price, GST included").hint).toBe("Whole rupees. GST is already inside this price.");
    m.type("0");
    expect(m.control("Sale price, GST included").hint).toBe("Enter whole rupees from ₹1 to ₹10,00,000. Showing ₹2,999 until then.");
    for (const g of GST_RATES) expect(m.html()).toContain(`>${g}%</option>`);
    for (const label of ["Basic", "Pro (draft)", "Advanced (draft)", "Ultimate (draft)"]) expect(m.html()).toContain(`>${label}</option>`);
  });

  it("the plan note names the plan and its monthly fee", () => {
    const m = mount();
    m.choose("Plan", "ultimate");
    expect(m.caption()).toContain("Ultimate is draft pricing and billing is not live; its ₹30,000 monthly fee is not netted.");
  });
});

describe("HeroLedger: announcements", () => {
  it("only the net row is a live region, so a change is read as one value", () => {
    const m = mount();
    const html = m.html();
    expect(html.match(/aria-live/g)).toHaveLength(1);
    expect(html).toMatch(/<output[^>]*aria-live="polite"/);
    expect(html).not.toContain('role="alert"');
    expect(html).not.toContain('role="status"');
    m.type("");
    expect(m.html().match(/aria-live/g)).toHaveLength(1);
    expect(m.html()).not.toContain('role="alert"');
  });

  it("the output names the controls it is computed from", () => {
    const html = mount().html();
    expect(html).toMatch(/<output[^>]*for="ledger-price ledger-gst ledger-plan"/);
    for (const id of ["ledger-price", "ledger-gst", "ledger-plan"]) expect(html).toContain(`id="${id}"`);
  });

  it("the live region says when it is showing the sample instead of the typed price", () => {
    const m = mount();
    const sr = () => /<output[^>]*><span class="sr-only">([^<]*)<\/span>/.exec(m.html())![1];
    expect(sr()).toBe("Net after fees ");
    m.type("abc");
    // the sample price comes from the model, not a literal in the component
    expect(sr()).toBe(`Price not read, showing the ${formatINR(DEFAULT_PRICE_RUPEES * 100)} sample. Net after fees `);
    expect(sr()).toContain("₹2,999 sample");
    expect(m.net()).toBe("₹2,639.12");
    for (const bad of ["", "0", "29.", "29,99"]) {
      m.type(bad);
      expect(sr(), bad).toMatch(/^Price not read, showing the/);
    }
    m.type("750");
    expect(sr()).toBe("Net after fees ");
    expect(sr()).not.toContain("Price not read");
  });
});
