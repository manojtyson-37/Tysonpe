import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import ts from "typescript";

/**
 * In a React Server Component, an export of a "use client" module is a client REFERENCE, not the value. It can be
 * rendered (`<Name />`) or handed on as a value (`prop={Name}`), but reading into it throws in a production build:
 * `Name.prop` or `Name[key]` ("Cannot access KIND_LABEL.video on the server"), and so does calling it (`Name()`).
 * `next dev` and Vitest hide this (dev returns undefined; Vitest ignores the directive), so a page that dots into a
 * client module's constant renders wrong in dev and 500s in production. This scan finds that statically.
 *
 * It reads the TypeScript syntax tree, not the text, so comments and string contents (`from "..."`, `/*`, `//`) can
 * never be mistaken for code. The module graph it follows: `export { A as B } from`, `export * from` (recursively),
 * an import re-exported under `export { X }` / `export default X` / `export const Y = X`, and `import * as C`.
 *
 * What counts as "reading into" a client reference X (or a namespace member `C.X`): `X.p`, `X?.p`, `X[k]`, `X()`,
 * `new X()`, a tagged template on X, destructuring X, `...X`, `Object.entries/keys/values/assign/...(X)`,
 * `"k" in X`, and `for (k in X)` / `for (v of X)`. Rendering `<X />`, `<C.X />` and passing X on as a value are fine.
 * A namespace itself (`C`) is a module proxy whose members are references, so `C.X` alone is fine; `C.X.p` is not.
 * Wrappers do not hide a read: `(X).p`, `X!.p`, `(X as T)[k]`, `(X satisfies T).p` and `(<T>X).p` are climbed out of
 * before the use is judged. A namespace member may be named by a string literal (`C["X"].p`), and a namespace can reach a
 * file through `export * as ns from` or `import * as C; export { C }` (also under another name, and through `export *`).
 * A spread of a reference onto a JSX element (`<Comp {...X} />`) enumerates it, so it counts as reading into it.
 *
 * Known limits (no scope or data-flow analysis; each is a false negative unless noted):
 *  - an alias hides the reference: `const K = X; K.p`, `const { X: K } = ns`, `export const Y = X` is followed only for a
 *    plain `export const Y = X` of an imported name, not through a function or object;
 *  - `import("./client").then((m) => m.X.p)` (dynamic import) and `require()` are not followed;
 *  - enumeration by other means: `Array.from(X)`, `Reflect.ownKeys(X)`, `structuredClone(X)`, `JSON.stringify(X)`, and a comma
 *    expression `(0, X).p`; only the `Object.*` list above is recognised;
 *  - a computed namespace key (`C[k].p`) or a namespace nested inside a namespace (`B.ns.X.p`) is not resolved;
 *  - a local that shadows an imported client name is treated as the import (a false POSITIVE, the one over-flag).
 */

const parseCache = new Map<string, { text: string; sf: ts.SourceFile }>();
function parse(file: string, text: string): ts.SourceFile {
  const hit = parseCache.get(file);
  if (hit && hit.text === text) return hit.sf;
  const kind = /\.tsx$|\.jsx$/.test(file) ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  const sf = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, kind);
  parseCache.set(file, { text, sf });
  return sf;
}
const parseFile = (file: string) => parse(file, readFileSync(file, "utf8"));

/** True when the module opens with a "use client" directive (the directive prologue; comments and blank lines are not statements). */
export function declaresUseClient(source: string, file = "directive.tsx"): boolean {
  // Pass the real file so the parse is the one the caller reuses; under the shared default key every call re-parses.
  const sf = parse(file, source);
  for (const statement of sf.statements) {
    if (!ts.isExpressionStatement(statement) || !ts.isStringLiteral(statement.expression)) return false;
    if (statement.expression.text === "use client") return true;
  }
  return false;
}

export interface NamedImport {
  /** The local binding. */
  local: string;
  /** The name the module exports ("default" for a default import, "*" for `import * as local`). */
  imported: string;
  spec: string;
}

const moduleSpec = (decl: ts.ImportDeclaration | ts.ExportDeclaration) => (decl.moduleSpecifier && ts.isStringLiteral(decl.moduleSpecifier) ? decl.moduleSpecifier.text : null);

function importsOf(sf: ts.SourceFile): NamedImport[] {
  const out: NamedImport[] = [];
  for (const statement of sf.statements) {
    if (!ts.isImportDeclaration(statement)) continue;
    const clause = statement.importClause;
    const spec = moduleSpec(statement);
    if (!clause || clause.isTypeOnly || spec === null) continue; // `import "x"` binds nothing; `import type` is erased
    const bindings = clause.namedBindings;
    if (bindings && ts.isNamedImports(bindings)) {
      for (const el of bindings.elements) if (!el.isTypeOnly) out.push({ local: el.name.text, imported: (el.propertyName ?? el.name).text, spec });
    }
    if (clause.name) out.push({ local: clause.name.text, imported: "default", spec });
    if (bindings && ts.isNamespaceImport(bindings)) out.push({ local: bindings.name.text, imported: "*", spec });
  }
  return out;
}

