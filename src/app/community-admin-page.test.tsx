import { readFileSync } from "node:fs";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { headRowTags } from "@/test/table-rows";

// The creator is cr_1. vi.mock factories are hoisted, so the stand-in actions are built inside vi.hoisted.
const M = vi.hoisted(() => {
  /** A server-action stand-in whose `.bind` returns a tagged function, so a test can read WHICH action a form got and with what. */
  const action = (name: string) => {
    const fn = (() => undefined) as unknown as { bind: (...a: unknown[]) => unknown };
    fn.bind = (_this: unknown, ...args: unknown[]) => Object.assign(() => undefined, { action: name, args });
    return Object.assign(fn, { action: name });
  };
  return {
    creator: { id: "cr_1", handle: "meera", gamificationEnabled: true } as Record<string, unknown>,
    ensureDefaultChannel: vi.fn<(creatorId: string) => Promise<void>>(),
    listChannelsAdmin: vi.fn<(creatorId: string) => Promise<unknown[]>>(),
    listBans: vi.fn<(creatorId: string) => Promise<unknown[]>>(),
    findProducts: vi.fn<(args: Record<string, unknown>) => Promise<unknown[]>>(),
    createChannelAction: action("createChannelAction"),
    updateChannelAction: action("updateChannelAction"),
    deleteChannelAction: action("deleteChannelAction"),
    moveChannelAction: action("moveChannelAction"),
    unbanMemberAction: action("unbanMemberAction"),
    setGamificationAction: action("setGamificationAction"),
    recalculatePointsAction: action("recalculatePointsAction"),
  };
});

vi.mock("@/lib/auth/session", () => ({ requireCreator: async () => ({ user: { id: "u_cr" }, creator: M.creator }) }));
vi.mock("@/lib/community/channels", () => ({ ensureDefaultChannel: M.ensureDefaultChannel, listChannelsAdmin: M.listChannelsAdmin }));
vi.mock("@/lib/community/posts", () => ({ listBans: M.listBans }));
vi.mock("@/lib/db", () => ({ db: { product: { findMany: M.findProducts } } }));
vi.mock("@/app/actions/community-admin", () => ({
  createChannelAction: M.createChannelAction,
  updateChannelAction: M.updateChannelAction,
  deleteChannelAction: M.deleteChannelAction,
  moveChannelAction: M.moveChannelAction,
  unbanMemberAction: M.unbanMemberAction,
  setGamificationAction: M.setGamificationAction,
  recalculatePointsAction: M.recalculatePointsAction,
}));

import { ConfirmButton } from "@/components/ConfirmButton";
import { ChannelForm } from "@/components/community/ChannelForm";
import { IconArrowDown, IconArrowUp, IconExternal } from "@/components/icons";
import { Button, ButtonLink, DateCell, Disclosure, PageHeader, Table, Td } from "@/components/ui";
import { channel, classTokens, elements as walk, text, type El } from "@/test/community-fixtures";
import { functionProps } from "@/test/rsc-safe";
import { legacyStyleFindings } from "@/test/style-scan";
import CommunityConsole from "./dashboard/(console)/community/page";

const BOUNDARIES: unknown[] = [ConfirmButton, ChannelForm, Disclosure];
const PAGE_PATH = new URL("./dashboard/(console)/community/page.tsx", import.meta.url);
const FORM_PATH = new URL("../components/community/ChannelForm.tsx", import.meta.url);
const elements = (node: ReactNode) => walk(node, BOUNDARIES);

type Chan = ReturnType<typeof channel> & { postCount: number };
const chan = (over: Partial<Chan> = {}): Chan => ({ ...channel(), postCount: 3, ...over });
const ban = (over: Record<string, unknown> = {}) => ({ userId: "u_9", name: "Ravi Kumar", createdAt: new Date("2026-10-15T06:30:00Z"), ...over });

beforeEach(() => {
  for (const m of [M.ensureDefaultChannel, M.listChannelsAdmin, M.listBans, M.findProducts]) m.mockReset();
  M.creator = { id: "cr_1", handle: "meera", gamificationEnabled: true };
  M.ensureDefaultChannel.mockResolvedValue(undefined);
  M.listChannelsAdmin.mockResolvedValue([chan()]);
  M.listBans.mockResolvedValue([]);
  M.findProducts.mockResolvedValue([{ id: "pr_1", title: "Masterclass" }]);
});

