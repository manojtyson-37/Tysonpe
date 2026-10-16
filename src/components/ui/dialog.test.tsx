import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import {
  ConfirmActions,
  Dialog,
  DialogView,
  confirmReducer,
  dialogMotion,
  dialogFocusStep,
  dialogMotionPlan,
  isTopDialog,
  lockBodyScroll,
  nextFocusIndex,
  originFromRects,
  popDialog,
  pushDialog,
} from "./dialog";

/** Attributes of every `<tag ...>` in the markup, so assertions do not depend on attribute order. */
function tagAttrs(html: string, tag: string): Record<string, string>[] {
  return [...html.matchAll(new RegExp(`<${tag}\\s([^>]*)>`, "g"))].map((match) =>
    Object.fromEntries([...match[1].matchAll(/([\w-]+)="([^"]*)"/g)].map((attr) => [attr[1], attr[2]])),
  );
}

describe("nextFocusIndex", () => {
  it("moves forward and wraps from the last element to the first", () => {
    expect(nextFocusIndex(0, 3, false)).toBe(1);
    expect(nextFocusIndex(2, 3, false)).toBe(0);
  });

  it("moves back with shift and wraps from the first element to the last", () => {
    expect(nextFocusIndex(2, 3, true)).toBe(1);
    expect(nextFocusIndex(0, 3, true)).toBe(2);
  });

  it("enters the trap at the first element, or the last with shift, when focus is outside it (-1)", () => {
    expect(nextFocusIndex(-1, 3, false)).toBe(0);
    expect(nextFocusIndex(-1, 3, true)).toBe(2);
  });

  it("keeps a single focusable element in place and reports -1 when there is none", () => {
    expect(nextFocusIndex(0, 1, false)).toBe(0);
    expect(nextFocusIndex(0, 1, true)).toBe(0);
    expect(nextFocusIndex(0, 0, false)).toBe(-1);
  });
});

describe("originFromRects", () => {
  const panel = { left: 400, top: 200, width: 400, height: 300 };

  it("returns the trigger centre as a 0..1 fraction of the panel", () => {
    const trigger = { left: 500, top: 300, width: 100, height: 40 };
    expect(originFromRects(trigger, panel)).toEqual({ x: 0.375, y: 0.4 });
  });

  it("clamps to the panel so a far-away trigger never pushes the origin outside it", () => {
    expect(originFromRects({ left: 0, top: 0, width: 10, height: 10 }, panel)).toEqual({ x: 0, y: 0 });
    expect(originFromRects({ left: 2000, top: 2000, width: 10, height: 10 }, panel)).toEqual({ x: 1, y: 1 });
  });

  it("falls back to the centre when there is no trigger or the panel has no size", () => {
    expect(originFromRects(null, panel)).toEqual({ x: 0.5, y: 0.5 });
    expect(originFromRects({ left: 1, top: 1, width: 1, height: 1 }, { left: 0, top: 0, width: 0, height: 0 })).toEqual({ x: 0.5, y: 0.5 });
  });
});

describe("dialogMotion", () => {
  it("enters over 220ms with the overlay ease: 8px rise, 4px blur, scale no lower than 0.96", () => {
    const { panel } = dialogMotion(false);
    expect(panel.initial).toMatchObject({ opacity: 0, y: 8, filter: "blur(4px)" });
    expect((panel.initial as { scale: number }).scale).toBeGreaterThanOrEqual(0.96);
    expect(panel.animate).toMatchObject({ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" });
    expect(panel.transition).toEqual({ duration: 0.22, ease: [0.16, 1, 0.3, 1] });
  });

  it("exits over 160ms, shorter than the enter", () => {
    const { panel, backdrop } = dialogMotion(false);
    expect((panel.exit as { transition: { duration: number } }).transition.duration).toBe(0.16);
    expect((backdrop.exit as { transition: { duration: number } }).transition.duration).toBe(0.16);
  });

  it("has no motion at all under reduced motion: no initial state and no exit, so removal never waits on a frame", () => {
    const { panel, backdrop } = dialogMotion(true);
    for (const part of [panel, backdrop]) {
      expect(part.initial).toBe(false);
      expect(part).not.toHaveProperty("exit");
      expect(part.transition).toEqual({ duration: 0 });
    }
  });
});

describe("dialogMotionPlan", () => {
  it("animates and loads the features chunk in the normal case", () => {
    const plan = dialogMotionPlan(false, false);
    expect(plan.load).toBe(true);
    expect(plan.motion).toEqual(dialogMotion(false));
  });

  it("skips the chunk under reduced motion and uses the instant variant", () => {
    const plan = dialogMotionPlan(true, false);
    expect(plan.load).toBe(false);
    expect(plan.motion).toEqual(dialogMotion(true));
  });

  it("drops all motion props when the features failed to load, so the open dialog is never stuck at opacity 0", () => {
    for (const reduced of [false, true]) {
      const plan = dialogMotionPlan(reduced, true);
      expect(plan.load).toBe(false);
      expect(plan.motion).toBeUndefined();
    }
  });
});

describe("dialogFocusStep", () => {
  // Regression: after Esc/Cancel/backdrop, document.activeElement was BODY instead of the trigger. The trigger was
  // focused in the effect cleanup (mutation phase); React then restored focus to the still-mounted Cancel button, and
  // the panel unmounted. Focus must go back in the layout-effect body, on a real open -> closed transition only.
  it("returns focus to the opener only when the dialog goes from open to closed", () => {
    expect(dialogFocusStep(true, false)).toBe("return");
  });

  it("does nothing on the first render, while closed, or while staying open", () => {
    expect(dialogFocusStep(false, false)).toBe("none");
    expect(dialogFocusStep(true, true)).toBe("none");
  });

  it("moves focus into the dialog only when it goes from closed to open", () => {
    expect(dialogFocusStep(false, true)).toBe("enter");
  });
});

describe("dialog stack", () => {
  it("makes the most recently opened dialog the top", () => {
    let stack = pushDialog([], "a");
    expect(isTopDialog(stack, "a")).toBe(true);
    stack = pushDialog(stack, "b");
    expect(isTopDialog(stack, "b")).toBe(true);
    expect(isTopDialog(stack, "a")).toBe(false);
  });

  it("hands the top back to the dialog underneath when the top closes", () => {
    const stack = popDialog(pushDialog(pushDialog([], "a"), "b"), "b");
    expect(stack).toEqual(["a"]);
    expect(isTopDialog(stack, "a")).toBe(true);
  });

  it("pops a dialog from the middle without disturbing the top, and ignores unknown ids", () => {
    const stack = pushDialog(pushDialog(pushDialog([], "a"), "b"), "c");
    expect(popDialog(stack, "b")).toEqual(["a", "c"]);
    expect(popDialog(stack, "zzz")).toEqual(["a", "b", "c"]);
  });

  it("has no top when empty, and pushing an id twice keeps one entry", () => {
    expect(isTopDialog([], "a")).toBe(false);
    expect(pushDialog(pushDialog([], "a"), "a")).toEqual(["a"]);
  });

  it("does not mutate the stack it was given", () => {
    const stack = Object.freeze(["a"]);
    expect(pushDialog(stack, "b")).toEqual(["a", "b"]);
    expect(popDialog(stack, "a")).toEqual([]);
    expect(stack).toEqual(["a"]);
  });
});

describe("lockBodyScroll", () => {
  function fakeBody() {
    return { style: { overflow: "", paddingRight: "" } };
  }

  it("hides overflow and pads for the scrollbar, then restores both", () => {
    const body = fakeBody();
    body.style.overflow = "auto";
    const unlock = lockBodyScroll(body, 15);
    expect(body.style.overflow).toBe("hidden");
    expect(body.style.paddingRight).toBe("15px");
    unlock();
    expect(body.style.overflow).toBe("auto");
    expect(body.style.paddingRight).toBe("");
  });

  it("is reference counted: stacked locks only release when the last one lets go", () => {
    const body = fakeBody();
    const first = lockBodyScroll(body, 0);
    const second = lockBodyScroll(body, 0);
    first();
    expect(body.style.overflow).toBe("hidden");
    second();
    expect(body.style.overflow).toBe("");
  });

  it("ignores a second call of the same unlock function", () => {
    const body = fakeBody();
    const a = lockBodyScroll(body, 0);
    const b = lockBodyScroll(body, 0);
    a();
    a();
    expect(body.style.overflow).toBe("hidden");
    b();
    expect(body.style.overflow).toBe("");
  });
});

describe("confirmReducer", () => {
  const closed = { open: false, submit: false };

  it("opens without submitting", () => {
    expect(confirmReducer(closed, "open")).toEqual({ open: true, submit: false });
  });

  it("confirm closes the dialog and asks for the original form to be submitted", () => {
    expect(confirmReducer({ open: true, submit: false }, "confirm")).toEqual({ open: false, submit: true });
  });

  it("cancel closes without submitting", () => {
    expect(confirmReducer({ open: true, submit: false }, "cancel")).toEqual(closed);
  });

  it("clears the submit request once it was handled", () => {
    expect(confirmReducer({ open: false, submit: true }, "submitted")).toEqual(closed);
  });

  it("ignores confirm and cancel while closed, so a late event cannot submit", () => {
    expect(confirmReducer(closed, "confirm")).toEqual(closed);
    expect(confirmReducer(closed, "cancel")).toEqual(closed);
  });
});

describe("DialogView", () => {
  const html = renderToStaticMarkup(
    <DialogView titleId="d-title" descriptionId="d-desc" title="Delete this lesson?" description="Learner progress is removed." footer={<button>Go</button>}>
      <p>Extra body</p>
    </DialogView>,
  );

  it("is a modal dialog labelled by the title and described by the body", () => {
    const [attrs] = tagAttrs(html, "div").filter((a) => a.role === "dialog");
    expect(attrs["aria-modal"]).toBe("true");
    expect(attrs["aria-labelledby"]).toBe("d-title");
    expect(attrs["aria-describedby"]).toBe("d-desc");
    expect(attrs.tabindex).toBe("-1");
    expect(html).toContain('<h2 id="d-title"');
    expect(html).toContain('id="d-desc"');
    expect(html).toContain("Learner progress is removed.");
    expect(html).toContain("Extra body");
  });

  it("uses the dialog radius, the float shadow and a flat translucent ink backdrop", () => {
    const [panel] = tagAttrs(html, "div").filter((a) => a.role === "dialog");
    expect(panel.class).toContain("rounded-dialog");
    expect(panel.class).toContain("shadow-float");
    expect(panel.class).toContain("bg-surface");
    const backdrop = tagAttrs(html, "div").find((a) => a["data-dialog-backdrop"] !== undefined);
    expect(backdrop?.class).toContain("bg-ink/40");
    expect(backdrop?.["aria-hidden"]).toBe("true");
    expect(html).not.toMatch(/backdrop-blur|gradient/);
  });

  it("omits aria-describedby when there is nothing to describe", () => {
    const bare = renderToStaticMarkup(<DialogView titleId="t" descriptionId="d" title="Hello" />);
    expect(bare).not.toContain("aria-describedby");
  });
});

describe("Dialog", () => {
  it("renders nothing while closed", () => {
    expect(renderToStaticMarkup(<Dialog open={false} onClose={() => {}} title="Hi" />)).toBe("");
  });

  it("renders nothing on the server even when open: it mounts into a portal on the client only", () => {
    expect(renderToStaticMarkup(<Dialog open onClose={() => {}} title="Hi" />)).toBe("");
  });
});

describe("ConfirmActions", () => {
  const html = renderToStaticMarkup(<ConfirmActions confirmLabel="Delete" cancelLabel="Cancel" onConfirm={() => {}} onCancel={() => {}} />);

  it("renders cancel before confirm, both as non-submitting buttons", () => {
    const buttons = tagAttrs(html, "button");
    expect(buttons).toHaveLength(2);
    expect(buttons.every((b) => b.type === "button")).toBe(true);
    expect(html.indexOf("Cancel")).toBeLessThan(html.indexOf("Delete"));
  });

  it("styles confirm as the danger button and cancel as secondary", () => {
    const [cancel, confirm] = tagAttrs(html, "button");
    expect(cancel.class).toContain("btn-secondary");
    expect(confirm.class).toContain("btn-danger");
  });

  it("can render a non-destructive confirm as the primary button", () => {
    const calm = renderToStaticMarkup(<ConfirmActions confirmLabel="Publish" cancelLabel="Cancel" destructive={false} onConfirm={() => {}} onCancel={() => {}} />);
    expect(tagAttrs(calm, "button")[1].class).toContain("btn-primary");
  });
});
