import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { clientExportsOf, clientReferenceMisuse, declaresUseClient, importsClientExport, namedImports, resetClientExportsCache, resolveFirstParty, sourceFiles } from "./client-imports";

const SRC = path.resolve(import.meta.dirname, "..");

// A tiny src tree: a client module, a barrel without the directive that re-exports it, and a plain module.
let root: string;
const at = (name: string) => path.join(root, name);
beforeAll(() => {
  root = mkdtempSync(path.join(tmpdir(), "client-imports-"));
  mkdirSync(path.join(root, "components"));
  writeFileSync(at("components/Client.tsx"), '"use client";\nexport const KIND: Record<string, string> = {};\nexport const Comp = () => null;\nexport function helper() { return 1; }\nexport default function Def() { return null; }\n');
  writeFileSync(at("components/barrel.ts"), 'export { Comp, KIND as KINDS } from "./Client";\nexport { plain } from "./plain";\n');
  writeFileSync(at("components/plain.ts"), "export const plain: Record<string, string> = {};\n");
  // `export *` barrels: one star-exports the client module and a plain one, the next star-exports that barrel.
  writeFileSync(at("components/starbarrel.ts"), 'export * from "./Client";\nexport * from "./plain";\n');
  writeFileSync(at("components/chain.ts"), 'export * from "./starbarrel";\n');
  // import-then-export: the client reference is re-exported under another name, and as the default.
  writeFileSync(at("components/reexport.ts"), 'import { KIND as K2, Comp as C2 } from "./Client";\nexport { K2 as KIND2, C2 };\nexport const KIND3 = K2;\nexport default K2;\n');
  // a server module that re-exports only types and values of its own: nothing client in it.
  writeFileSync(at("components/serverbarrel.ts"), 'import type { Thing } from "./Client";\nexport type { Thing };\nexport const own = {};\n');
  // namespace re-exports: `export * as ns from`, `import * as C; export { C }` (also renamed), and a star over either.
  writeFileSync(at("components/nsbarrel.ts"), 'export * as ns from "./Client";\n');
  writeFileSync(at("components/nsreexport.ts"), 'import * as C from "./Client";\nexport { C };\nexport { C as D };\n');
  writeFileSync(at("components/nsstar.ts"), 'export * from "./nsbarrel";\nexport * from "./plain";\n');
  // a namespace exported as the default.
  writeFileSync(at("components/nsdefault.ts"), 'import * as C from "./Client";\nexport default C;\n');
});
afterAll(() => rmSync(root, { recursive: true, force: true }));

const misuseWith = (prelude: string, source: string) => clientReferenceMisuse(root, at("page.tsx"), `${prelude}\n${source}`);

const misuse = (source: string) => clientReferenceMisuse(root, at("page.tsx"), `import { KIND, Comp, helper } from "@/components/Client";\nimport Def from "@/components/Client";\nimport { KINDS } from "@/components/barrel";\nimport { plain } from "@/components/plain";\n${source}`);