const call = async () => (await (CommunityConsole as () => Promise<ReactNode>)()) as ReactNode;
const render = async () => renderToStaticMarkup(<>{await call()}</>);
const bound = (e: El) => {
  const form = [...e.ancestors].reverse().find((a) => a.type === "form")!;
  return form.props.action as { action: string; args: unknown[] };
};
const three = () => [chan({ id: "ch_1", name: "General" }), chan({ id: "ch_2", name: "Q&A", kind: "announcement" }), chan({ id: "ch_3", name: "Wins" })];
/** The accessible name of a button: its text with aria-hidden spans removed. */
const nameOf = (html: string) => text(html.replace(/<span[^>]*aria-hidden="true"[^>]*>.*?<\/span>/g, "")).trim();

describe("community admin: header", () => {
  it("opens the community with a secondary small ButtonLink and the external icon, not a glyph", async () => {
    const link = elements(await call()).find((e) => e.type === ButtonLink)!;
    expect(link.props.href).toBe("/c/meera/community");
    expect(link.props.variant).toBe("secondary");
    expect(link.props.size).toBe("sm");
    expect(link.props.className).toContain("pointer-coarse:min-h-11");
    expect(link.props.children).toBe("Open community");
    expect((link.props.icon as { type: unknown }).type).toBe(IconExternal);
    expect(await render()).not.toContain("↗");
  });

  it("puts the link in the PageHeader `actions` slot (the singular `action` is deprecated)", async () => {
    const header = elements(await call()).find((e) => e.type === PageHeader)!;
    expect("actions" in header.props).toBe(true);
    expect("action" in header.props).toBe(false);
  });
});

describe("community admin: layout and surfaces", () => {
  it("keeps the xl two-column grid and DOM order: new channel, channels, bans, gamification", async () => {
    const html = await render();
    expect(html).toContain("xl:grid-cols-[minmax(0,1fr)_380px]");
    const at = (needle: string) => html.indexOf(needle);
    const order = [">New channel</h2>", 'id="channels-h"', ">Banned members</h2>", ">Points, levels and badges</h2>"].map(at);
    expect(order.every((i) => i > 0)).toBe(true);
    expect(order).toEqual([...order].sort((a, b) => a - b));
    expect(html).toContain("xl:col-start-2 xl:row-start-1");
    expect(html).toContain("xl:col-start-2 xl:row-start-2");
  });

  it("uses ruled blocks: no .card, badge, pill, rounded-xl or raw button/details", async () => {
    M.listBans.mockResolvedValue([ban()]);
    const html = await render();
    const tokens = classTokens(html);
    for (const t of ["card", "badge", "badge-muted", "min-h-10", "rounded-xl", "rounded-2xl"]) expect(tokens, t).not.toContain(t);
    expect(html).not.toContain("<details");
    expect(html).not.toContain("<summary");
    expect(html).not.toContain("title=");
  });

  it("keeps the focus-ring room in the Disclosure primitive, not in page workarounds", () => {
    const page = readFileSync(PAGE_PATH, "utf8");
    expect(page).not.toContain("px-0.5");
    expect(page).not.toContain("the panel clips overflow");
  });

  it("gives the Disclosure no padding of its own: the primitive carries the row's px-1.5", async () => {
    M.listChannelsAdmin.mockResolvedValue(three());
    const disclosures = elements(await call()).filter((e) => e.type === Disclosure);
    expect(disclosures).toHaveLength(3);
    for (const d of disclosures) expect(d.props.className).toBeUndefined();
    expect(readFileSync(PAGE_PATH, "utf8")).not.toMatch(/<Disclosure[^>]*px-1\.5/);
  });

  it("wraps a long channel name anywhere instead of pushing the row wider", async () => {
    M.listChannelsAdmin.mockResolvedValue([chan({ id: "ch_1", name: "A".repeat(80) })]);
    const html = await render();
    expect(html).toMatch(new RegExp(`<span class="[^"]*\\bmin-w-0\\b[^"]*\\bwrap-anywhere\\b[^"]*">${"A".repeat(80)}</span>`));
  });

  it("passes the style scan on both touched sources, and names no hand-built chevron or glyph", () => {
    for (const file of [PAGE_PATH, FORM_PATH]) {
      const src = readFileSync(file, "utf8");
      expect(legacyStyleFindings(src), file.pathname).toEqual([]);
    }
    const page = readFileSync(PAGE_PATH, "utf8");
    expect(page).not.toContain("<svg");
    expect(page).not.toContain("min-h-10");
  });
});

