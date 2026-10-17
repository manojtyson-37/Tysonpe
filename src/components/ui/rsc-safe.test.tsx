import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import Link from "next/link";
import { Button, ButtonLink } from "./button";
import { Badge, StatusBadge } from "./badge";
import { Surface } from "./surface";
import { Callout } from "./callout";
import { EmptyState, Empty } from "./empty";
import { PageHeader } from "./page-header";
import { Money, Price } from "./money";
import { Stat, StatStrip, MetricList, MetricRow } from "./stat";
import { Progress } from "./progress";
import { Avatar } from "./avatar";
import { AvatarImage } from "./avatar-image";
import { Skeleton, SkeletonText, SkeletonAvatar } from "./skeleton";
import { Table, Th, Tr, Td, MoneyCell, DateCell, RowActions, EmptyRow } from "./table";
import { BarChart, Sparkline } from "./chart";
import { IconPlus } from "../icons";
import { functionProps } from "@/test/rsc-safe";

// Client components are listed so the walk checks only the props that cross into them.
const boundaries = [Link, AvatarImage];
const fnProps = (node: Parameters<typeof functionProps>[0]) => functionProps(node, boundaries);

describe("functionProps (the checker itself)", () => {
  it("finds a handler on a host element, through nested function components and arrays", () => {
    const Inner = () => <button onClick={() => {}}>x</button>;
    const Outer = () => <div>{[<Inner key="a" />]}</div>;
    expect(functionProps(<Outer />)).toEqual(["<button>.onClick"]);
  });

  it("finds a function passed to a client boundary, and ignores children and undefined handlers", () => {
    expect(fnProps(<Link href="/x" onNavigate={() => {}}>go</Link>)).toEqual(["<Client>.onNavigate"]);
    expect(fnProps(<button onClick={undefined}>{"text"}</button>)).toEqual([]);
  });

  it("treats a component that really needs hooks as a boundary instead of crashing", () => {
    const NeedsState = (props: { onPick: () => void }) => {
      void props;
      const [n] = useState(0);
      return <span>{n}</span>;
    };
    expect(functionProps(<NeedsState onPick={() => {}} />)).toEqual(["<NeedsState>.onPick"]);
  });

  it("also recognises the explicit invalid-hook-call message", () => {
    const NeedsHooks = (props: { onPick: () => void }) => {
      void props;
      throw new Error("Invalid hook call. Hooks can only be called inside of the body of a function component.");
    };
    expect(functionProps(<NeedsHooks onPick={() => {}} />)).toEqual(["<NeedsHooks>.onPick"]);
  });

  // A swallowed error would reclassify the component as a client boundary and leave its whole subtree unchecked.
  it("rethrows an error that is not a hook error instead of skipping the subtree", () => {
    const Broken = (props: { onPick: () => void }) => {
      void props;
      throw new Error("boom: bad prop");
    };
    expect(() => functionProps(<div><Broken onPick={() => {}} /></div>)).toThrow(/Broken>[\s\S]*boom: bad prop/);
    const NullDeref = () => {
      const row = null as unknown as { id: string };
      return <span>{row.id}</span>;
    };
    expect(() => functionProps(<NullDeref />)).toThrow(/NullDeref/);
  });

  it("refuses an async component rather than ending the walk with no finding", () => {
    const AsyncPage = async () => <button onClick={() => {}}>x</button>;
    expect(() => functionProps(<AsyncPage />)).toThrow(/async component.*await it before walking/);
  });
});

type Node = Parameters<typeof functionProps>[0];