describe("clientReferenceMisuse (the checker itself)", () => {
  it.each([
    ["dotting into a constant", "const a = KIND.video;"],
    ["optional chaining", "const a = KIND?.video;"],
    ["bracket access (the KIND_LABEL[it.kind] shape)", "const a = KIND[it.kind] ?? it.kind;"],
    ["a JSX expression", "const a = <b>{KIND[k]}</b>;"],
    ["calling a client function", "const a = helper();"],
    ["a default import dotted into", "const a = Def.displayName;"],
    ["a name reached through a barrel, under an alias", "const a = KINDS.video;"],
    ["a member JSX tag on a client reference", "const a = <Comp.Item />;"],
  ])("flags %s", (_label, source) => {
    expect(misuse(source).length).toBeGreaterThan(0);
  });

  it.each([
    ["rendering it as a JSX tag", "const a = <Comp x={1} />;"],
    ["passing it as a value", "const a = <List icon={Comp} table={KIND} />;"],
    ["a value in an object", "const a = { Comp, KIND };"],
    ["a mention in a comment", "// KIND.video is read client side\n/* KIND[x] */"],
    ["a mention in a string", 'const a = "KIND.video"; const b = \'helper()\';'],
    ["an apostrophe in JSX copy before a client reference", "const a = <p>It's {1}</p>; const b = KIND.video;"],
    ["a non-client import dotted into", "const a = plain.video;"],
    ["a local that merely ends with the same letters", "const MYKIND = {}; const a = MYKIND.video; const b = obj.KIND.video;"],
    ["a declaration of the same name in a nested scope's property", "const a = { KIND: 1 };"],
  ])("does not flag %s", (_label, source) => {
    // "an apostrophe" case: the second statement does dot into KIND, so strip it for the clean control.
    const clean = source.includes("It's") ? source.replace(" const b = KIND.video;", "") : source;
    expect(misuse(clean)).toEqual([]);
  });

  it("flags a use that follows an apostrophe in JSX copy (the apostrophe does not open a string)", () => {
    expect(misuse("const a = <p>It's here</p>; const b = KIND.video; const c = <p>can't</p>;").length).toBeGreaterThan(0);
  });

  describe("module graph: export * and namespace imports (invisible to the regex scanner)", () => {
    const STAR = 'import { KIND, Comp, helper, plain } from "@/components/starbarrel";';
    const CHAIN = 'import { KIND, plain } from "@/components/chain";';
    const NS = 'import * as C from "@/components/Client";';
    const NS_STAR = 'import * as B from "@/components/starbarrel";';
    const RE = 'import { KIND2, C2, KIND3 } from "@/components/reexport";\nimport Dflt from "@/components/reexport";';

    it.each([
      ["a name that a barrel re-exports with `export *`", STAR, "const a = KIND.video;"],
      ["a function reached through `export *`", STAR, "const a = helper();"],
      ["a name reached through two levels of `export *`", CHAIN, "const a = KIND[k];"],
      ["a member read on a namespace import", NS, "const a = C.KIND.video;"],
      ["a call on a namespace import member", NS, "const a = C.helper();"],
      ["a bracket read on a namespace import member", NS, "const a = C.KIND[k];"],
      ["a member JSX tag on a namespace member", NS, "const a = <C.Comp.Item />;"],
      ["a namespace import of an `export *` barrel", NS_STAR, "const a = B.KIND.video;"],
      ["a name imported then exported under an alias", RE, "const a = KIND2.video;"],
      ["a name imported then exported as a const alias", RE, "const a = KIND3.video;"],
      ["a default that is an imported client reference", RE, "const a = Dflt.video;"],
      ["an aliased named import", 'import { KIND as K } from "@/components/Client";', "const a = K.video;"],
      ["an arbitrarily named default import", 'import Whatever from "@/components/Client";', "const a = Whatever.displayName;"],
      ["a chain broken over lines", 'import { KIND } from "@/components/Client";', "const a = KIND\n  .video;"],
      ["an optional chain broken over lines", 'import { KIND } from "@/components/Client";', "const a = KIND\n  ?.video;"],
      ["object destructuring", 'import { KIND } from "@/components/Client";', "const { video } = KIND;"],
      ["array destructuring", 'import { KIND } from "@/components/Client";', "const [first] = KIND;"],
      ["an object spread", 'import { KIND } from "@/components/Client";', "const a = { ...KIND };"],
      ["an array spread", 'import { KIND } from "@/components/Client";', "const a = [...KIND];"],
      ["Object.entries", 'import { KIND } from "@/components/Client";', "const a = Object.entries(KIND);"],
      ["Object.keys", 'import { KIND } from "@/components/Client";', "const a = Object.keys(KIND);"],
      ["an `in` test", 'import { KIND } from "@/components/Client";', 'const a = "video" in KIND;'],
      ["a for...in loop", 'import { KIND } from "@/components/Client";', "for (const k in KIND) {}"],
      ["a use after a string that contains /*", 'import { KIND } from "@/components/Client";', 'const s = "/* not a comment"; const a = KIND.video;'],
      ["a use after a string that contains //", 'import { KIND } from "@/components/Client";', 'const s = "http://x"; const a = KIND.video;'],
      ["a use after a comment that contains from \"...\"", 'import { KIND } from "@/components/Client";', '// see import x from "y"\nconst a = KIND.video;'],
      ["a use between two imports separated by a comment naming a module", 'import { KIND } from "@/components/Client";\n/* import { z } from "q" */\nimport { plain } from "@/components/plain";', "const a = KIND.video;"],
    ])("flags %s", (_label, prelude, source) => {
      expect(misuseWith(prelude, source).length).toBeGreaterThan(0);
    });

    it.each([
      ["rendering a name from an `export *` barrel", STAR, "const a = <Comp />; const b = { Comp, KIND };"],
      ["a plain name next to client names in an `export *` barrel", STAR, "const a = plain.video;"],
      ["a plain name two levels down", CHAIN, "const a = plain.video;"],
      ["rendering a namespace member as a tag", NS, "const a = <C.Comp x={1} />;"],
      ["passing a namespace member on as a value", NS, "const a = <List icon={C.Comp} table={C.KIND} />;"],
      ["a plain member of a star barrel's namespace", NS_STAR, "const a = B.plain.video;"],
      ["rendering an imported-then-exported name", RE, "const a = <C2 />; const b = { KIND2 };"],
      ["a type-only re-export", 'import { own } from "@/components/serverbarrel";', "const a = own.video;"],
      ["an import written inside a string and a comment", 'import { plain as p } from "@/components/plain";', '// import { KIND } from "@/components/Client"\nconst s = \'import { KIND } from "@/components/Client"\';\nconst a = p.video;'],
      ["a type-position mention", 'import { KIND } from "@/components/Client";', "type T = typeof KIND; const a = {} as T;"],
      ["a shadowing property name", 'import { KIND } from "@/components/Client";', "const a = obj.KIND.video; const b = { KIND: 1 }.KIND;"],
    ])("does not flag %s", (_label, prelude, source) => {
      expect(misuseWith(prelude, source)).toEqual([]);
    });

    describe("wrappers around the reference (parentheses, as, !, satisfies, <T> assertions)", () => {
      const K = 'import { KIND, Comp, helper } from "@/components/Client";';
      it.each([
        ["a parenthesised read", "const a = (KIND).video;"],
        ["a non-null read", "const a = KIND!.video;"],
        ["an `as` cast then an index", "const a = (KIND as Record<string, string>)[k];"],
        ["a `satisfies` then a read", "const a = (KIND satisfies object).video;"],
        ["stacked wrappers", "const a = ((KIND as any)!).video;"],
        ["a wrapped call", "const a = (helper as () => number)();"],
        ["a wrapped destructure", "const { video } = KIND as Record<string, string>;"],
        ["a wrapped Object.entries argument", "const a = Object.entries(KIND as object);"],
        ["a wrapped spread", "const a = { ...(KIND as object) };"],
        ["a wrapped `in` test", 'const a = "video" in (KIND as object);'],
        ["a spread on a JSX element", "const a = <Comp {...KIND} />;"],
        ["a wrapped spread on a JSX element", "const a = <Comp {...(KIND as object)} />;"],
      ])("flags %s", (_label, source) => {
        expect(misuseWith(K, source).length).toBeGreaterThan(0);
      });

      it.each([
        ["a parenthesised value", "const a = <List table={(KIND)} />;"],
        ["a cast value", "const a = <List table={KIND as object} icon={Comp!} />;"],
        ["a satisfies value", "const a = KIND satisfies object;"],
        ["a wrapped tag value", "const a = { c: (Comp as unknown) };"],
      ])("does not flag %s", (_label, source) => {
        expect(misuseWith(K, source)).toEqual([]);
      });

      it("flags an angle-bracket assertion in a .ts file", () => {
        expect(clientReferenceMisuse(root, at("page.ts"), `${K}\nconst a = (<Record<string, string>>KIND).video;`).length).toBeGreaterThan(0);
        expect(clientReferenceMisuse(root, at("page.ts"), `${K}\nconst a = { t: <object>KIND };`)).toEqual([]);
      });

      it("reports the line of the identifier, not of the wrapper", () => {
        expect(misuseWith(K, "const a = (\n  KIND as object\n).video;")).toEqual(["page.tsx:3: KIND is a client reference; reading into it throws on the server"]);
      });
    });

    describe("namespace re-exports and string-literal member access", () => {
      const NSB = 'import { ns } from "@/components/nsbarrel";';
      const NSR = 'import { C, D } from "@/components/nsreexport";';
      const NSS = 'import { ns, plain } from "@/components/nsstar";';
      it.each([
        ["`export * as ns from` then a member read", NSB, "const a = ns.KIND.video;"],
        ["`export * as ns from` then a member call", NSB, "const a = ns.helper();"],
        ["`import * as C; export { C }` then a member read", NSR, "const a = C.KIND.video;"],
        ["the same, renamed by the export", NSR, "const a = D.KIND[k];"],
        ["a star over a barrel with `export * as`", NSS, "const a = ns.KIND.video;"],
        ["a string-literal member read", NS, "const a = C[\"KIND\"].video;"],
        ["a single-quoted member call", NS, "const a = C['helper']();"],
        ["a template-literal member read", NS, "const a = C[`KIND`].video;"],
        ["a wrapped namespace member", NS, "const a = (C.KIND as object).video;"],
        ["a parenthesised namespace member", NS, "const a = (C.KIND).video;"],
        ["a spread on a JSX element of a namespace member", NS, "const a = <X {...C.KIND} />;"],
        ["a parenthesised namespace", NS, "const a = (C).KIND.video;"],
        ["a namespace cast with `as`", NS, "const a = (C as any).KIND.video;"],
        ["a namespace with a non-null assertion", NS, "const a = C!.KIND.video;"],
        ["a namespace under `satisfies`", NS, "const a = (C satisfies object).helper();"],
        ["a wrapped namespace read by string key", NS, 'const a = ((C as any))["KIND"].video;'],
        ["a namespace that a module exports as its default", 'import C from "@/components/nsdefault";', "const a = C.KIND.video;"],
      ])("flags %s", (_label, prelude, source) => {
        expect(misuseWith(prelude, source).length).toBeGreaterThan(0);
      });

      it.each([
        ["rendering `export * as` members", NSB, "const a = <ns.Comp x={1} />; const b = { k: ns.KIND };"],
        ["passing `import * as; export` members on", NSR, "const a = <List table={C.KIND} icon={D[\"Comp\"]} />;"],
        ["the namespace itself as a value", NSB, "const a = <List mod={ns} />;"],
        ["a plain export next to a namespace in a star barrel", NSS, "const a = plain.video;"],
        ["a string-literal member passed on", NS, 'const a = <List table={C["KIND"]} />;'],
        ["a string-literal member that is a plain export", NS_STAR, 'const a = B["plain"].video;'],
        ["a wrapped namespace whose member is a plain export", NS_STAR, "const a = (B as any).plain.video;"],
        ["a wrapped namespace member passed on", NS, "const a = <List table={(C as any).KIND} icon={(C).Comp} />;"],
        ["a default-exported namespace's member rendered", 'import C from "@/components/nsdefault";', "const a = <C.Comp x={1} />;"],
      ])("does not flag %s", (_label, prelude, source) => {
        expect(misuseWith(prelude, source)).toEqual([]);
      });

      // `import * as M` of a module whose only client exports are namespaces still binds a client module's member.
      it.each([
        ["a namespace-only barrel (`export * as ns from`)", "nsbarrel"],
        ["a namespace-only re-export (`import * as C; export { C }`)", "nsreexport"],
        ["a star over a namespace-only barrel", "nsstar"],
        ["a module whose default is a namespace", "nsdefault"],
      ])("importsClientExport counts `import * as M` of %s", (_label, mod) => {
        expect(importsClientExport(root, at("page.tsx"), { local: "M", imported: "*", spec: `@/components/${mod}` })).toBe(true);
      });

      it("importsClientExport does not count `import * as M` of a module with no client export", () => {
        expect(importsClientExport(root, at("page.tsx"), { local: "M", imported: "*", spec: "@/components/plain" })).toBe(false);
        expect(importsClientExport(root, at("page.tsx"), { local: "M", imported: "*", spec: "@/components/serverbarrel" })).toBe(false);
      });

      it("knows the namespaces a barrel exports", () => {
        expect([...clientExportsOf(root, at("components/nsbarrel.ts")).namespaces.keys()]).toEqual(["ns"]);
        expect([...clientExportsOf(root, at("components/nsreexport.ts")).namespaces.keys()].sort()).toEqual(["C", "D"]);
        expect([...clientExportsOf(root, at("components/nsstar.ts")).namespaces.keys()]).toEqual(["ns"]);
        expect([...clientExportsOf(root, at("components/nsdefault.ts")).namespaces.keys()]).toEqual(["default"]);
      });
    });

    it("reports the line of the identifier even when the chain spans lines", () => {
      expect(misuseWith('import { KIND } from "@/components/Client";', "const a = KIND\n  .video;")).toEqual(["page.tsx:2: KIND is a client reference; reading into it throws on the server"]);
    });

    it("names the namespace member in the finding", () => {
      expect(misuseWith(NS, "const a = C.KIND.video;")).toEqual(["page.tsx:2: C.KIND is a client reference; reading into it throws on the server"]);
    });

    it("knows which names a barrel exports from client modules", () => {
      expect([...clientExportsOf(root, at("components/starbarrel.ts")).names].sort()).toEqual(["Comp", "KIND", "helper"]);
      expect([...clientExportsOf(root, at("components/chain.ts")).names].sort()).toEqual(["Comp", "KIND", "helper"]);
      expect([...clientExportsOf(root, at("components/reexport.ts")).names].sort()).toEqual(["C2", "KIND2", "KIND3", "default"].sort());
      expect(clientExportsOf(root, at("components/serverbarrel.ts")).names.size).toBe(0);
    });
  });

  it("skips a file that is itself a client module", () => {
    const source = '"use client";\nimport { KIND } from "@/components/Client";\nconst a = KIND.video;';
    expect(clientReferenceMisuse(root, at("page.tsx"), source)).toEqual([]);
    expect(clientReferenceMisuse(root, at("page.tsx"), source.replace('"use client";\n', ""))).toHaveLength(1);
  });

  it("reports file, line and name", () => {
    expect(misuse("\nconst a = KIND.video;")).toEqual(["page.tsx:6: KIND is a client reference; reading into it throws on the server"]);
  });

  it("knows the directive, imports and barrel re-exports", () => {
    expect(declaresUseClient('"use client";\nx')).toBe(true);
    expect(declaresUseClient("export const a = 1;")).toBe(false);
    expect(namedImports('import Def, { A as B, type T, C } from "x";\nimport type { Z } from "y";')).toEqual([
      { local: "B", imported: "A", spec: "x" },
      { local: "C", imported: "C", spec: "x" },
      { local: "Def", imported: "default", spec: "x" },
    ]);
    expect([...clientExportsOf(root, at("components/barrel.ts")).names].sort()).toEqual(["Comp", "KINDS"]);
    expect(clientExportsOf(root, at("components/Client.tsx")).all).toBe(true);
    expect(resolveFirstParty(root, at("page.tsx"), "react")).toBeNull();
    expect(declaresUseClient('// header\n/* block */\n\n"use client";\nx')).toBe(true);
    expect(declaresUseClient("'use client'\nx")).toBe(true);
    expect(declaresUseClient('const a = 1;\n"use client";')).toBe(false);
    expect(declaresUseClient('// "use client"\nexport const a = 1;')).toBe(false);
    expect(namedImports('import * as C from "x";\nimport "side";\nimport { type T } from "y";')).toEqual([{ local: "C", imported: "*", spec: "x" }]);
  });
});

