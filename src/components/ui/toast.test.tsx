import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import {
  TOAST_MAX_VISIBLE,
  TOAST_TTL_MS,
  ToastView,
  Toaster,
  createToastStore,
  initialToastState,
  nextExpiry,
  toastMotion,
  toastReducer,
} from "./toast";

const item = (id: string, tone: "info" | "good" | "bad" = "info") => ({ id, message: `Message ${id}`, tone });

describe("toastReducer", () => {
  it("adds a toast that expires after 4 seconds", () => {
    const state = toastReducer(initialToastState, { type: "add", toast: item("a"), now: 1000 });
    expect(TOAST_TTL_MS).toBe(4000);
    expect(state.visible).toEqual([{ ...item("a"), expiresAt: 5000 }]);
    expect(state.waiting).toEqual([]);
  });

  it("shows at most three and holds the rest in order", () => {
    let state = initialToastState;
    for (const id of ["a", "b", "c", "d", "e"]) state = toastReducer(state, { type: "add", toast: item(id), now: 0 });
    expect(TOAST_MAX_VISIBLE).toBe(3);
    expect(state.visible.map((t) => t.id)).toEqual(["a", "b", "c"]);
    expect(state.waiting.map((t) => t.id)).toEqual(["d", "e"]);
  });

  it("dedupes by id: re-adding replaces the text and restarts the timer without stacking", () => {
    let state = toastReducer(initialToastState, { type: "add", toast: item("a"), now: 0 });
    state = toastReducer(state, { type: "add", toast: { ...item("a"), message: "Updated" }, now: 3000 });
    expect(state.visible).toEqual([{ id: "a", message: "Updated", tone: "info", expiresAt: 7000 }]);
  });

  it("dedupes against the waiting list too", () => {
    let state = initialToastState;
    for (const id of ["a", "b", "c", "d"]) state = toastReducer(state, { type: "add", toast: item(id), now: 0 });
    state = toastReducer(state, { type: "add", toast: { ...item("d"), message: "Newer" }, now: 10 });
    expect(state.waiting).toEqual([{ id: "d", message: "Newer", tone: "info" }]);
  });

  it("dismisses a visible toast and promotes the next waiting one with a fresh timer", () => {
    let state = initialToastState;
    for (const id of ["a", "b", "c", "d"]) state = toastReducer(state, { type: "add", toast: item(id), now: 0 });
    state = toastReducer(state, { type: "dismiss", id: "b", now: 1500 });
    expect(state.visible.map((t) => t.id)).toEqual(["a", "c", "d"]);
    expect(state.visible[2].expiresAt).toBe(5500);
    expect(state.waiting).toEqual([]);
  });

  it("dismisses a waiting toast without touching what is visible", () => {
    let state = initialToastState;
    for (const id of ["a", "b", "c", "d"]) state = toastReducer(state, { type: "add", toast: item(id), now: 0 });
    state = toastReducer(state, { type: "dismiss", id: "d", now: 10 });
    expect(state.visible.map((t) => t.id)).toEqual(["a", "b", "c"]);
    expect(state.waiting).toEqual([]);
  });

  it("ignores dismissing an unknown id", () => {
    const state = toastReducer(initialToastState, { type: "add", toast: item("a"), now: 0 });
    expect(toastReducer(state, { type: "dismiss", id: "zzz", now: 1 })).toBe(state);
  });

  it("expires only the toasts whose time is up and promotes from the queue", () => {
    let state = toastReducer(initialToastState, { type: "add", toast: item("a"), now: 0 });
    state = toastReducer(state, { type: "add", toast: item("b"), now: 2000 });
    state = toastReducer(state, { type: "add", toast: item("c"), now: 2000 });
    state = toastReducer(state, { type: "add", toast: item("d"), now: 2000 });
    state = toastReducer(state, { type: "expire", now: 3999 });
    expect(state.visible.map((t) => t.id)).toEqual(["a", "b", "c"]);
    state = toastReducer(state, { type: "expire", now: 4000 });
    expect(state.visible.map((t) => t.id)).toEqual(["b", "c", "d"]);
    expect(state.visible[2].expiresAt).toBe(8000);
  });

  it("returns the same state when nothing expired, so subscribers are not woken", () => {
    const state = toastReducer(initialToastState, { type: "add", toast: item("a"), now: 0 });
    expect(toastReducer(state, { type: "expire", now: 10 })).toBe(state);
  });
});

