import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import {
  TOAST_MAX_VISIBLE,
  TOAST_MAX_WAITING,
  TOAST_TTL_MS,
  TOAST_WAITING_MAX_AGE_MS,
  ToastAnnouncer,
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
    expect(state.waiting).toEqual([{ id: "d", message: "Newer", tone: "info", queuedAt: 10 }]);
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

  it("never auto-expires a bad toast: it stays until dismissed", () => {
    let state = toastReducer(initialToastState, { type: "add", toast: item("e", "bad"), now: 0 });
    expect(state.visible[0].expiresAt).toBeNull();
    expect(nextExpiry(state)).toBeNull();
    expect(toastReducer(state, { type: "expire", now: 10 * TOAST_TTL_MS })).toBe(state);
    state = toastReducer(state, { type: "dismiss", id: "e", now: 10 * TOAST_TTL_MS });
    expect(state.visible).toEqual([]);
  });

  it("caps the waiting list, dropping the oldest entries", () => {
    let state = initialToastState;
    for (let i = 0; i < TOAST_MAX_VISIBLE + TOAST_MAX_WAITING + 5; i++) state = toastReducer(state, { type: "add", toast: item(`t${i}`), now: i });
    expect(state.waiting).toHaveLength(TOAST_MAX_WAITING);
    expect(state.waiting[0].id).toBe("t8");
    expect(state.waiting[TOAST_MAX_WAITING - 1].id).toBe(`t${TOAST_MAX_VISIBLE + TOAST_MAX_WAITING + 4}`);
  });

  it("prunes waiting toasts older than a minute and keeps the rest", () => {
    let state = initialToastState;
    for (const id of ["a", "b", "c"]) state = toastReducer(state, { type: "add", toast: item(id), now: 0 });
    state = toastReducer(state, { type: "add", toast: item("old"), now: 0 });
    state = toastReducer(state, { type: "add", toast: item("new"), now: 50_000 });
    expect(TOAST_WAITING_MAX_AGE_MS).toBe(60_000);
    const pruned = toastReducer(state, { type: "prune", now: 60_001 });
    expect(pruned.waiting.map((t) => t.id)).toEqual(["new"]);
    expect(toastReducer(pruned, { type: "prune", now: 60_002 })).toBe(pruned);
  });
});

describe("toastReducer pause and resume", () => {
  it("pause stops every timer and remembers what was left; resume restarts it from that", () => {
    let state = toastReducer(initialToastState, { type: "add", toast: item("a"), now: 0 });
    state = toastReducer(state, { type: "add", toast: item("b"), now: 1000 });
    state = toastReducer(state, { type: "pause", now: 3000 });
    expect(state.paused).toBe(true);
    expect(state.visible.map((t) => [t.expiresAt, t.remainingMs])).toEqual([[null, 1000], [null, 2000]]);
    expect(nextExpiry(state)).toBeNull();
    expect(toastReducer(state, { type: "expire", now: 99_999 })).toBe(state);

    state = toastReducer(state, { type: "resume", now: 10_000 });
    expect(state.paused).toBe(false);
    expect(state.visible.map((t) => [t.expiresAt, t.remainingMs])).toEqual([[11_000, undefined], [12_000, undefined]]);
  });

  it("a toast added or promoted while paused gets its full time only once resumed", () => {
    let state = toastReducer(initialToastState, { type: "pause", now: 0 });
    state = toastReducer(state, { type: "add", toast: item("a"), now: 100 });
    expect(state.visible[0]).toMatchObject({ expiresAt: null, remainingMs: TOAST_TTL_MS });
    state = toastReducer(state, { type: "resume", now: 5000 });
    expect(state.visible[0].expiresAt).toBe(5000 + TOAST_TTL_MS);
  });

  it("keeps bad toasts untimed through pause and resume", () => {
    let state = toastReducer(initialToastState, { type: "add", toast: item("e", "bad"), now: 0 });
    state = toastReducer(state, { type: "pause", now: 1 });
    state = toastReducer(state, { type: "resume", now: 2 });
    expect(state.visible[0].expiresAt).toBeNull();
    expect(state.visible[0].remainingMs).toBeUndefined();
  });

  it("returns the same state when already paused or already running", () => {
    const running = toastReducer(initialToastState, { type: "add", toast: item("a"), now: 0 });
    expect(toastReducer(running, { type: "resume", now: 1 })).toBe(running);
    const paused = toastReducer(running, { type: "pause", now: 1 });
    expect(toastReducer(paused, { type: "pause", now: 2 })).toBe(paused);
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
  it("expires a toast even when the timer fires a millisecond early", () => {
    let now = 0;
    const store = createToastStore(() => now);
    store.add({ message: "Saved", tone: "good" });
    store.add({ message: "Later", tone: "info" });
    const expiry = nextExpiry(store.getState());
    expect(expiry).toBe(4000);
    now = 3999; // setTimeout can land before the clock reads the expiry
    store.expire();
    expect(store.getState().visible).toEqual([]);
    expect(nextExpiry(store.getState())).toBeNull(); // the Toaster effect re-arms (or clears) because the expiry changed
  });

  it("promotes a waiting toast when an early timer expires one, so the queue does not stall", () => {
    let now = 0;
    const store = createToastStore(() => now);
    for (const id of ["a", "b", "c", "d"]) store.add({ id, message: id });
    now = 3990;
    store.expire();
    expect(store.getState().visible.map((t) => t.id)).toEqual(["d"]);
    expect(nextExpiry(store.getState())).toBe(4000 + TOAST_TTL_MS); // the early timer is treated as the expiry it was aimed at
  });

  it("pauses and resumes through the store", () => {
    let now = 0;
    const store = createToastStore(() => now);
    store.add({ message: "Saved" });
    now = 1000;
    store.pause();
    now = 50_000;
    store.resume();
    expect(store.getState().visible[0].expiresAt).toBe(50_000 + 3000);
  });

  it("drops stale waiting toasts on prune", () => {
    let now = 0;
    const store = createToastStore(() => now);
    for (const id of ["a", "b", "c", "d"]) store.add({ id, message: id });
    now = 61_000;
    store.prune();
    expect(store.getState().waiting).toEqual([]);
  });

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
    expect(motion).not.toHaveProperty("exit");
  });
});