describe("static scan: server modules never read into a client module's export", () => {
  // Defensive: start with no kept answer so the scan always reads the real tree. Today it changes nothing, because
  // the earlier tests in this file cache under their temp root, not SRC; this only guards a future test that does.
  beforeAll(() => resetClientExportsCache());
  const files = [...sourceFiles(path.join(SRC, "app")), ...sourceFiles(path.join(SRC, "components"))];
  const server = files.filter((file) => !declaresUseClient(readFileSync(file, "utf8"), file));
  const importsClient = (file: string) => namedImports(readFileSync(file, "utf8"), file).some((imp) => importsClientExport(SRC, file, imp));

  it("is not vacuous: it scans the Task 20-22 server pages, each of which imports a client export", () => {
    const rel = (file: string) => path.relative(SRC, file).split(path.sep).join("/");
    const scanned = server.filter(importsClient).map(rel);
    for (const page of [
      "app/dashboard/(console)/products/[id]/page.tsx",
      "app/dashboard/(console)/products/[id]/quiz/[itemId]/page.tsx",
      "app/dashboard/(console)/products/new/page.tsx",
      "app/dashboard/(console)/orders/page.tsx",
    ]) {
      expect(scanned, page).toContain(page);
    }
    expect(scanned.length).toBeGreaterThan(10);
  });

  it("sees through the ui.tsx -> ui/index `export *` barrel to the client primitives", () => {
    const names = clientExportsOf(SRC, path.join(SRC, "components/ui.tsx")).names;
    for (const name of ["Tabs", "Dialog", "toast", "Disclosure"]) expect(names, name).toContain(name);
  });

  it("flags a read through the real ui.tsx barrel (a mutation check on the live module graph)", () => {
    const page = path.join(SRC, "app/dashboard/(console)/x/page.tsx");
    expect(clientReferenceMisuse(SRC, page, 'import { Tabs, Dialog } from "@/components/ui";\nconst a = Tabs.x; const b = <Dialog />;')).toHaveLength(1);
    expect(clientReferenceMisuse(SRC, page, 'import { Button } from "@/components/ui";\nconst a = Button.x;')).toEqual([]);
  });

  it("finds no server module that dots into, indexes or calls a client export", () => {
    expect(server.flatMap((file) => clientReferenceMisuse(SRC, file))).toEqual([]);
  });
});

describe("resetClientExportsCache", () => {
  it("makes clientExportsOf read the files again", () => {
    const dir = mkdtempSync(path.join(tmpdir(), "client-imports-reset-"));
    try {
      writeFileSync(path.join(dir, "mod.ts"), "export const a = 1;\n");
      expect(clientExportsOf(dir, path.join(dir, "mod.ts")).all).toBe(false);
      writeFileSync(path.join(dir, "mod.ts"), '"use client";\nexport const a = 1;\n');
      expect(clientExportsOf(dir, path.join(dir, "mod.ts")).all).toBe(false); // kept answer
      resetClientExportsCache();
      expect(clientExportsOf(dir, path.join(dir, "mod.ts")).all).toBe(true);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