describe("nextExpiry", () => {
  it("is null with nothing visible and the soonest expiry otherwise", () => {
    expect(nextExpiry(initialToastState)).toBeNull();
    let state = toastReducer(initialToastState, { type: "add", toast: item("a"), now: 500 });
    state = toastReducer(state, { type: "add", toast: item("b"), now: 100 });
    expect(nextExpiry(state)).toBe(4100);
  });
});

describe("createToastStore", () => {
  it("adds, notifies subscribers, and returns a stable snapshot between changes", () => {
    let now = 0;
    const store = createToastStore(() => now);
    let calls = 0;
    const off = store.subscribe(() => calls++);
    const before = store.getState();
    expect(store.getState()).toBe(before);

    const id = store.add({ message: "Saved", tone: "good" });
    expect(calls).toBe(1);
    expect(store.getState().visible[0]).toMatchObject({ id, message: "Saved", tone: "good", expiresAt: 4000 });

    now = 4000;
    store.expire();
    expect(calls).toBe(2);
    expect(store.getState().visible).toEqual([]);
    store.expire();
    expect(calls).toBe(2);

    off();
    store.add({ message: "Later" });
    expect(calls).toBe(2);
  });

  it("derives the id from tone and message so a repeated message does not stack", () => {
    const store = createToastStore(() => 0);
    store.add({ message: "Link copied", tone: "good" });
    store.add({ message: "Link copied", tone: "good" });
    expect(store.getState().visible).toHaveLength(1);
    store.add({ message: "Link copied", tone: "info" });
    expect(store.getState().visible).toHaveLength(2);
  });

  it("honours an explicit id and dismisses by it", () => {
    const store = createToastStore(() => 0);
    expect(store.add({ id: "save", message: "Saving" })).toBe("save");
    store.add({ id: "save", message: "Saved", tone: "good" });
    expect(store.getState().visible).toMatchObject([{ id: "save", message: "Saved", tone: "good" }]);
    store.dismiss("save");
    expect(store.getState().visible).toEqual([]);
  });
});

describe("toastMotion", () => {
  it("enters over 400ms with an ease-out and leaves faster", () => {
    const motion = toastMotion(false);
    expect(motion.initial).toMatchObject({ opacity: 0, y: 8, filter: "blur(4px)" });
    expect(motion.transition).toEqual({ duration: 0.4, ease: [0.25, 1, 0.5, 1] });
    expect((motion.exit as { transition: { duration: number } }).transition.duration).toBe(0.16);
  });

  it("has no motion under reduced motion", () => {
    const motion = toastMotion(true);
    expect(motion.initial).toBe(false);
    expect(motion.transition).toEqual({ duration: 0 });
    expect((motion.exit as { transition: { duration: number } }).transition.duration).toBe(0);
    expect(motion.exit).not.toHaveProperty("y");
  });
});

describe("Toaster and ToastView", () => {
  it("always renders a polite live region, even with no toasts, so announcements are not missed", () => {
    const html = renderToStaticMarkup(<Toaster />);
    expect(html).toContain('role="status"');
    expect(html).toContain('aria-live="polite"');
  });

  it("renders a toast with the float shadow on the toast itself and a labelled dismiss button", () => {
    const html = renderToStaticMarkup(<ToastView toast={{ ...item("a", "good"), expiresAt: 1 }} onDismiss={() => {}} />);
    expect(html).toContain("Message a");
    expect(html).toContain("shadow-float");
    expect(html).toContain("rounded-card");
    expect(html).toContain('aria-label="Dismiss notification"');
    expect(html).toContain('type="button"');
    expect(html).not.toMatch(/gradient|backdrop-blur|animate-pulse/);
  });

  it("marks tone with a token colour, not an emoji", () => {
    expect(renderToStaticMarkup(<ToastView toast={{ ...item("a", "good"), expiresAt: 1 }} onDismiss={() => {}} />)).toContain("bg-good");
    expect(renderToStaticMarkup(<ToastView toast={{ ...item("a", "bad"), expiresAt: 1 }} onDismiss={() => {}} />)).toContain("bg-bad");
    expect(renderToStaticMarkup(<ToastView toast={{ ...item("a", "info"), expiresAt: 1 }} onDismiss={() => {}} />)).toContain("bg-ink");
  });
});
