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
 * The scan has no scope analysis: a local that shadows an imported client name is treated as the import.
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
export function declaresUseClient(source: string): boolean {
  const sf = parse("directive.tsx", source);
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
}

/**
 * Names a module exports that live in a "use client" file: its own exports when it is a client module, or, for a
 * barrel without the directive, the names it re-exports from one (`export { A, B as C } from "./x"`, `export * from
 * "./x"`, or an import it exports again).
 */
export function clientExportsOf(srcDir: string, file: string, stack: ReadonlySet<string> = new Set()): ClientExports {
  const none: ClientExports = { all: false, names: new Set() };
  if (stack.has(file)) return none;
  const source = readFileSync(file, "utf8");
  if (declaresUseClient(source)) return { all: true, names: new Set() };
  const sf = parse(file, source);
  const inner = new Set(stack).add(file);
  const isClient = (target: string, name: string) => {
    const exports = clientExportsOf(srcDir, target, inner);
    return exports.all || exports.names.has(name);
  };
  // Imports of this file that are client references, by local name (an import then re-exported below).
  const clientLocals = new Set<string>();
  for (const imp of importsOf(sf)) {
    const target = resolveFirstParty(srcDir, file, imp.spec);
    if (target && imp.imported !== "*" && isClient(target, imp.imported)) clientLocals.add(imp.local);
  }
  const names = new Set<string>();
  for (const statement of sf.statements) {
    if (ts.isExportDeclaration(statement) && !statement.isTypeOnly) {
      const spec = moduleSpec(statement);
      const clause = statement.exportClause;
      if (spec !== null) {
        const target = resolveFirstParty(srcDir, file, spec);
        if (!target) continue;
        if (clause && ts.isNamedExports(clause)) {
          for (const el of clause.elements) if (!el.isTypeOnly && isClient(target, (el.propertyName ?? el.name).text)) names.add(el.name.text);
        } else if (!clause) {
          const exports = clientExportsOf(srcDir, target, inner);
          const star = exports.all ? valueExportNames(srcDir, target, inner) : exports.names;
          for (const n of star) if (n !== "default") names.add(n);
        }
      } else if (clause && ts.isNamedExports(clause)) {
        for (const el of clause.elements) if (!el.isTypeOnly && clientLocals.has((el.propertyName ?? el.name).text)) names.add(el.name.text);
      }
    } else if (ts.isExportAssignment(statement) && !statement.isExportEquals && ts.isIdentifier(statement.expression) && clientLocals.has(statement.expression.text)) {
      names.add("default");
    } else if (ts.isVariableStatement(statement) && hasModifier(statement, ts.SyntaxKind.ExportKeyword)) {
      for (const decl of statement.declarationList.declarations) {
        if (ts.isIdentifier(decl.name) && decl.initializer && ts.isIdentifier(decl.initializer) && clientLocals.has(decl.initializer.text)) names.add(decl.name.text);
      }
    }
  }
  return { all: false, names };
}

/** True when an import binds (a member of) a client module: a named or default client export, or a namespace with any. */
export function importsClientExport(srcDir: string, file: string, imp: NamedImport): boolean {
  const target = resolveFirstParty(srcDir, file, imp.spec);
  if (!target) return false;
  const exports = clientExportsOf(srcDir, target);
  return imp.imported === "*" ? exports.all || exports.names.size > 0 : exports.all || exports.names.has(imp.imported);
}

const ENUMERATING_OBJECT_METHODS = new Set(["entries", "keys", "values", "assign", "fromEntries", "getOwnPropertyNames", "getOwnPropertyDescriptors", "getOwnPropertySymbols"]);

/** How a node that denotes a client reference is used, when that use reads into it; null when it is only rendered or passed on. */
function misuseKind(node: ts.Node): "reading into" | "calling" | null {
  const parent = node.parent;
  if (!parent) return null;
  if (ts.isPropertyAccessExpression(parent) && parent.expression === node) return "reading into";
  if (ts.isElementAccessExpression(parent) && parent.expression === node) return "reading into";
  if ((ts.isCallExpression(parent) || ts.isNewExpression(parent)) && parent.expression === node) return "calling";
  if (ts.isTaggedTemplateExpression(parent) && parent.tag === node) return "calling";
  if (ts.isVariableDeclaration(parent) && parent.initializer === node && !ts.isIdentifier(parent.name)) return "reading into"; // const { a } = X, const [a] = X
  if (ts.isBinaryExpression(parent) && parent.right === node && parent.operatorToken.kind === ts.SyntaxKind.InKeyword) return "reading into";
  if (ts.isBinaryExpression(parent) && parent.right === node && parent.operatorToken.kind === ts.SyntaxKind.EqualsToken && (ts.isObjectLiteralExpression(parent.left) || ts.isArrayLiteralExpression(parent.left))) return "reading into"; // ({ a } = X)
  if ((ts.isSpreadAssignment(parent) || ts.isSpreadElement(parent)) && parent.expression === node) return "reading into";
  if ((ts.isForInStatement(parent) || ts.isForOfStatement(parent)) && parent.expression === node) return "reading into";
  if (ts.isCallExpression(parent) && parent.arguments.includes(node as ts.Expression)) {
    const callee = parent.expression;
    if (ts.isPropertyAccessExpression(callee) && ts.isIdentifier(callee.expression) && callee.expression.text === "Object" && ENUMERATING_OBJECT_METHODS.has(callee.name.text)) return "reading into";
  }
  return null;
}

/** One line per forbidden use of a client export in a source file that is not itself a client module. */
export function clientReferenceMisuse(srcDir: string, file: string, source = readFileSync(file, "utf8")): string[] {
  if (declaresUseClient(source)) return [];
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
    } else if (ts.isPropertyAccessExpression(node) && ts.isIdentifier(node.expression) && namespaces.has(node.expression.text)) {
      const ns = namespaces.get(node.expression.text)!;
      if (ns.all || ns.names.has(node.name.text)) {
        const kind = misuseKind(node);
        if (kind) report(node, `${node.expression.text}.${node.name.text}`, kind);
      }
    } else if (ts.isIdentifier(node) && namespaces.has(node.text)) {
      // The namespace object itself enumerated or tested with `in`; plain member reads are handled above.
      const parent = node.parent;
      const enumerated = ts.isSpreadAssignment(parent) || ts.isSpreadElement(parent) || ts.isForInStatement(parent) || ts.isForOfStatement(parent) || (ts.isBinaryExpression(parent) && parent.operatorToken.kind === ts.SyntaxKind.InKeyword && parent.right === node) || (ts.isCallExpression(parent) && parent.arguments.includes(node as ts.Expression) && misuseKind(node) !== null);
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