describe("community admin: channels are Disclosures", () => {
  it("renders one closed Disclosure per channel, as a button with aria-expanded and a labelled region", async () => {
    M.listChannelsAdmin.mockResolvedValue(three());
    const html = await render();
    expect(elements(await call()).filter((e) => e.type === Disclosure)).toHaveLength(3);
    expect(html.match(/aria-expanded="false"/g)).toHaveLength(3);
    expect(html.match(/aria-controls="/g)).toHaveLength(3);
    // Exactly one region per channel, and they are the Disclosure panels (labelled by their button), not the Table's.
    const regions = html.match(/<div id="([^"]*-panel)" role="region" aria-labelledby="([^"]*)"/g)!;
    expect(regions).toHaveLength(3);
    const buttonIds = [...html.matchAll(/<button\b[^>]*aria-expanded[^>]*>/g)].map((m) => /\bid="([^"]*)"/.exec(m[0])![1]);
    expect(regions.map((r) => /aria-labelledby="([^"]*)"/.exec(r)![1])).toEqual(buttonIds);
  });

  it("lists channels as a named, ruled list under an sr-only heading", async () => {
    const html = await render();
    expect(html).toMatch(/<h2 id="channels-h" class="sr-only">Channels<\/h2>/);
    // Named once: by the heading. A second aria-label on the list would name it twice.
    expect(html).toMatch(/<ul class="divide-y divide-line[^"]*" aria-labelledby="channels-h">/);
    expect(html).not.toContain('aria-label="Channels"');
  });

  it("summarises name, ONE quiet Type and Access line, and the post count", async () => {
    M.listChannelsAdmin.mockResolvedValue([
      chan({ id: "ch_1", name: "General", postCount: 1 }),
      chan({ id: "ch_2", name: "Q&A", kind: "announcement", access: "product_gated", productIds: ["pr_1", "pr_2"], postCount: 0 }),
      chan({ id: "ch_3", name: "VIP", access: "product_gated", productIds: ["pr_1"], postCount: 12 }),
    ]);
    const buttons = [...(await render()).matchAll(/<button\b[^>]*aria-expanded[^>]*>(.*?)<\/button>/g)].map((m) => m[1]);
    expect(buttons.map(nameOf)).toEqual([
      "General Discussion All customers 1 post",
      "Q&A Announcements 2 products 0 posts",
      "VIP Discussion 1 product 12 posts",
    ]);
    // Separators are decoration: hidden from the name, with real spaces left around them so words do not run together.
    expect(buttons[0]).toMatch(/Discussion <span[^>]*aria-hidden="true"[^>]*>·<\/span> All customers/);
    expect(buttons[0]).not.toContain("badge");
  });

  it("has exactly one meta separator per channel (not two pills)", async () => {
    M.listChannelsAdmin.mockResolvedValue(three());
    const html = await render();
    expect(html.match(/aria-hidden="true"[^>]*>·</g)).toHaveLength(3);
  });

  it("holds the edit form, move buttons and delete inside the panel", async () => {
    M.listChannelsAdmin.mockResolvedValue(three());
    const els = elements(await call());
    const forms = els.filter((e) => e.type === ChannelForm && e.props.submitLabel === "Save channel");
    expect(forms.map((f) => [f.props.action.action, f.props.action.args])).toEqual([
      ["updateChannelAction", ["ch_1"]],
      ["updateChannelAction", ["ch_2"]],
      ["updateChannelAction", ["ch_3"]],
    ]);
    expect(forms[1].props.channel.name).toBe("Q&A");
    expect(forms[0].props.products).toEqual([{ id: "pr_1", title: "Masterclass" }]);
    for (const f of forms) expect(f.ancestors.some((a) => a.type === Disclosure)).toBe(true);
  });
});

describe("community admin: move and delete", () => {
  it("Move up / Move down are secondary small Buttons with icons, aria-labels and the bound channel id", async () => {
    M.listChannelsAdmin.mockResolvedValue(three());
    const moves = elements(await call()).filter((e) => e.type === Button && String(e.props["aria-label"] ?? "").startsWith("Move"));
    expect(moves.map((m) => [m.props["aria-label"], m.props.children, bound(m).action, bound(m).args])).toEqual([
      ["Move up: General", "Move up", "moveChannelAction", ["ch_1", "up"]],
      ["Move down: General", "Move down", "moveChannelAction", ["ch_1", "down"]],
      ["Move up: Q&A", "Move up", "moveChannelAction", ["ch_2", "up"]],
      ["Move down: Q&A", "Move down", "moveChannelAction", ["ch_2", "down"]],
      ["Move up: Wins", "Move up", "moveChannelAction", ["ch_3", "up"]],
      ["Move down: Wins", "Move down", "moveChannelAction", ["ch_3", "down"]],
    ]);
    for (const m of moves) {
      expect(m.props.variant).toBe("secondary");
      expect(m.props.size).toBe("sm");
      expect(m.props.type).toBe("submit");
      expect(m.props.className).toContain("pointer-coarse:min-h-11");
    }
    expect(moves.map((m) => (m.props.icon as { type: unknown }).type)).toEqual([IconArrowUp, IconArrowDown, IconArrowUp, IconArrowDown, IconArrowUp, IconArrowDown]);
  });

  it("disables Move up on the first channel and Move down on the last, and nothing in the middle", async () => {
    M.listChannelsAdmin.mockResolvedValue(three());
    const moves = elements(await call()).filter((e) => e.type === Button && String(e.props["aria-label"] ?? "").startsWith("Move"));
    expect(moves.map((m) => [m.props["aria-label"], Boolean(m.props.disabled)]).filter(([, d]) => d)).toEqual([
      ["Move up: General", true],
      ["Move down: Wins", true],
    ]);
  });

  it("a single channel can move nowhere", async () => {
    const moves = elements(await call()).filter((e) => e.type === Button && String(e.props["aria-label"] ?? "").startsWith("Move"));
    expect(moves.map((m) => Boolean(m.props.disabled))).toEqual([true, true]);
  });

  it("Delete is a ConfirmButton in a form bound to deleteChannelAction, naming the action in the dialog", async () => {
    M.listChannelsAdmin.mockResolvedValue(three());
    const deletes = elements(await call()).filter((e) => e.type === ConfirmButton && bound(e).action === "deleteChannelAction");
    expect(deletes.map((d) => bound(d).args)).toEqual([["ch_1"], ["ch_2"], ["ch_3"]]);
    const [d] = deletes;
    expect(d.props.confirmLabel).toBe("Delete channel");
    expect(d.props["aria-label"]).toBe("Delete channel General");
    expect(d.props.children).toBe("Delete");
    expect(d.props.className).toContain("pointer-coarse:min-h-11");
    expect(d.props.variant ?? "danger").toBe("danger");
  });

  it("the delete message says what goes with a channel that has posts, and stays short for an empty one", async () => {
    M.listChannelsAdmin.mockResolvedValue([
      chan({ id: "ch_1", name: "Empty", postCount: 0 }),
      chan({ id: "ch_2", name: "One", postCount: 1 }),
      chan({ id: "ch_3", name: "Busy", postCount: 12 }),
    ]);
    const msgs = elements(await call()).filter((e) => e.type === ConfirmButton).map((e) => e.props.message);
    expect(msgs[0]).toBe('Delete "Empty"? This can\'t be undone.');
    expect(msgs[1]).toBe('Delete "One" and its 1 post, comments and likes? Points members earned here are removed too. This can\'t be undone.');
    expect(msgs[2]).toContain('Delete "Busy" and its 12 posts, comments and likes?');
  });
});

describe("community admin: new channel", () => {
  it("is a ChannelForm bound to createChannelAction, with the creator's products, outside any Disclosure", async () => {
    const create = elements(await call()).find((e) => e.type === ChannelForm && e.props.submitLabel === "Create channel")!;
    expect(create.props.action).toBe(M.createChannelAction);
    expect(create.props.products).toEqual([{ id: "pr_1", title: "Masterclass" }]);
    expect(create.props.channel).toBeUndefined();
    expect(create.ancestors.some((a) => a.type === Disclosure)).toBe(false);
  });
});

describe("community admin: banned members", () => {
  it("says nobody is banned, without a table", async () => {
    const html = await render();
    expect(text(html)).toContain("Nobody is banned.");
    expect(elements(await call()).some((e) => e.type === Table)).toBe(false);
  });

  it("is a named, stacking Table: Member, Since, and an sr-only actions column", async () => {
    M.listBans.mockResolvedValue([ban(), ban({ userId: "u_10", name: "Neha Iyer", createdAt: new Date("2026-10-01T06:30:00Z") })]);
    const html = await render();
    const table = elements(await call()).find((e) => e.type === Table)!;
    expect(table.props["aria-label"]).toBe("Banned members");
    expect(table.props.stack).toBe(true);
    expect(html).toContain('data-stack="true"');
    const heads = [...html.matchAll(/<th\b[^>]*>(.*?)<\/th>/g)].map((m) => m[1]);
    expect(heads.map((h) => text(h).trim())).toEqual(["Member", "Since", "Actions"]);
    expect(heads[2]).toContain("sr-only");
    expect(html).toContain('data-label="Member"');
    expect(html).toContain('data-label="Since"');
  });

  it("shows each member with the ban date in a DateCell", async () => {
    M.listBans.mockResolvedValue([ban(), ban({ userId: "u_10", name: "Neha Iyer", createdAt: new Date("2026-10-01T06:30:00Z") })]);
    const els = elements(await call());
    expect(els.filter((e) => e.type === DateCell).map((e) => e.props.date)).toEqual([new Date("2026-10-15T06:30:00Z"), new Date("2026-10-01T06:30:00Z")]);
    expect(els.filter((e) => e.type === Td && e.props.label === "Member").map((e) => e.props.children)).toEqual(["Ravi Kumar", "Neha Iyer"]);
    const html = await render();
    expect(html).toContain("15 Oct 2026");
    expect(html).toContain("1 Oct 2026");
  });

  it("Unban is a secondary small Button per row, bound to THAT member, named for them, 44px on touch, with no dialog", async () => {
    M.listBans.mockResolvedValue([ban(), ban({ userId: "u_10", name: "Neha Iyer" })]);
    const els = elements(await call());
    const unbans = els.filter((e) => e.type === Button && e.props.children === "Unban");
    expect(unbans.map((u) => [u.props["aria-label"], bound(u).action, bound(u).args])).toEqual([
      ["Unban Ravi Kumar", "unbanMemberAction", ["u_9"]],
      ["Unban Neha Iyer", "unbanMemberAction", ["u_10"]],
    ]);
    for (const u of unbans) {
      expect(u.props.variant).toBe("secondary");
      expect(u.props.size).toBe("sm");
      expect(u.props.className).toContain("pointer-coarse:min-h-11");
      expect(u.props.type).toBe("submit");
    }
    expect(els.filter((e) => e.type === ConfirmButton && bound(e).action === "unbanMemberAction")).toEqual([]);
  });

  it("wraps a long member name instead of overflowing", async () => {
    M.listBans.mockResolvedValue([ban({ name: "A".repeat(80) })]);
    const cell = elements(await call()).find((e) => e.type === Td && e.props.label === "Member")!;
    expect(cell.props.className).toMatch(/wrap-anywhere|break-words/);
  });
});

describe("community admin: banned members header row", () => {
  it("is marked role=row, like every body row", async () => {
    M.listBans.mockResolvedValue([ban()]);
    expect(headRowTags(await render())).toEqual(['<tr role="row">']);
  });
});

describe("community admin: gamification", () => {
  const section = (html: string) => html.slice(html.indexOf("Points, levels and badges"));

  it("when on: says so, offers a confirmed Turn off and Recalculate, and keeps the Safe-to-repeat hint", async () => {
    const html = await render();
    expect(text(section(html))).toContain("It's on.");
    expect(text(section(html))).toContain("Safe to repeat: nothing is awarded twice.");
    const els = elements(await call());
    const off = els.find((e) => e.type === ConfirmButton && bound(e).action === "setGamificationAction")!;
    expect(bound(off).args).toEqual([false]);
    expect(off.props.children).toBe("Turn off");
    expect(off.props.confirmLabel).toBe("Turn off");
    expect(off.props.variant).toBe("secondary");
    expect(off.props.className).toContain("pointer-coarse:min-h-11");
    const recalc = els.find((e) => e.type === Button && e.props.children === "Recalculate from progress")!;
    expect(bound(recalc).action).toBe("recalculatePointsAction");
    expect(bound(recalc).args).toBeUndefined();
    expect(recalc.props.variant).toBe("secondary");
    expect(recalc.props.size).toBe("sm");
    expect(recalc.props.className).toContain("pointer-coarse:min-h-11");
  });

  it("the Turn off dialog states the consequence: no awards, leaderboard hidden, earned points kept", async () => {
    const off = elements(await call()).find((e) => e.type === ConfirmButton && bound(e).action === "setGamificationAction")!;
    expect(off.props.message).toBe(
      "Turn off points, levels and badges? Nothing new is awarded, the leaderboard is hidden, and members stop seeing their own points and level. Points members already earned are kept.",
    );
  });

  it("confirms Turn off in the calm primary look (it is reversible); Delete keeps the destructive default", async () => {
    const els = elements(await call());
    const off = els.find((e) => e.type === ConfirmButton && bound(e).action === "setGamificationAction")!;
    expect(off.props.destructive).toBe(false);
    const del = els.find((e) => e.type === ConfirmButton && bound(e).action === "deleteChannelAction")!;
    expect(del.props.destructive).toBeUndefined();
  });

  it("recalculating is not destructive: no dialog on it", async () => {
    const els = elements(await call());
    expect(els.filter((e) => e.type === ConfirmButton && bound(e).action === "recalculatePointsAction")).toEqual([]);
  });

  it("when off: says what stops, offers a plain Turn on (no dialog), and no Recalculate or hint", async () => {
    M.creator = { id: "cr_1", handle: "meera", gamificationEnabled: false };
    const html = await render();
    expect(text(section(html))).toContain("It's off: nothing is awarded and the leaderboard is hidden.");
    expect(text(section(html))).not.toContain("Safe to repeat");
    const els = elements(await call());
    const on = els.find((e) => e.type === Button && e.props.children === "Turn on")!;
    expect(bound(on).action).toBe("setGamificationAction");
    expect(bound(on).args).toEqual([true]);
    expect(on.props.variant).toBe("secondary");
    expect(on.props.size).toBe("sm");
    expect(on.props.className).toContain("pointer-coarse:min-h-11");
    expect(els.some((e) => e.type === ConfirmButton && e.props.children === "Turn off")).toBe(false);
    expect(els.some((e) => e.type === Button && e.props.children === "Recalculate from progress")).toBe(false);
  });
});

describe("community admin: queries pin the signed-in creator", () => {
  it("ensures the default channel, lists channels and bans, and reads only this creator's products", async () => {
    await render();
    expect(M.ensureDefaultChannel).toHaveBeenCalledWith("cr_1");
    expect(M.listChannelsAdmin).toHaveBeenCalledWith("cr_1");
    expect(M.listBans).toHaveBeenCalledWith("cr_1");
    expect(M.findProducts.mock.calls[0][0]).toEqual({ where: { creatorId: "cr_1" }, select: { id: true, title: true }, orderBy: { createdAt: "asc" } });
  });
});

describe("community admin: RSC boundary", () => {
  it("passes no function props except bound server actions; Disclosure, ChannelForm and ConfirmButton are the client boundaries", async () => {
    M.listChannelsAdmin.mockResolvedValue([chan({ id: "ch_1" }), chan({ id: "ch_2", name: "Wins" })]);
    M.listBans.mockResolvedValue([ban()]);
    const visited = new Set<unknown>();
    const found = functionProps(await call(), BOUNDARIES, { onVisit: (t) => visited.add(t) });
    // Order: the New channel form; then per channel the edit form, move up, move down, delete; then the unban form; then gamification (turn off, recalculate).
    expect(found).toEqual([
      "<ChannelForm>.action",
      "<ChannelForm>.action", "<form>.action", "<form>.action", "<form>.action",
      "<ChannelForm>.action", "<form>.action", "<form>.action", "<form>.action",
      "<form>.action",
      "<form>.action", "<form>.action",
    ]);
    for (const type of [ConfirmButton, ChannelForm, Disclosure, Button, Table, ButtonLink]) expect(visited.has(type), String(type)).toBe(true);
  });

  it("the off state and the empty ban list are walked too", async () => {
    M.creator = { id: "cr_1", handle: "meera", gamificationEnabled: false };
    const visited = new Set<unknown>();
    expect(functionProps(await call(), BOUNDARIES, { onVisit: (t) => visited.add(t) })).toEqual(["<ChannelForm>.action", "<ChannelForm>.action", "<form>.action", "<form>.action", "<form>.action", "<form>.action"]);
    expect(visited.has(Disclosure)).toBe(true);
  });

  it("positive control: the same walk reports a function prop planted in the page tree", async () => {
    const planted = (<>{await call()}<button onClick={() => {}}>x</button></>);
    expect(functionProps(planted, BOUNDARIES)).toContain("<button>.onClick");
  });

  it("the page does not read into a client export (no dotted access on Disclosure)", () => {
    expect(readFileSync(PAGE_PATH, "utf8")).not.toMatch(/Disclosure\.|Disclosure\[/);
  });
});
