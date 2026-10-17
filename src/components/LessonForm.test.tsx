import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { legacyStyleFindings } from "@/test/style-scan";
import { LessonForm, type LessonDefaults } from "./LessonForm";

const action = async () => undefined;
const lesson = (over: Partial<LessonDefaults> = {}): LessonDefaults => ({
  title: "Welcome", kind: "video", url: "https://youtu.be/x", body: "", requiredForCompletion: true,
  dripType: "none", dripDays: null, dripDate: "", ...over,
});
const add = (sections?: Array<{ id: string; title: string }>) =>
  renderToStaticMarkup(<LessonForm action={action} submitLabel="Add lesson" sections={sections} />);
const edit = (l: LessonDefaults) => renderToStaticMarkup(<LessonForm action={action} submitLabel="Save lesson" lesson={l} />);
const names = (html: string) => [...html.matchAll(/<(?:input|select|textarea)\b[^>]*\sname="([^"]+)"/g)].map((m) => m[1]);

describe("LessonForm fields", () => {
  it("add form: title, kind, required, dripType, plus the video link for the default kind", () => {
    expect(names(add())).toEqual(["title", "kind", "url", "required", "dripType"]);
  });

  it("add form with sections also posts sectionId, between kind and the content field", () => {
    expect(names(add([{ id: "s1", title: "Module 1" }]))).toEqual(["title", "kind", "sectionId", "url", "required", "dripType"]);
    expect(add([{ id: "s1", title: "Module 1" }])).toContain('<option value="s1">Module 1</option>');
  });

  it("offers every lesson kind on add, but not quiz when editing a non-quiz lesson", () => {
    const addKinds = [...add().matchAll(/<option value="(\w+)"[^>]*>(?:Video|PDF|Text|Link|Quiz)</g)].map((m) => m[1]);
    expect(addKinds).toContain("quiz");
    expect(edit(lesson())).not.toContain('<option value="quiz"');
  });

  it("text lessons post body instead of url", () => {
    const html = edit(lesson({ kind: "text", body: "Hello there" }));
    expect(names(html)).toEqual(["title", "kind", "body", "required", "dripType"]);
    expect(html).toContain("Hello there");
  });

  it("shows the days field for 'days after joining' and the date field for 'on a fixed date', never both", () => {
    const days = edit(lesson({ dripType: "days_after_enroll", dripDays: 7 }));
    expect(names(days)).toContain("dripDays");
    expect(names(days)).not.toContain("dripDate");
    const date = edit(lesson({ dripType: "on_date", dripDate: "2026-11-01" }));
    expect(names(date)).toContain("dripDate");
    expect(date).toContain('value="2026-11-01"');
    expect(names(date)).not.toContain("dripDays");
  });

  it("marks an optional lesson in the required select", () => {
    expect(edit(lesson({ requiredForCompletion: false }))).toMatch(/<option value="no" selected="">/);
  });

  it("keeps required as a yes/no select (the action validates z.enum(['yes','no']))", () => {
    expect(add()).toMatch(/<select[^>]*name="required"/);
    expect(add()).toContain('<option value="yes"');
    expect(add()).toContain('<option value="no"');
  });
});

describe("LessonForm quiz lessons", () => {
  const html = edit(lesson({ kind: "quiz", url: "", body: "" }));

  it("still submits kind=quiz through a hidden input, with no kind select", () => {
    expect(html).toContain('<input type="hidden" name="kind" value="quiz"/>');
    expect(html).not.toMatch(/<select[^>]*name="kind"/);
    expect(names(html).filter((n) => n === "kind")).toHaveLength(1);
  });

  it("shows Quiz as a static read-only row, not a dashed fake input, and has no url or body field", () => {
    expect(html).toMatch(/Type<\/span>/);
    expect(html).toMatch(/>Quiz<\/div>/);
    expect(html).not.toContain("border-dashed");
    expect(names(html)).toEqual(["title", "kind", "required", "dripType"]);
  });

  it("names the static Type value by its label (aria-labelledby -> the label's id) and keeps the touch-height floor", () => {
    const label = /<span id="([^"]+)" class="label">Type<\/span>/.exec(html);
    expect(label).not.toBeNull();
    const row = /<div role="group" aria-labelledby="([^"]+)" class="([^"]*)">Quiz<\/div>/.exec(html);
    expect(row).not.toBeNull();
    expect(row![1]).toBe(label![1]);
    expect(row![2].split(" ")).toContain("pointer-coarse:min-h-11");
    expect(html).toContain('<input type="hidden" name="kind" value="quiz"/>');
  });

  it("points an existing quiz at Edit questions instead of promising questions 'after creating'", () => {
    expect(html).toContain("Edit questions");
    expect(html).not.toContain("after creating");
  });

  it("the initial add form (Video selected) does not show the \"after creating\" quiz copy", () => {
    // The add form starts on Video, so the sentence is absent until the kind select is switched (client state).
    expect(add()).not.toContain("after creating");
  });
});

describe("LessonForm chrome", () => {
  it("renders the submit label through the Button primitive, secondary and small, with a touch floor", () => {
    const html = add();
    expect(html).toMatch(/<button type="submit" class="btn btn-secondary btn-sm[^"]*pointer-coarse:min-h-11[^"]*">Add lesson<\/button>/);
  });
});

describe("LessonForm source", () => {
  it("has no ! overrides, rounded-xl, legacy button strings, glyphs or title tooltips", () => {
    expect(legacyStyleFindings(readFileSync(new URL("./LessonForm.tsx", import.meta.url), "utf8"))).toEqual([]);
  });
});
