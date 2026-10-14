import { describe, expect, it } from "vitest";
import { isUnlocked, type DripItem } from "./drip";

const DAY = 86_400_000;
const enrolledAt = new Date("2026-10-01T10:00:00Z");
const item = (over: Partial<DripItem> = {}): DripItem => ({ id: "L2", dripType: "none", dripDays: null, dripAt: null, ...over });
const ctx = (over: Record<string, unknown> = {}) => ({
  enrolledAt, now: new Date("2026-10-01T10:00:00Z"), previousItemId: null, completedIds: new Set<string>(), ...over,
});

describe("none", () => {
  it("is always unlocked", () => expect(isUnlocked(item(), ctx())).toEqual({ unlocked: true }));
});

describe("days_after_enroll", () => {
  const it3 = item({ dripType: "days_after_enroll", dripDays: 3 });
  it("locked just before the boundary, reporting when it opens", () => {
    const r = isUnlocked(it3, ctx({ now: new Date(enrolledAt.getTime() + 3 * DAY - 1) }));
    expect(r).toEqual({ unlocked: false, reason: "date", unlockAt: new Date(enrolledAt.getTime() + 3 * DAY) });
  });
  it("unlocked exactly at the boundary", () =>
    expect(isUnlocked(it3, ctx({ now: new Date(enrolledAt.getTime() + 3 * DAY) }))).toEqual({ unlocked: true }));
  it("0 days means immediately", () =>
    expect(isUnlocked(item({ dripType: "days_after_enroll", dripDays: 0 }), ctx())).toEqual({ unlocked: true }));
  it("missing days is treated as no drip rather than locking forever", () =>
    expect(isUnlocked(item({ dripType: "days_after_enroll", dripDays: null }), ctx())).toEqual({ unlocked: true }));
});

describe("on_date", () => {
  const at = new Date("2026-10-10T00:00:00Z");
  const i = item({ dripType: "on_date", dripAt: at });
  it("locked before", () =>
    expect(isUnlocked(i, ctx({ now: new Date(at.getTime() - 1) }))).toEqual({ unlocked: false, reason: "date", unlockAt: at }));
  it("unlocked at and after", () => {
    expect(isUnlocked(i, ctx({ now: at }))).toEqual({ unlocked: true });
    expect(isUnlocked(i, ctx({ now: new Date(at.getTime() + DAY) }))).toEqual({ unlocked: true });
  });
  it("missing date is treated as no drip", () =>
    expect(isUnlocked(item({ dripType: "on_date", dripAt: null }), ctx())).toEqual({ unlocked: true }));
});

describe("after_previous", () => {
  const i = item({ dripType: "after_previous" });
  it("first lesson (no previous) is open", () => expect(isUnlocked(i, ctx())).toEqual({ unlocked: true }));
  it("locked until the previous lesson is completed", () =>
    expect(isUnlocked(i, ctx({ previousItemId: "L1" }))).toEqual({ unlocked: false, reason: "after_previous" }));
  it("unlocked once previous is completed", () =>
    expect(isUnlocked(i, ctx({ previousItemId: "L1", completedIds: new Set(["L1"]) }))).toEqual({ unlocked: true }));
  it("completing some other lesson does not unlock it", () =>
    expect(isUnlocked(i, ctx({ previousItemId: "L1", completedIds: new Set(["L9"]) }))).toMatchObject({ unlocked: false }));
});

describe("unknown drip type", () => {
  it("fails closed so a corrupt value cannot leak locked content", () =>
    expect(isUnlocked(item({ dripType: "bogus" as never }), ctx())).toMatchObject({ unlocked: false }));
});