/** Value imports (named, renamed, default and namespace) of a module. `import type` and inline `type X` members are erased, so skipped. */
export function namedImports(source: string, file = "module.tsx"): NamedImport[] {
  return importsOf(parse(file, source));
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

const hasModifier = (node: ts.Node, kind: ts.SyntaxKind) => ts.canHaveModifiers(node) && (ts.getModifiers(node)?.some((m) => m.kind === kind) ?? false);

function bindingNames(name: ts.BindingName, into: string[]): void {
  if (ts.isIdentifier(name)) into.push(name.text);
  else for (const el of name.elements) if (!ts.isOmittedExpression(el)) bindingNames(el.name, into);
}

/** Value names a module exports (types erased), including through `export *`. "default" is listed but never passed on by a star. */
function valueExportNames(srcDir: string, file: string, stack: ReadonlySet<string>): Set<string> {
  const names = new Set<string>();
  if (stack.has(file)) return names;
  const inner = new Set(stack).add(file);
  for (const statement of parseFile(file).statements) {
    if (ts.isVariableStatement(statement) && hasModifier(statement, ts.SyntaxKind.ExportKeyword)) {
      const found: string[] = [];
      for (const decl of statement.declarationList.declarations) bindingNames(decl.name, found);
      found.forEach((n) => names.add(n));
    } else if ((ts.isFunctionDeclaration(statement) || ts.isClassDeclaration(statement) || ts.isEnumDeclaration(statement)) && hasModifier(statement, ts.SyntaxKind.ExportKeyword) && !hasModifier(statement, ts.SyntaxKind.DeclareKeyword)) {
      names.add(hasModifier(statement, ts.SyntaxKind.DefaultKeyword) ? "default" : (statement.name?.text ?? "default"));
    } else if (ts.isExportAssignment(statement) && !statement.isExportEquals) {
      names.add("default");
    } else if (ts.isExportDeclaration(statement) && !statement.isTypeOnly) {
      const spec = moduleSpec(statement);
      const clause = statement.exportClause;
      if (clause && ts.isNamedExports(clause)) {
        for (const el of clause.elements) if (!el.isTypeOnly) names.add(el.name.text);
      } else if (clause && ts.isNamespaceExport(clause)) {
        names.add(clause.name.text);
      } else if (spec !== null) {
        const target = resolveFirstParty(srcDir, file, spec);
        if (target) for (const n of valueExportNames(srcDir, target, inner)) if (n !== "default") names.add(n);
      }
    }
  }
  return names;
}

export interface ClientExports {
  /** The module is itself "use client": every export is a client reference. */
  all: boolean;
  /** For a module without the directive: the exported names that are client references re-exported from one. */
  names: Set<string>;
  /** Exported names that are a namespace (`export * as ns from`, `import * as C; export { C }`): members of it are client references. */
  namespaces: Map<string, ClientExports>;
}

/**
 * Names a module exports that live in a "use client" file: its own exports when it is a client module, or, for a
 * barrel without the directive, the names it re-exports from one (`export { A, B as C } from "./x"`, `export * from
 * "./x"`, or an import it exports again).
 */
export function clientExportsOf(srcDir: string, file: string, stack: ReadonlySet<string> = new Set()): ClientExports {
  if (stack.size > 0) return computeClientExports(srcDir, file, stack);
  // A top-level answer is complete (not cut short by a cycle), so it can be kept for the life of the module: the live scan
  // asks for the same barrels once per importing page. Vitest loads this module afresh per test file.
  const key = `${srcDir}\0${file}`;
  let hit = exportsCache.get(key);
  if (!hit) exportsCache.set(key, (hit = computeClientExports(srcDir, file, stack)));
  return hit;
}
const exportsCache = new Map<string, ClientExports>();

function computeClientExports(srcDir: string, file: string, stack: ReadonlySet<string>): ClientExports {
  const none: ClientExports = { all: false, names: new Set(), namespaces: new Map() };
  if (stack.has(file)) return none;
  const source = readFileSync(file, "utf8");
  if (declaresUseClient(source, file)) return { all: true, names: new Set(), namespaces: new Map() };
  const sf = parse(file, source);
  const inner = new Set(stack).add(file);
  const isClient = (target: string, name: string) => {
    const exports = clientExportsOf(srcDir, target, inner);
    return exports.all || exports.names.has(name);
  };
  // Imports of this file that are client references, by local name (an import then re-exported below).
  const clientLocals = new Set<string>();
  const namespaceLocals = new Map<string, ClientExports>(); // `import * as C` of a module with client exports
  for (const imp of importsOf(sf)) {
    const target = resolveFirstParty(srcDir, file, imp.spec);
    if (!target) continue;
    if (imp.imported === "*") {
      const exports = clientExportsOf(srcDir, target, inner);
      if (exports.all || exports.names.size > 0) namespaceLocals.set(imp.local, exports);
    } else if (isClient(target, imp.imported)) clientLocals.add(imp.local);
  }
  const names = new Set<string>();
  const namespaces = new Map<string, ClientExports>();
  for (const statement of sf.statements) {
    if (ts.isExportDeclaration(statement) && !statement.isTypeOnly) {
      const spec = moduleSpec(statement);
      const clause = statement.exportClause;
      if (spec !== null) {
        const target = resolveFirstParty(srcDir, file, spec);
        if (!target) continue;
        if (clause && ts.isNamedExports(clause)) {
          for (const el of clause.elements) if (!el.isTypeOnly && isClient(target, (el.propertyName ?? el.name).text)) names.add(el.name.text);
        } else if (clause && ts.isNamespaceExport(clause)) {
          const exports = clientExportsOf(srcDir, target, inner);
          if (exports.all || exports.names.size > 0) namespaces.set(clause.name.text, exports);
        } else if (!clause) {
          const exports = clientExportsOf(srcDir, target, inner);
          const star = exports.all ? valueExportNames(srcDir, target, inner) : exports.names;
          for (const n of star) if (n !== "default") names.add(n);
          for (const [n, ns] of exports.namespaces) namespaces.set(n, ns);
        }
      } else if (clause && ts.isNamedExports(clause)) {
        for (const el of clause.elements) {
          if (el.isTypeOnly) continue;
          const local = (el.propertyName ?? el.name).text;
          if (clientLocals.has(local)) names.add(el.name.text);
          const ns = namespaceLocals.get(local);
          if (ns) namespaces.set(el.name.text, ns);
        }
      }
    } else if (ts.isExportAssignment(statement) && !statement.isExportEquals && ts.isIdentifier(statement.expression) && clientLocals.has(statement.expression.text)) {
      names.add("default");
    } else if (ts.isVariableStatement(statement) && hasModifier(statement, ts.SyntaxKind.ExportKeyword)) {
      for (const decl of statement.declarationList.declarations) {
        if (ts.isIdentifier(decl.name) && decl.initializer && ts.isIdentifier(decl.initializer) && clientLocals.has(decl.initializer.text)) names.add(decl.name.text);
      }
    }
  }
  return { all: false, names, namespaces };
}

/** True when an import binds (a member of) a client module: a named or default client export, or a namespace with any. */
export function importsClientExport(srcDir: string, file: string, imp: NamedImport): boolean {
  const target = resolveFirstParty(srcDir, file, imp.spec);
  if (!target) return false;
  const exports = clientExportsOf(srcDir, target);
  return imp.imported === "*" ? exports.all || exports.names.size > 0 : exports.all || exports.names.has(imp.imported) || exports.namespaces.has(imp.imported);
}

const ENUMERATING_OBJECT_METHODS = new Set(["entries", "keys", "values", "assign", "fromEntries", "getOwnPropertyNames", "getOwnPropertyDescriptors", "getOwnPropertySymbols"]);

/** Climbs out of the wrappers that change nothing at runtime: `(X)`, `X as T`, `X!`, `X satisfies T`, `<T>X`. */
function outermost(node: ts.Node): ts.Node {
  let n = node;
  while (n.parent && (ts.isParenthesizedExpression(n.parent) || ts.isAsExpression(n.parent) || ts.isNonNullExpression(n.parent) || ts.isSatisfiesExpression(n.parent) || ts.isTypeAssertionExpression(n.parent)) && n.parent.expression === n) n = n.parent;
  return n;
}

/** How a node that denotes a client reference is used, when that use reads into it; null when it is only rendered or passed on. */
function misuseKind(inner: ts.Node): "reading into" | "calling" | null {
  const node = outermost(inner);
  const parent = node.parent;
  if (!parent) return null;
  if (ts.isPropertyAccessExpression(parent) && parent.expression === node) return "reading into";
  if (ts.isElementAccessExpression(parent) && parent.expression === node) return "reading into";
  if ((ts.isCallExpression(parent) || ts.isNewExpression(parent)) && parent.expression === node) return "calling";
  if (ts.isTaggedTemplateExpression(parent) && parent.tag === node) return "calling";
  if (ts.isVariableDeclaration(parent) && parent.initializer === node && !ts.isIdentifier(parent.name)) return "reading into"; // const { a } = X, const [a] = X
  if (ts.isBinaryExpression(parent) && parent.right === node && parent.operatorToken.kind === ts.SyntaxKind.InKeyword) return "reading into";
  if (ts.isBinaryExpression(parent) && parent.right === node && parent.operatorToken.kind === ts.SyntaxKind.EqualsToken && (ts.isObjectLiteralExpression(parent.left) || ts.isArrayLiteralExpression(parent.left))) return "reading into"; // ({ a } = X)
  if ((ts.isSpreadAssignment(parent) || ts.isSpreadElement(parent) || ts.isJsxSpreadAttribute(parent)) && parent.expression === node) return "reading into";
  if ((ts.isForInStatement(parent) || ts.isForOfStatement(parent)) && parent.expression === node) return "reading into";
  if (ts.isCallExpression(parent) && parent.arguments.includes(node as ts.Expression)) {
    const callee = parent.expression;
    if (ts.isPropertyAccessExpression(callee) && ts.isIdentifier(callee.expression) && callee.expression.text === "Object" && ENUMERATING_OBJECT_METHODS.has(callee.name.text)) return "reading into";
  }
  return null;
}

/** One line per forbidden use of a client export in a source file that is not itself a client module. */
export function clientReferenceMisuse(srcDir: string, file: string, source = readFileSync(file, "utf8")): string[] {
  if (declaresUseClient(source, file)) return [];
  const sf = parse(file, source);
  const refs = new Set<string>(); // local names that ARE client references
  const namespaces = new Map<string, ClientExports>(); // `import * as C`: members that are client references
  for (const imp of importsOf(sf)) {
    const target = resolveFirstParty(srcDir, file, imp.spec);
    if (!target) continue;
    const exports = clientExportsOf(srcDir, target);
    if (imp.imported === "*") {
      if (exports.all || exports.names.size > 0) namespaces.set(imp.local, exports);
    } else if (exports.all || exports.names.has(imp.imported)) refs.add(imp.local);
    else if (exports.namespaces.has(imp.imported)) namespaces.set(imp.local, exports.namespaces.get(imp.imported)!);
  }
  if (refs.size === 0 && namespaces.size === 0) return [];

  const rel = path.relative(srcDir, file);
  const findings: string[] = [];
  const report = (node: ts.Node, label: string, kind: "reading into" | "calling") => {
    const line = sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1;
    findings.push(`${rel}:${line}: ${label} is a client reference; ${kind === "calling" ? "calling it" : "reading into it"} throws on the server`);
  };
  const visit = (node: ts.Node): void => {
    if (ts.isImportDeclaration(node) || ts.isJsxClosingElement(node)) return; // an import binds; a closing tag repeats its opening tag
    if (ts.isIdentifier(node) && refs.has(node.text)) {
      const kind = misuseKind(node);
      if (kind) report(node, node.text, kind);
    } else if ((ts.isPropertyAccessExpression(node) || ts.isElementAccessExpression(node)) && ts.isIdentifier(node.expression) && namespaces.has(node.expression.text)) {
      // `C.X`, or `C["X"]` with a literal key; a computed key (`C[k]`) names no member we can resolve.
      const member = ts.isPropertyAccessExpression(node) ? node.name.text : ts.isStringLiteralLike(node.argumentExpression) ? node.argumentExpression.text : null;
      const ns = namespaces.get(node.expression.text)!;
      if (member !== null && (ns.all || ns.names.has(member))) {
        const kind = misuseKind(node);
        if (kind) report(node, `${node.expression.text}.${member}`, kind);
      }
    } else if (ts.isIdentifier(node) && namespaces.has(node.text)) {
      // The namespace object itself enumerated or tested with `in`; plain member reads are handled above.
      const outer = outermost(node);
      const parent = outer.parent;
      const enumerated = ts.isSpreadAssignment(parent) || ts.isSpreadElement(parent) || ts.isJsxSpreadAttribute(parent) || ts.isForInStatement(parent) || ts.isForOfStatement(parent) || (ts.isBinaryExpression(parent) && parent.operatorToken.kind === ts.SyntaxKind.InKeyword && parent.right === outer) || (ts.isCallExpression(parent) && parent.arguments.includes(outer as ts.Expression) && misuseKind(node) !== null);
      if (enumerated) report(node, node.text, "reading into");
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return findings;
}

export function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(full);
    return /\.tsx?$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name) ? [full] : [];
  });
}
