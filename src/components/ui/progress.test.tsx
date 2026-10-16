import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { Progress } from "./progress";
import { Progress as ProgressFromUi } from "@/components/ui";

const render = (el: React.ReactElement) => renderToStaticMarkup(el);

describe("Progress", () => {
  it("exposes progressbar semantics with aria values and a text value", () => {
    const html = render(<Progress value={40} label="Course completion" />);
    expect(html).toContain('role="progressbar"');
    expect(html).toContain('aria-label="Course completion"');
    expect(html).toContain('aria-valuenow="40"');
    expect(html).toContain('aria-valuemin="0"');
    expect(html).toContain('aria-valuemax="100"');
    expect(html).toContain('aria-valuetext="40%"');
    expect(html).toContain('style="width:40%"');
    expect(html).toContain('<span class="text-sm tabular-nums text-muted">40%</span>');
  });

  it("derives the percentage from a custom max", () => {
    const html = render(<Progress value={3} max={8} label="Lessons" />);
    expect(html).toContain('aria-valuenow="3"');
    expect(html).toContain('aria-valuemax="8"');
    expect(html).toContain('aria-valuetext="38%"');
    expect(html).toContain('style="width:38%"');
  });

  it("uses a custom value text for both the label and aria-valuetext", () => {
    const html = render(<Progress value={3} max={8} label="Lessons" valueText="3 of 8 lessons" />);
    expect(html).toContain('aria-valuetext="3 of 8 lessons"');
    expect(html).toContain(">3 of 8 lessons<");
  });

  it("clamps out-of-range and invalid values", () => {
    expect(render(<Progress value={150} label="x" />)).toContain('aria-valuenow="100"');
    expect(render(<Progress value={-5} label="x" />)).toContain('aria-valuenow="0"');
    expect(render(<Progress value={Number.NaN} label="x" />)).toContain('aria-valuenow="0"');
    expect(render(<Progress value={5} max={0} label="x" />)).toContain('style="width:0%"');
  });

  it("uses ink by default and emerald for the good tone", () => {
    expect(render(<Progress value={10} label="x" />)).toContain("bg-brand");
    const good = render(<Progress value={10} label="x" tone="good" />);
    expect(good).toContain("bg-good");
    expect(good).not.toContain("bg-brand");
  });

  it("is flat: no gradient and no raw palette", () => {
    const html = render(<Progress value={10} label="x" />);
    expect(html).not.toMatch(/gradient|slate|stone|indigo|emerald|rose|amber/);
  });

  it("hides the text value when asked", () => {
    const html = render(<Progress value={10} label="x" showValue={false} />);
    expect(html).not.toContain("tabular-nums");
    expect(html).toContain('aria-valuetext="10%"');
  });

  it("is re-exported through the ui barrel", () => {
    expect(ProgressFromUi).toBe(Progress);
  });
});
