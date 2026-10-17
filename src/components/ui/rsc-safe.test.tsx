import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { Component, createContext, use, useCallback, useContext, useId, useMemo, useState } from "react";
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
import * as ui from "./index";
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

  // `user`, `username` and `useCase` merely START with "use". Only the hook names are the dispatcher error; a primitive
  // doing `session.user` on a null value is a real bug and must not become an unwalked "client boundary".
  it.each(["user", "username", "useCase", "used", "userId"])("rethrows a null dereference reading '%s' (not a hook)", (prop) => {
    const NullDeref = () => {
      const viewer = null as unknown as Record<string, string>;
      return <span>{viewer[prop]}</span>;
    };
    expect(() => functionProps(<div><NullDeref /></div>)).toThrow(new RegExp(`NullDeref> threw while being walked[\\s\\S]*reading '${prop}'`));
  });

  it("does not treat an error that merely mentions a dispatcher as a hook error", () => {
    const Mentions = () => {
      throw new Error("failed to flush the email dispatcher queue");
    };
    expect(() => functionProps(<Mentions />)).toThrow(/Mentions> threw while being walked[\s\S]*email dispatcher/);
  });

  it.each([
    ["useState", () => useState(0)],
    ["useContext", () => useContext(createContext(0))],
    ["use", () => use(createContext(0))],
  ])("still treats a bare %s call as the hook boundary", (_name, hook) => {
    const NeedsHook = (props: { onPick: () => void }) => {
      void props;
      hook();
      return <span />;
    };
    expect(functionProps(<NeedsHook onPick={() => {}} />)).toEqual(["<NeedsHook>.onPick"]);
  });

  // A hook in a primitive with no "use client" is the original failure shape (production 500, tests pass), so the walk
  // must say which components it classified as boundaries on its own, not only fold them into the answer silently.
  it("reports each hook boundary it hit through onImplicitBoundary", () => {
    const NeedsState = () => {
      const [n] = useState(0);
      return <span>{n}</span>;
    };
    const hit: Array<[string, string]> = [];
    expect(functionProps(<div><NeedsState /></div>, [], { onImplicitBoundary: (name, reason) => hit.push([name, reason]) })).toEqual([]);
    expect(hit).toEqual([["NeedsState", "hook"]]);
    // A listed boundary is the caller's own statement, not an implicit one.
    const listed: string[] = [];
    functionProps(<NeedsState />, [NeedsState], { onImplicitBoundary: (name) => listed.push(name) });
    expect(listed).toEqual([]);
  });

  it("refuses an async component rather than ending the walk with no finding", () => {
    const AsyncPage = async () => <button onClick={() => {}}>x</button>;
    expect(() => functionProps(<AsyncPage />)).toThrow(/async component[\s\S]*functionProps\(await AsyncPage\(props\)\)/);
  });

  // Settling the result used to call `then(undefined, noop)`, so a thenable whose `then(res)` calls `res` blew up with
  // "res is not a function" and the real message was lost.
  it("names the async component even when its result is a foreign thenable", () => {
    const Thenable = (() => ({ then: (res: () => void) => res() })) as unknown as () => never;
    expect(() => functionProps(<Thenable />)).toThrow(/Thenable> is an async component/);
  });

  it("treats a class component as a boundary: props checked, never called, and reported", () => {
    class Panel extends Component<{ onOpen: () => void }> {
      render() {
        return <button onClick={() => {}}>x</button>;
      }
    }
    const hit: Array<[string, string]> = [];
    const found = functionProps(<Panel onOpen={() => {}} />, [], { onImplicitBoundary: (name, reason) => hit.push([name, reason]) });
    expect(found).toEqual(["<Panel>.onOpen"]);
    expect(hit).toEqual([["Panel", "class"]]);
  });

  it("reports a function passed as children, which a render prop on a boundary would be", () => {
    expect(fnProps(<Link href="/x">{((): null => null) as never}</Link>)).toEqual(["<Client>.children"]);
    expect(functionProps(<div>{(() => null) as never}</div>)).toEqual(["<div>.children"]);
  });

  // useId / useMemo / useCallback work in a real server component, so a component using them is walked, not skipped.
  it("calls a component that uses only server-safe hooks and walks what it renders", () => {
    const ServerSafe = () => {
      const id = useId();
      const label = useMemo(() => "x", []);
      const click = useCallback(() => {}, []);
      return <button id={id} onClick={click}>{label}</button>;
    };
    const hit: string[] = [];
    expect(functionProps(<ServerSafe />, [], { onImplicitBoundary: (name) => hit.push(name) })).toEqual(["<button>.onClick"]);
    expect(hit).toEqual([]);
  });

  it("reports every component type it visits, so a case cannot claim a component it never rendered", () => {
    const Leaf = () => <i />;
    const Branch = () => <Leaf />;
    const seen = new Set<unknown>();
    functionProps(<Branch />, [], { onVisit: (t) => seen.add(t) });
    expect(seen).toEqual(new Set([Branch, Leaf]));
  });
});