// A server component may render each of these directly, so none may leave a function prop in the tree.
// `covers` names the `./index` exports the case exercises; the completeness guard below checks it against the real list.
const cases: Record<string, { covers: string[]; render: () => Node }> = {
  "Button (plain)": { covers: ["Button"], render: () => <Button>Apply</Button> },
  "Button (submit, variant, size, icon, className)": {
    covers: ["Button"],
    render: () => <Button type="submit" variant="secondary" size="lg" icon={<IconPlus />} className="w-full">Apply</Button>,
  },
  "ButtonLink": { covers: ["ButtonLink"], render: () => <ButtonLink href="/x" variant="secondary" icon={<IconPlus />}>Go</ButtonLink> },
  "Badge": { covers: ["Badge"], render: () => <Badge tone="good" dot>Live</Badge> },
  "StatusBadge": { covers: ["StatusBadge"], render: () => <StatusBadge status="paid" /> },
  "Surface": { covers: ["Surface"], render: () => <Surface as="section" tone="interactive" padding="lg">x</Surface> },
  "Callout": { covers: ["Callout"], render: () => <Callout tone="bad" action={<ButtonLink href="/x">Fix</ButtonLink>}>Nope</Callout> },
  "EmptyState (link actions)": {
    covers: ["EmptyState"],
    render: () => <EmptyState title="Nothing" body="b" action={{ label: "Add", href: "/a" }} secondaryAction={{ label: "Docs", href: "/d" }} />,
  },
  "EmptyState (no action)": { covers: ["EmptyState"], render: () => <EmptyState title="Nothing" inline /> },
  "Empty": { covers: ["Empty"], render: () => <Empty title="Nothing" body="b" cta={{ label: "Add", href: "/a" }} /> },
  "PageHeader": {
    covers: ["PageHeader"],
    render: () => <PageHeader title="T" sub="s" back={{ label: "Back", href: "/" }} meta={<Badge>m</Badge>} actions={<ButtonLink href="/n">New</ButtonLink>} />,
  },
  "Money / Price": {
    covers: ["Money", "Price"],
    render: () => <><Money paise={12345} sign="−" tone="good" free /><Price paise={50000} period="month" gstNote="incl. GST" /></>,
  },
  "Stat / StatStrip": {
    covers: ["Stat", "StatStrip"],
    render: () => <><Stat label="Net" value="1" delta="-3%" /><StatStrip items={[{ label: "a", value: "1" }, { label: "b", value: "2" }]} /></>,
  },
  "MetricList / MetricRow": {
    covers: ["MetricList", "MetricRow"],
    render: () => <MetricList><MetricRow label="Total" value={<Money paise={100} />} sub="s" strong /></MetricList>,
  },
  "Progress": { covers: ["Progress"], render: () => <Progress value={3} max={8} label="Completion" /> },
  "Avatar": { covers: ["Avatar"], render: () => <Avatar name="Asha" src="/a.png" /> },
  "Skeleton family": {
    covers: ["Skeleton", "SkeletonText", "SkeletonAvatar"],
    render: () => <><Skeleton width={10} height={10} /><SkeletonText lines={2} /><SkeletonAvatar /></>,
  },
  "BarChart / Sparkline": {
    covers: ["BarChart", "Sparkline"],
    render: () => (
      <>
        <BarChart label="Net revenue" positiveMoney data={[{ label: "Mon", value: 100 }, { label: "Tue", value: 250 }]} />
        <Sparkline label="Orders" data={[1, 3, 2, 5]} />
      </>
    ),
  },
  "Table and every cell": {
    covers: ["Table", "Th", "Tr", "Td", "MoneyCell", "DateCell", "RowActions", "EmptyRow"],
    render: () => (
      <Table caption="Orders" stack stickyHeader>
        <thead><tr><Th>Order</Th><Th align="right">Amount</Th></tr></thead>
        <tbody>
          <Tr><Td label="Order">#1</Td><MoneyCell paise={100} label="Amount" /><DateCell date={new Date(0)} /><RowActions><ButtonLink href="/o/1" variant="ghost">View</ButtonLink></RowActions></Tr>
          <EmptyRow colSpan={4} title="Nothing" action={<ButtonLink href="/x">Add</ButtonLink>} />
        </tbody>
      </Table>
    ),
  },
};

describe("server-renderable primitives carry no function props", () => {
  it.each(Object.keys(cases))("%s", (name) => {
    expect(fnProps(cases[name].render())).toEqual([]);
  });
});

// Exports that need a client component (they use hooks, state or browser APIs) and so are never rendered from a server component.
const CLIENT_ONLY = ["Tabs", "TabPanel", "SegmentedControl", "Dialog", "ConfirmDialog", "Toaster", "Disclosure"];
// Exports that are not components: class-name builders, pure helpers, imperative toast calls.
const NOT_COMPONENTS = ["buttonClass", "trueMinus", "nextIndex", "isLinkActive", "tabId", "tabPanelId", "nextFocusIndex", "toast", "dismissToast", "computeTicks"];