describe("Toaster and ToastView", () => {
  it("always renders a polite live region, even with no toasts, so announcements are not missed", () => {
    const html = renderToStaticMarkup(<Toaster />);
    expect(html).toContain('role="status"');
    expect(html).toContain('aria-live="polite"');
  });

  it("announces messages in a live region of their own, with no dismiss control inside it", () => {
    const html = renderToStaticMarkup(<ToastAnnouncer toasts={[{ ...item("a", "good"), expiresAt: 1 }, { ...item("b"), expiresAt: 1 }]} />);
    expect(html).toContain('role="status"');
    expect(html).toContain('aria-live="polite"');
    expect(html).toContain("Message a");
    expect(html).toContain("Message b");
    expect(html).not.toContain("<button");
    expect(html).not.toContain("Dismiss");
  });

  it("renders a toast with the float shadow on the toast itself and a labelled dismiss button", () => {
    const html = renderToStaticMarkup(<ToastView toast={{ ...item("a", "good"), expiresAt: 1 }} onDismiss={() => {}} />);
    expect(html).toContain("Message a");
    expect(html).toContain("shadow-float");
    expect(html).toContain("rounded-card");
    expect(html).toContain('aria-label="Dismiss notification"');
    expect(html).not.toContain('role="status"'); // the live region is the Toaster's announcer, not each toast
    expect(html).toContain('type="button"');
    expect(html).not.toMatch(/gradient|backdrop-blur|animate-pulse/);
  });

  it("gives the dismiss button a 44px hit area without growing its 28px visual", () => {
    const html = renderToStaticMarkup(<ToastView toast={{ ...item("a"), expiresAt: 1 }} onDismiss={() => {}} />);
    const button = html.match(/<button[^>]*>/)?.[0] ?? "";
    expect(button).toContain("size-7");
    expect(button).toContain("after:absolute");
    expect(button).toContain("after:-inset-2");
  });

  it("marks tone with a token colour, not an emoji", () => {
    expect(renderToStaticMarkup(<ToastView toast={{ ...item("a", "good"), expiresAt: 1 }} onDismiss={() => {}} />)).toContain("bg-good");
    expect(renderToStaticMarkup(<ToastView toast={{ ...item("a", "bad"), expiresAt: 1 }} onDismiss={() => {}} />)).toContain("bg-bad");
    expect(renderToStaticMarkup(<ToastView toast={{ ...item("a", "info"), expiresAt: 1 }} onDismiss={() => {}} />)).toContain("bg-ink");
  });
});