type Tree = Parameters<typeof functionProps>[0];

// A server component may render each of these directly, so none may leave a function prop in the tree.
// `covers` names the `./index` exports the case exercises; the completeness guard below checks it against the real list.
const cases: Record<string, { covers: string[]; render: () => Tree }> = {
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
    const visited = new Set<unknown>();
    const implicit: string[] = [];
    const found = functionProps(cases[name].render(), boundaries, {
      onVisit: (type) => visited.add(type),
      onImplicitBoundary: (component, reason) => implicit.push(`${component} (${reason})`),
    });
    expect(found).toEqual([]);
    // No primitive in `ui/index` may need a hook or a class. One that does is client-only without a "use client" file:
    // every SSR test still passes and the route 500s, which is the failure this whole harness exists to stop.
    expect(implicit).toEqual([]);
    // `covers` is a claim; hold it to what the walk actually rendered.
    const exports = ui as Record<string, unknown>;
    expect(cases[name].covers.filter((exportName) => !visited.has(exports[exportName]))).toEqual([]);
  });
});

// Exports that need a client component (they use hooks, state or browser APIs) and so are never rendered from a server component.
const CLIENT_ONLY = ["Tabs", "TabPanel", "SegmentedControl", "Dialog", "ConfirmDialog", "Toaster", "Disclosure"];
// Exports that are not components: class-name builders, pure helpers, imperative toast calls.
const NOT_COMPONENTS = ["buttonClass", "trueMinus", "nextIndex", "isLinkActive", "tabId", "tabPanelId", "nextFocusIndex", "toast", "dismissToast", "computeTicks"];