describe("every ui export is audited", () => {
  it("is in the server-render cases, CLIENT_ONLY or NOT_COMPONENTS, so a new export cannot slip through unlisted", async () => {
    const exported = Object.keys(await import("./index"));
    const covered = new Set([...Object.values(cases).flatMap((c) => c.covers), ...CLIENT_ONLY, ...NOT_COMPONENTS]);
    expect(exported.filter((name) => !covered.has(name))).toEqual([]);
    // And the lists name only real exports, so a rename or removal cannot leave a stale entry vouching for nothing.
    expect([...covered].filter((name) => !exported.includes(name))).toEqual([]);
  });

  it("keeps CLIENT_ONLY honest: each of those files declares \"use client\"", () => {
    const fileOf: Record<string, string> = {
      Tabs: "tabs.tsx", TabPanel: "tabs.tsx", SegmentedControl: "tabs.tsx", Dialog: "dialog.tsx", ConfirmDialog: "dialog.tsx",
      Toaster: "toast.tsx", Disclosure: "disclosure.tsx",
    };
    expect(Object.keys(fileOf).sort()).toEqual([...CLIENT_ONLY].sort());
    for (const file of new Set(Object.values(fileOf))) {
      expect(declaresUseClient(readFileSync(path.join(UI_DIR, file), "utf8")), file).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------------------------------------------
// Static scan. The tree walk only covers what someone remembered to list; this does not depend on memory. A file
// without "use client" that wires a JSX event handler is only safe if its handler is conditional or never reached from
// a server component, so each one must be reviewed and named here. This would have flagged Button at Task 3.
// ---------------------------------------------------------------------------------------------------------------
const SRC_DIR = path.resolve(import.meta.dirname, "../..");
const UI_DIR = import.meta.dirname;

/** True when the module opens with a "use client" directive (after any leading comments or blank lines). */
function declaresUseClient(source: string): boolean {
  return /^(?:\s|\/\/[^\n]*\n|\/\*[\s\S]*?\*\/)*["']use client["']/.test(source);
}
/** True for a module that is not a client module yet attaches a JSX event handler (`onClick={...}`). */
function wiresHandlerWithoutClientDirective(source: string): boolean {
  return !declaresUseClient(source) && /\bon[A-Z]\w*=\{/.test(source);
}

function tsxFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return tsxFiles(full);
    return entry.name.endsWith(".tsx") && !entry.name.endsWith(".test.tsx") ? [full] : [];
  });
}

// Reviewed: each attaches a handler only on a path a server component does not take. Add to this list only with a reason.
const HANDLER_ALLOWLIST: Record<string, string> = {
  "components/ui/button.tsx": "onClick is built only when `loading` or the caller's onClick is set; a plain Button carries none",
  "components/ui/empty.tsx": "the onClick action variant is client-only by type; the href variant (what a server caller uses) has no handler",
};

describe("static scan: handlers in modules that are not client modules", () => {
  it("recognises the directive, and the original Button shape as unsafe", () => {
    expect(declaresUseClient('"use client";\nimport x from "y";')).toBe(true);
    expect(declaresUseClient("// note\n/* block */\n'use client'\n")).toBe(true);
    expect(declaresUseClient('import x from "y";\n// "use client"')).toBe(false);
    // The Task 3 bug: an unconditional handler in a file with no directive.
    const original = 'export function Button({ onClick }) { return <button onClick={(e) => { onClick?.(e); }}>x</button>; }';
    expect(wiresHandlerWithoutClientDirective(original)).toBe(true);
    expect(wiresHandlerWithoutClientDirective('"use client";\n' + original)).toBe(false);
    expect(wiresHandlerWithoutClientDirective("export const A = () => <a href=\"/x\">x</a>;")).toBe(false);
  });

  it("finds exactly the allowlisted files under src", () => {
    const flagged = tsxFiles(SRC_DIR)
      .filter((file) => wiresHandlerWithoutClientDirective(readFileSync(file, "utf8")))
      .map((file) => path.relative(SRC_DIR, file).split(path.sep).join("/"))
      .sort();
    // Anything extra is a new unreviewed handler; anything missing is a stale entry that no longer vouches for a file.
    expect(flagged).toEqual(Object.keys(HANDLER_ALLOWLIST).sort());
  });
});

describe("Button's loading guard still works where it is needed", () => {
  it("attaches a handler only when loading or when the caller passes onClick", () => {
    expect(fnProps(<Button>Plain</Button>)).toEqual([]);
    expect(fnProps(<Button loading>Busy</Button>)).toEqual(["<button>.onClick"]);
    expect(fnProps(<Button onClick={() => {}}>Click</Button>)).toEqual(["<button>.onClick"]);
  });
});
