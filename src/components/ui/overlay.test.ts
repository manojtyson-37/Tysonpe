import { describe, expect, it, vi } from "vitest";
import {
  escapeAlreadyHandled,
  focusReturnTarget,
  isActiveOverlay,
  isTopOverlay,
  overlayKey,
  popOverlay,
  pushOverlay,
  registerOverlay,
  returnOverlayFocus,
  tabAtEdge,
} from "./overlay";

describe("tabAtEdge", () => {
  // [index of focus in the trap's focusable list, list length, shift held, expected]
  const cases: [string, number, number, boolean, boolean][] = [
    ["focus outside the trap, Tab", -1, 3, false, true],
    ["focus outside the trap, Shift+Tab", -1, 3, true, true],
    ["on the first, Tab (stays native)", 0, 3, false, false],
    ["on the middle, Tab (stays native)", 1, 3, false, false],
    ["on the last, Tab (must wrap)", 2, 3, false, true],
    ["on the first, Shift+Tab (must wrap)", 0, 3, true, true],
    ["on the middle, Shift+Tab (stays native)", 1, 3, true, false],
    ["on the last, Shift+Tab (stays native)", 2, 3, true, false],
    ["a single element, Tab (first and last at once)", 0, 1, false, true],
    ["a single element, Shift+Tab", 0, 1, true, true],
    ["nothing focusable", -1, 0, false, true],
  ];
  it.each(cases)("%s", (_name, index, count, shift, expected) => {
    expect(tabAtEdge(index, count, shift)).toBe(expected);
  });
});

describe("escapeAlreadyHandled", () => {
  const cases: [string, { defaultPrevented: boolean; isComposing: boolean }, boolean][] = [
    ["a plain Escape is ours", { defaultPrevented: false, isComposing: false }, false],
    ["a native control already used it", { defaultPrevented: true, isComposing: false }, true],
    ["an IME composition is being cancelled", { defaultPrevented: false, isComposing: true }, true],
    ["both", { defaultPrevented: true, isComposing: true }, true],
  ];
  it.each(cases)("%s", (_name, event, expected) => {
    expect(escapeAlreadyHandled(event)).toBe(expected);
  });
});

describe("overlay stack (a sheet and a dialog share it)", () => {
  it("a dialog opened over a sheet is the only top; closing it hands the top back to the sheet", () => {
    let stack = pushOverlay([], "sheet");
    expect(isTopOverlay(stack, "sheet")).toBe(true);
    stack = pushOverlay(stack, "dialog");
    expect(isTopOverlay(stack, "dialog")).toBe(true);
    expect(isTopOverlay(stack, "sheet")).toBe(false);
    stack = popOverlay(stack, "dialog");
    expect(stack).toEqual(["sheet"]);
    expect(isTopOverlay(stack, "sheet")).toBe(true);
  });

  it("a sheet opened over a dialog is the only top", () => {
    const stack = pushOverlay(pushOverlay([], "dialog"), "sheet");
    expect(isTopOverlay(stack, "sheet")).toBe(true);
    expect(isTopOverlay(stack, "dialog")).toBe(false);
  });

  it("closing the sheet underneath leaves the dialog on top", () => {
    const stack = popOverlay(pushOverlay(pushOverlay([], "sheet"), "dialog"), "sheet");
    expect(stack).toEqual(["dialog"]);
    expect(isTopOverlay(stack, "dialog")).toBe(true);
  });

  it("has no top when empty, ignores unknown ids, keeps one entry per id and never mutates its input", () => {
    expect(isTopOverlay([], "a")).toBe(false);
    expect(popOverlay(["a"], "zzz")).toEqual(["a"]);
    expect(pushOverlay(pushOverlay([], "a"), "a")).toEqual(["a"]);
    const frozen = Object.freeze(["a"]);
    expect(pushOverlay(frozen, "b")).toEqual(["a", "b"]);
    expect(popOverlay(frozen, "a")).toEqual([]);
    expect(frozen).toEqual(["a"]);
  });
});

describe("overlay registry (the module-level stack a Sheet and a Dialog both register in)", () => {
  it("only the most recently registered overlay is active, and unregistering restores the one underneath", () => {
    const unregisterSheet = registerOverlay("reg-sheet");
    expect(isActiveOverlay("reg-sheet")).toBe(true);
    const unregisterDialog = registerOverlay("reg-dialog");
    expect(isActiveOverlay("reg-dialog")).toBe(true);
    expect(isActiveOverlay("reg-sheet")).toBe(false);
    unregisterDialog();
    expect(isActiveOverlay("reg-sheet")).toBe(true);
    unregisterSheet();
    expect(isActiveOverlay("reg-sheet")).toBe(false);
  });

  it("unregistering twice, or out of order, never disturbs the others", () => {
    const unregisterA = registerOverlay("reg-a");
    const unregisterB = registerOverlay("reg-b");
    unregisterA();
    unregisterA();
    expect(isActiveOverlay("reg-b")).toBe(true);
    unregisterB();
    expect(isActiveOverlay("reg-b")).toBe(false);
  });
});