describe("every ui export is audited", () => {
  it("lists only lower-case helpers in NOT_COMPONENTS, so a component cannot hide there", () => {
    expect(NOT_COMPONENTS.filter((name) => !/^[a-z]/.test(name))).toEqual([]);
  });

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
// A function reaches a prop as `onX={`, as `onX:` inside an object prop, or as an inline arrow in ANY prop
// (`render={(row) => ...}`, `action={async () => ...}`, `ref={el => ...}`). `onX?:` (an optional type member) is not a value.
const HANDLER_NAME = /\bon[A-Z]\w*\s*[=:]/;
const INLINE_FUNCTION_PROP = /=\{\s*(?:async\s+)?(?:\([^)]*\)|\w+)\s*=>/;
/** True for a module that is not a client module yet attaches a function to a prop (see the two patterns above). */
function wiresHandlerWithoutClientDirective(source: string): boolean {
  return !declaresUseClient(source) && (HANDLER_NAME.test(source) || INLINE_FUNCTION_PROP.test(source));
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

  // Each of these is a way a function reaches a prop without a literal `onX={`; all were invisible to the first scan.
  it.each([
    ["an object-prop handler", 'export const A = () => <Row action={{ label: "x", onClick: go }} />;'],
    ["an object-prop handler with a space before the colon", "const a = { onSelect : pick };"],
    ["an inline arrow in a non-on prop", "export const A = () => <List render={(row) => <b>{row}</b>} />;"],
    ["an inline arrow with a bare parameter", "export const A = () => <List formatter={v => v.toFixed(2)} />;"],
    ["an inline async arrow", "export const A = () => <Form action={async () => { await save(); }} />;"],
    ["an inline async arrow with a parameter", "export const A = () => <Form action={async (fd) => { await save(fd); }} />;"],
    ["a ref callback", "export const A = () => <input ref={el => { x = el; }} />;"],
  ])("flags %s in a module with no directive, and not once it declares one", (_label, source) => {
    expect(wiresHandlerWithoutClientDirective(source)).toBe(true);
    expect(wiresHandlerWithoutClientDirective('"use client";\n' + source)).toBe(false);
  });

  it.each([
    ["a plain element", "export const A = () => <a href=\"/x\" className=\"b\">x</a>;"],
    ["a non-function expression prop", "export const A = () => <Money paise={total} items={[1, 2]} style={{ color: 'red' }} />;"],
    ["an identifier that merely starts with on", "const onlineCount = 3; const one = 1; const x = { once: true };"],
    ["an optional handler type (never a value)", "interface P { onClick?: never }"],
  ])("does not flag %s", (_label, source) => {
    expect(wiresHandlerWithoutClientDirective(source)).toBe(false);
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

// ---------------------------------------------------------------------------------------------------------------
// Route coverage. A new page that hands a function to a client component 500s in production and passes every SSR test,
// so each non-client page/layout that imports a first-party client module must be walked by some test (`functionProps`).
// "Walked" means: a test file that calls `functionProps(` and imports the route. It does not prove the walk reaches the
// client component (a weak test could still skip it), but it makes an unwalked route a visible, named decision.
// ---------------------------------------------------------------------------------------------------------------
interface ImportRef {
  spec: string;
  names: string[];
}

/** Value imports and dynamic imports of a module (`import type` is erased at compile time, so it is skipped). */
function importsOf(source: string): ImportRef[] {
  const refs: ImportRef[] = [];
  for (const match of source.matchAll(/^\s*import\s+(?!type\b)([\s\S]*?)\s+from\s+["']([^"']+)["']/gm)) {
    const names = match[1].replace(/[{}]/g, " ").split(",").map((part) => part.trim().split(/\s+as\s+/)[0].trim()).filter(Boolean);
    refs.push({ spec: match[2], names });
  }
  for (const match of source.matchAll(/\bimport\(\s*["']([^"']+)["']\s*\)/g)) refs.push({ spec: match[1], names: [] });
  return refs;
}

/** Resolves `@/x` and relative specs to a file under src, or null for packages and anything that does not exist. */
function resolveFirstParty(fromFile: string, spec: string): string | null {
  const base = spec.startsWith("@/") ? path.join(SRC_DIR, spec.slice(2)) : spec.startsWith(".") ? path.resolve(path.dirname(fromFile), spec) : null;
  if (base === null) return null;
  for (const candidate of [base, `${base}.tsx`, `${base}.ts`, path.join(base, "index.tsx"), path.join(base, "index.ts")]) {
    try {
      if (statSync(candidate).isFile()) return candidate;
    } catch {
      /* try the next candidate */
    }
  }
  return null;
}

/** True when the module imports a first-party client module, or a client-only export through the `ui` barrel. */
function importsClientModule(file: string, source: string): boolean {
  return importsOf(source).some(({ spec, names }) => {
    const target = resolveFirstParty(file, spec);
    if (target === null) return false;
    if (target === path.join(UI_DIR, "index.ts")) return names.some((name) => CLIENT_ONLY.includes(name));
    return declaresUseClient(readFileSync(target, "utf8"));
  });
}

function allFiles(dir: string, match: (name: string) => boolean): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? allFiles(full, match) : match(entry.name) ? [full] : [];
  });
}

const rel = (file: string) => path.relative(SRC_DIR, file).split(path.sep).join("/");

/** Routes (non-client page/layout) that import a client module, and the set of modules some `functionProps` test imports. */
function routesNeedingAWalk(): string[] {
  return allFiles(path.join(SRC_DIR, "app"), (name) => name === "page.tsx" || name === "layout.tsx")
    .filter((file) => {
      const source = readFileSync(file, "utf8");
      return !declaresUseClient(source) && importsClientModule(file, source);
    })
    .map(rel)
    .sort();
}

function modulesWalkedBySomeTest(): Set<string> {
  const walked = new Set<string>();
  for (const testFile of allFiles(SRC_DIR, (name) => /\.test\.tsx?$/.test(name))) {
    const source = readFileSync(testFile, "utf8");
    if (!/\bfunctionProps\(/.test(source) || testFile === import.meta.filename) continue;
    for (const { spec } of importsOf(source)) {
      const target = resolveFirstParty(testFile, spec);
      if (target) walked.add(rel(target));
    }
  }
  return walked;
}

// Routes that import a client module and have NO functionProps walk yet. This is recorded debt, not a verdict: every
// entry is an unverified server/client boundary. The test below fails both ways, so the list can only shrink by adding
// a walk (like checkout/[productId], checkout/pay/[orderId], orders/[orderId]/invoice, library/[productId], certificates/[publicId], dashboard/(console)/(overview) and dashboard/(console)/products/new, which are walked in src/app/*.test.tsx).
const UNWALKED_ROUTES: string[] = [
  "app/(site)/c/[handle]/community/[channel]/p/[postId]/page.tsx",
  "app/(site)/c/[handle]/community/[channel]/page.tsx",
  "app/(site)/c/[handle]/community/layout.tsx",
  "app/(site)/demo/page.tsx",
  "app/(site)/login/page.tsx",
  "app/(site)/page.tsx",
  "app/(site)/signup/page.tsx",
  "app/dashboard/(console)/community/page.tsx",
  "app/dashboard/(console)/coupons/page.tsx",
  "app/dashboard/(console)/orders/page.tsx",
  "app/dashboard/(console)/products/[id]/page.tsx",
  "app/dashboard/(console)/products/[id]/quiz/[itemId]/page.tsx",
  "app/dashboard/(console)/settings/page.tsx",
  "app/dashboard/onboarding/page.tsx",
  "app/gateway/easebuzz/[orderId]/page.tsx",
];

describe("route coverage: pages that cross into client components are walked", () => {
  it("parses imports the way the guard needs", () => {
    const source = 'import type { A } from "@/x";\nimport { B, C as D } from "@/components/ui";\nimport E from "./e";\nconst m = await import("./page");';
    expect(importsOf(source)).toEqual([
      { spec: "@/components/ui", names: ["B", "C"] },
      { spec: "./e", names: ["E"] },
      { spec: "./page", names: [] },
    ]);
  });

  it("recognises the checkout and pay pages as walked, without a second walk of its own", () => {
    const walked = modulesWalkedBySomeTest();
    expect(walked.has("app/(site)/checkout/[productId]/page.tsx")).toBe(true);
    expect(walked.has("app/(site)/checkout/pay/[orderId]/page.tsx")).toBe(true);
  });

  it("has a walk for every such route, except the recorded ones (and the record has no stale entries)", () => {
    const walked = modulesWalkedBySomeTest();
    const unwalked = routesNeedingAWalk().filter((route) => !walked.has(route));
    expect(unwalked).toEqual([...UNWALKED_ROUTES].sort());
  });
});

describe("Button's loading guard still works where it is needed", () => {
  it("attaches a handler only when loading or when the caller passes onClick", () => {
    expect(fnProps(<Button>Plain</Button>)).toEqual([]);
    expect(fnProps(<Button loading>Busy</Button>)).toEqual(["<button>.onClick"]);
    expect(fnProps(<Button onClick={() => {}}>Click</Button>)).toEqual(["<button>.onClick"]);
  });
});
