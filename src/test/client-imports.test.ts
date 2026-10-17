import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { clientExportsOf, clientReferenceMisuse, declaresUseClient, namedImports, resolveFirstParty, sourceFiles, stripNonCode } from "./client-imports";

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
});
afterAll(() => rmSync(root, { recursive: true, force: true }));

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
    expect(stripNonCode('const a = "x.y"; // z.w\nconst b = 1;')).not.toMatch(/[xyzw]\./);
  });
});

describe("static scan: server modules never read into a client module's export", () => {
  const files = [...sourceFiles(path.join(SRC, "app")), ...sourceFiles(path.join(SRC, "components"))];
  const server = files.filter((file) => !declaresUseClient(readFileSync(file, "utf8")));
  const importsClient = (file: string) =>
    namedImports(readFileSync(file, "utf8")).some(({ imported, spec }) => {
      const target = resolveFirstParty(SRC, file, spec);
      if (!target) return false;
      const exports = clientExportsOf(SRC, target);
      return exports.all || exports.names.has(imported);
    });

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

  it("finds no server module that dots into, indexes or calls a client export", () => {
    expect(server.flatMap((file) => clientReferenceMisuse(SRC, file))).toEqual([]);
  });
});
