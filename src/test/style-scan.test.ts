import { describe, expect, it } from "vitest";
import { legacyStyleFindings } from "./style-scan";

describe("legacyStyleFindings: single quotes only in code positions", () => {
  it("flags a double-quoted class between two apostrophes in JSX copy", () => {
    const source = `<p>It's done</p><div className="rounded-xl">x</div><p>can't</p>`;
    expect(legacyStyleFindings(source)).toEqual(["rounded-xl: rounded-xl"]);
  });

  it("flags a legacy class that sits between apostrophes on separate lines too", () => {
    expect(legacyStyleFindings(`<p>Don't</p>\n<div className="btn btn-primary" />\n<p>won't</p>`).length).toBeGreaterThan(0);
  });

  it("still reads single-quoted literals in code positions", () => {
    for (const source of ["const a = 'rounded-xl';", "f('rounded-xl')", "x ? 'rounded-xl' : 'p-2'", "{ k: 'rounded-xl' }", "return 'rounded-xl';", "<a className='rounded-xl' />", "ok && 'rounded-xl'"]) {
      expect(legacyStyleFindings(source), source).toEqual(["rounded-xl: rounded-xl"]);
    }
  });

  it("ignores a legacy class that is only named in a comment, apostrophes and all", () => {
    expect(legacyStyleFindings(`// don't put "rounded-xl" here, it's legacy\nconst a = "p-2";`)).toEqual([]);
    expect(legacyStyleFindings(`/* it's "btn btn-primary" */ const a = "p-2";`)).toEqual([]);
  });

  it("does not let a case label like case '/*': open a comment that swallows the code after it", () => {
    expect(legacyStyleFindings(`switch (k) {\n  case '/*':\n    return "p-2";\n}\nconst a = "rounded-xl";`)).toEqual(["rounded-xl: rounded-xl"]);
    expect(legacyStyleFindings(`switch (k) { case '//': break; }\nconst a = "btn";`)).toEqual(["legacy class: btn"]);
  });

  it("flags the class on the line after such a comment", () => {
    expect(legacyStyleFindings(`// don't put "rounded-xl" here, it's legacy\nconst a = "rounded-xl";`)).toEqual(["rounded-xl: rounded-xl"]);
  });
});

describe("legacyStyleFindings: trailing !", () => {
  it.each(["sm:hidden!", "bg-[#fff]!", "hidden!", "flex!", "w-auto!", "sm:py-1.5!", "hover:text-ink!", "md:bg-[#fff]!", "bg-[color:var(--x)]!"])("flags %s", (token) => {
    expect(legacyStyleFindings(`className="p-2 ${token}"`), token).toEqual([`important override: ${token}`]);
  });

  it.each(["Saved!", "Done!", "Well-done!", "Sign-up complete!", "Pay-in done!", "Welcome back!", "Oops, try again!", "Note: saved!", "https://tysonpe.in/a!"])("keeps copy %s clean", (copy) => {
    expect(legacyStyleFindings(`<p>${copy}</p> const m = "${copy}";`)).toEqual([]);
  });
});

describe("legacyStyleFindings: comment stripping is string-aware", () => {
  it('does not let accept="image/*" open a block comment that swallows the code after it', () => {
    const source = `<input accept="image/*" className="rounded-xl" />\n<p>ok</p> /* real comment */\n<b className="btn" />`;
    expect(legacyStyleFindings(source)).toEqual(["rounded-xl: rounded-xl", "legacy class: btn"]);
  });

  it('does not let a "//" inside a string blank the rest of the line', () => {
    expect(legacyStyleFindings(`const u = "a//b"; const c = "rounded-xl";`)).toEqual(["rounded-xl: rounded-xl"]);
    expect(legacyStyleFindings(`const u = "a // b"; const c = "rounded-xl";`)).toEqual(["rounded-xl: rounded-xl"]);
    expect(legacyStyleFindings(`const u = \`a // b\`; const c = "rounded-xl";`)).toEqual(["rounded-xl: rounded-xl"]);
    expect(legacyStyleFindings(`const u = "https://x.in/a"; const c = "btn";`)).toEqual(["legacy class: btn"]);
    expect(legacyStyleFindings("const u = `http://x/${a}`; const c = \"btn\";")).toEqual(["legacy class: btn"]);
  });

  it("still drops real comments, including one that follows a string", () => {
    expect(legacyStyleFindings(`const a = "p-2"; // "rounded-xl" is legacy\n/* "btn" */ const b = "p-3";`)).toEqual([]);
    expect(legacyStyleFindings(`const a = 'p-2'; /* "rounded-xl" */`)).toEqual([]);
  });

  it("keeps the code after a JSX text apostrophe and a comment-looking string", () => {
    expect(legacyStyleFindings(`<p>It's</p><a href="/x//y" className="rounded-xl">can't</a>`)).toEqual(["rounded-xl: rounded-xl"]);
  });
});

describe("legacyStyleFindings: title= tooltips", () => {
  it.each([
    '<span title="Learners">',
    "<button onClick={() => go()} title=\"Learners\">",
    '<span title={ok ? "a" : "b"}>',
    "<span title={ok ? `a` : b}>",
    '<span title={"a"}>',
    "<td\n  className=\"x\"\n  title='a'\n>",
    '<svg className="[&>svg]:x" title="y">',
    "<span className='[&>svg]:x' title='y'>",
    '<span className={cn("[&>b]:x", on && "a")} title="y">',
    '<span onClick={() => go(a > b)} title="y">',
    '<span data-x={a > b ? "p" : "q"} title={ok ? "a" : "b"}>',
  ])("flags %s", (source) => {
    expect(legacyStyleFindings(source), source).toContain("title= tooltip");
  });

  it.each([
    '<PageHeader title="Edit product" />',
    '<PageHeader\n  eyebrow="x"\n  title="Edit product"\n/>',
    '<Dialog title={ok ? "a" : "b"} />',
    "<span title={product.title}>",
    '<span className="[&>svg]:x" data-title="y">',
    '<span className="[&>svg]:x">title="not an attribute"</span>',
    '<span className={cn("a", { title: "x" })} aria-label="y">',
    '<span className="[&>svg]:x" aria-label="has title=\'x\' inside">',
  ])("does not flag %s", (source) => {
    expect(legacyStyleFindings(source), source).toEqual([]);
  });

  it("flags the intrinsic tag after a component's title prop", () => {
    expect(legacyStyleFindings('<PageHeader title="x" /><span title="y">')).toContain("title= tooltip");
  });
});
