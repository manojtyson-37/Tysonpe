import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

/**
 * In a React Server Component, an export of a "use client" module is a client REFERENCE, not the value. It can be
 * rendered (`<Name />`) or handed on as a value (`prop={Name}`), but reading into it throws in a production build:
 * `Name.prop` or `Name[key]` ("Cannot access KIND_LABEL.video on the server"), and so does calling it (`Name()`).
 * `next dev` and Vitest hide this (dev returns undefined; Vitest ignores the directive), so a page that dots into a
 * client module's constant renders wrong in dev and 500s in production. This scan finds that statically.
 */

/** True when the module opens with a "use client" directive (after any leading comments or blank lines). */
export function declaresUseClient(source: string): boolean {
  return /^(?:\s|\/\/[^\n]*\n|\/\*[\s\S]*?\*\/)*["']use client["']/.test(source);
}

/** Blanks comments and string/regex-free quoted text so prose cannot look like code. Newlines are kept. */
export function stripNonCode(source: string): string {
  const blank = (s: string) => s.replace(/[^\n]/g, " ");
  return source
    .replace(/\/\*[\s\S]*?\*\//g, blank)
    .replace(/(^|[^:\\])\/\/[^\n]*/g, (_m, pre: string) => pre + blank(_m.slice(pre.length)))
    .replace(/"(?:[^"\\\n]|\\.)*"/g, blank)
    .replace(/'(?:[^'\\\n]|\\.)*'/g, (m, offset: number, whole: string) => {
      // A lone apostrophe in JSX copy (don't) is not a string; only blank a '...' that follows a code character.
      return /[=(,?:[{+&|]\s*$/.test(whole.slice(Math.max(0, offset - 3), offset)) ? blank(m) : m;
    });
}

export interface NamedImport {
  /** The local binding. */
  local: string;
  /** The name the module exports ("default" for a default import). */
  imported: string;
  spec: string;
}

/** Value imports (named, renamed and default) of a module. `import type` and inline `type X` members are erased, so skipped. */
export function namedImports(source: string): NamedImport[] {
  const out: NamedImport[] = [];
  for (const m of source.matchAll(/^\s*import\s+(?!type\b)([\s\S]*?)\s+from\s+["']([^"']+)["']/gm)) {
    const clause = m[1];
    const braces = /\{([\s\S]*)\}/.exec(clause)?.[1] ?? "";
    for (const part of braces.split(",")) {
      const p = part.trim();
      if (!p || /^type\s/.test(p)) continue;
      const [imported, local = imported] = p.split(/\s+as\s+/).map((x) => x.trim());
      out.push({ local, imported, spec: m[2] });
    }
    const def = /^([A-Za-z_$][\w$]*)\s*(?:,|$)/.exec(clause.trim());
    if (def) out.push({ local: def[1], imported: "default", spec: m[2] });
  }
  return out;
}

export function resolveFirstParty(srcDir: string, fromFile: string, spec: string): string | null {
  const base = spec.startsWith("@/") ? path.join(srcDir, spec.slice(2)) : spec.startsWith(".") ? path.resolve(path.dirname(fromFile), spec) : null;
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

/**
 * Names a module exports that live in a "use client" file: its own exports when it is a client module, or, for a
 * barrel without the directive, the names it re-exports from one (`export { A, B as C } from "./x"`).
 */
export function clientExportsOf(srcDir: string, file: string, seen = new Set<string>()): { all: boolean; names: Set<string> } {
  if (seen.has(file)) return { all: false, names: new Set() };
  seen.add(file);
  const source = readFileSync(file, "utf8");
  if (declaresUseClient(source)) return { all: true, names: new Set() };
  const names = new Set<string>();
  for (const m of source.matchAll(/^\s*export\s+(?!type\b)\{([^}]*)\}\s*from\s*["']([^"']+)["']/gm)) {
    const target = resolveFirstParty(srcDir, file, m[2]);
    if (!target) continue;
    const inner = clientExportsOf(srcDir, target, seen);
    if (!inner.all && inner.names.size === 0) continue;
    for (const part of m[1].split(",")) {
      const p = part.trim();
      if (!p || /^type\s/.test(p)) continue;
      const [orig, exported = orig] = p.split(/\s+as\s+/).map((s) => s.trim());
      if (inner.all || inner.names.has(orig)) names.add(exported);
    }
  }
  return { all: false, names };
}

/** One line per forbidden use of a client export in a source file that is not itself a client module. */
export function clientReferenceMisuse(srcDir: string, file: string, source = readFileSync(file, "utf8")): string[] {
  if (declaresUseClient(source)) return [];
  const findings: string[] = [];
  const importFree = stripNonCode(source.replace(/^\s*(?:import|export)\s[\s\S]*?\sfrom\s+["'][^"']*["'];?/gm, (m) => m.replace(/[^\n]/g, " ")));
  for (const { local, imported, spec } of namedImports(source)) {
    const target = resolveFirstParty(srcDir, file, spec);
    if (!target) continue;
    const exports = clientExportsOf(srcDir, target);
    if (!exports.all && !exports.names.has(imported)) continue;
    const id = local.replace(/\$/g, "\\$");
    const lines = importFree.split("\n");
    lines.forEach((line, i) => {
      if (new RegExp(`(?<![\\w$.])${id}\\s*(?:\\?\\.|\\.(?!\\.\\.)|\\[)`).test(line)) findings.push(`${path.relative(srcDir, file)}:${i + 1}: ${local} is a client reference; reading into it throws on the server`);
      else if (new RegExp(`(?<![\\w$.<])${id}\\s*\\(`).test(line) && !new RegExp(`(?:function|class)\\s+${id}\\b`).test(line)) findings.push(`${path.relative(srcDir, file)}:${i + 1}: ${local} is a client reference; calling it throws on the server`);
    });
  }
  return findings;
}

export function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(full);
    return /\.tsx?$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name) ? [full] : [];
  });
}
