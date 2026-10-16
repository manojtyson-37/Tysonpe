import { describe, expect, it } from "vitest";
import { escapeAlreadyHandled, tabAtEdge } from "./overlay";

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