describe("overlayKey (who handles a keydown)", () => {
  const key = (k: string, extra: { defaultPrevented?: boolean; isComposing?: boolean } = {}) => ({
    key: k,
    defaultPrevented: false,
    isComposing: false,
    ...extra,
  });

  it("an overlay that is not on top ignores Escape and Tab, so the one above it owns them", () => {
    expect(overlayKey(false, key("Escape"))).toBe("ignore");
    expect(overlayKey(false, key("Tab"))).toBe("ignore");
  });

  it("the top overlay closes on Escape and traps Tab", () => {
    expect(overlayKey(true, key("Escape"))).toBe("close");
    expect(overlayKey(true, key("Tab"))).toBe("trap");
  });

  it("the top overlay leaves an Escape that something else already used, or an IME composition, alone", () => {
    expect(overlayKey(true, key("Escape", { defaultPrevented: true }))).toBe("ignore");
    expect(overlayKey(true, key("Escape", { isComposing: true }))).toBe("ignore");
  });

  it("any other key is nobody's business", () => {
    expect(overlayKey(true, key("Enter"))).toBe("ignore");
    expect(overlayKey(true, key("a"))).toBe("ignore");
  });
});

describe("focusReturnTarget (where focus goes when an overlay closes)", () => {
  // Regression: a confirm dialog closing over the console drawer returned focus to its own trigger, which sits behind
  // the still-open modal sheet, so document.activeElement was BODY.
  it.each([
    [[], "trigger"],
    [["sheet"], "top-overlay"],
    [["sheet", "dialog"], "top-overlay"],
  ] as const)("stack remaining %j -> %s", (stack, expected) => {
    expect(focusReturnTarget(stack)).toBe(expected);
  });
});

describe("returnOverlayFocus (the one place a closing overlay gives focus back)", () => {
  it("returns to the trigger, and moves nothing else, when no other overlay is open", () => {
    const unregister = registerOverlay("rf-solo", vi.fn());
    const focusTrigger = vi.fn();
    unregister(); // a Dialog has already unregistered by its layout-effect body
    expect(returnOverlayFocus("rf-solo", focusTrigger)).toBe("trigger");
    expect(focusTrigger).toHaveBeenCalledTimes(1);
  });

  it("focuses into the overlay now on top, never the trigger behind it, when one remains", () => {
    const focusSheet = vi.fn();
    const focusDialog = vi.fn();
    const unregisterSheet = registerOverlay("rf-sheet", focusSheet);
    const unregisterDialog = registerOverlay("rf-dialog", focusDialog);
    unregisterDialog();
    const focusTrigger = vi.fn();
    expect(returnOverlayFocus("rf-dialog", focusTrigger)).toBe("top-overlay");
    expect(focusTrigger).not.toHaveBeenCalled();
    expect(focusSheet).toHaveBeenCalledTimes(1);
    expect(focusDialog).not.toHaveBeenCalled();
    unregisterSheet();
  });

  it("ignores the closing overlay even while it is still registered (a Sheet drops its entry in a later passive cleanup)", () => {
    const focusSheet = vi.fn();
    const focusDialog = vi.fn();
    const unregisterDialog = registerOverlay("rf-dialog2", focusDialog);
    const unregisterSheet = registerOverlay("rf-sheet2", focusSheet);
    const focusTrigger = vi.fn();
    expect(returnOverlayFocus("rf-sheet2", focusTrigger)).toBe("top-overlay");
    expect(focusDialog).toHaveBeenCalledTimes(1);
    expect(focusSheet).not.toHaveBeenCalled();
    expect(focusTrigger).not.toHaveBeenCalled();
    unregisterSheet();
    unregisterDialog();
  });

  it("with two remaining, focuses the topmost", () => {
    const calls: string[] = [];
    const un = ["a", "b", "c"].map((id) => registerOverlay(`rf-${id}`, () => calls.push(id)));
    un[2]();
    returnOverlayFocus("rf-c", () => calls.push("trigger"));
    expect(calls).toEqual(["b"]);
    un[1]();
    un[0]();
  });

  it("does not fall back to the hidden trigger when the top overlay registered no focus routine", () => {
    const unregister = registerOverlay("rf-mute");
    const focusTrigger = vi.fn();
    expect(returnOverlayFocus("rf-gone", focusTrigger)).toBe("top-overlay");
    expect(focusTrigger).not.toHaveBeenCalled();
    unregister();
  });

  it("forgets an overlay's focus routine when it unregisters", () => {
    const focusInto = vi.fn();
    registerOverlay("rf-forgotten", focusInto)();
    const unregister = registerOverlay("rf-other"); // no routine of its own
    returnOverlayFocus("rf-x", vi.fn());
    expect(focusInto).not.toHaveBeenCalled();
    unregister();
  });
});
