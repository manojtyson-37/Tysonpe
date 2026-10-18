import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import * as marks from "./gateway-icons";

const SOURCE = readFileSync(path.resolve(import.meta.dirname, "gateway-icons.tsx"), "utf8");
const SRC = path.resolve(import.meta.dirname, "..");

function sources(dir: string, out: Array<[string, string]> = []): Array<[string, string]> {
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) sources(full, out);
    else if (/\.(tsx?|mts)$/.test(name) && !/\.test\./.test(name) && full !== path.join(SRC, "components/gateway-icons.tsx")) out.push([full, readFileSync(full, "utf8")]);
  }
  return out;
}

/** Application sources only: test helpers under src/test/ import whatever they like and are not consumers. */
const appSources = () => sources(SRC).filter(([file]) => !file.startsWith(path.join(SRC, "test") + path.sep));

/** Source with block comments, line comments and template-literal text blanked, so an import that is only mentioned does not count. */
function code(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|\s)\/\/[^\n]*/g, "$1")
    .replace(/`(?:\\.|[^`\\])*`/g, "``");
}

const importsMark = (src: string, name: string) =>
  new RegExp(`import\\s*\\{[^}]*\\b${name}\\b[^}]*\\}\\s*from\\s*"[^"]*gateway-icons"`).test(code(src));

describe("gateway-icons", () => {
  it("every export renders one decorative svg that takes a className", () => {
    const names = Object.keys(marks);
    expect(names.length).toBeGreaterThan(10);
    for (const name of names) {
      const Mark = marks[name as keyof typeof marks] as (p: { className?: string }) => React.ReactElement;
      const html = renderToStaticMarkup(<Mark className="probe" />);
      expect(html, name).toMatch(/^<svg /);
      expect(html, name).toContain('class="probe"');
      expect(html, name).toContain('aria-hidden="true"');
    }
  });

  it("holds no mark nobody uses: Cred and Bhim are gone, and BhimUpiIcon is not an alias for anything", () => {
    const exported = Object.keys(marks);
    for (const gone of ["CredIcon", "BhimIcon", "BhimUpiIcon", "ShieldCheckBadge", "LockBadge"]) {
      expect(exported, gone).not.toContain(gone);
      expect(SOURCE, gone).not.toContain(gone);
    }
  });

  it("the only alias is GooglePayIcon, and it is the very same component as GPayIcon", () => {
    const aliases = [...SOURCE.matchAll(/^export const (\w+) = \w+;$/gm)].map((m) => m[1]);
    expect(aliases).toEqual(["GooglePayIcon"]);
    expect(marks.GooglePayIcon).toBe(marks.GPayIcon);
  });

  it("every exported mark is imported by a non-test file in src (nothing unused)", () => {
    const files = appSources();
    expect(files.length).toBeGreaterThan(50);
    expect(files.some(([file]) => file.includes(`${path.sep}src${path.sep}test${path.sep}`))).toBe(false);
    for (const name of Object.keys(marks)) {
      expect(files.some(([, src]) => importsMark(src, name)), name).toBe(true);
    }
  });

  it("the importer scan ignores comments and template strings (checker self-test)", () => {
    const real = 'import { UpiIcon } from "@/components/gateway-icons";\nexport const a = 1;';
    expect(importsMark(real, "UpiIcon")).toBe(true);
    expect(importsMark(real, "VisaIcon")).toBe(false);
    expect(importsMark('// import { UpiIcon } from "./gateway-icons";\nexport const a = 1;', "UpiIcon")).toBe(false);
    expect(importsMark('/* import { UpiIcon } from "./gateway-icons"; */\nexport const a = 1;', "UpiIcon")).toBe(false);
    expect(importsMark('const s = `import { UpiIcon } from "./gateway-icons"`;', "UpiIcon")).toBe(false);
    expect(importsMark('import {\n  VisaIcon,\n  UpiIcon,\n} from "./gateway-icons";', "UpiIcon")).toBe(true);
  });

  it("keeps the brand hex on purpose and says so, and ends with exactly one newline", () => {
    expect(SOURCE.split("\n")[0]).toMatch(/^\/\/ Brand and bank marks\. These are the one place raw hex colours are allowed/);
    expect(SOURCE).toMatch(/fill="#[0-9A-Fa-f]{6}"/);
    expect(SOURCE.endsWith("\n")).toBe(true);
    expect(SOURCE.endsWith("\n\n")).toBe(false);
  });
});
