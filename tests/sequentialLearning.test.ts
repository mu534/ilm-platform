import { describe, it, expect } from "vitest";
import { computeLockedLectureIds, isLectureLocked } from "../app/lib/sequentialLearning";

const LECTURES = ["l1", "l2", "l3", "l4"];

describe("computeLockedLectureIds", () => {
  it("locks nothing when sequentialLearning is disabled, regardless of progress", () => {
    const locked = computeLockedLectureIds(LECTURES, new Set(), false);
    expect(locked.size).toBe(0);
  });

  it("locks nothing when no progress exists but sequential is on (only the first lecture is ever open)", () => {
    const locked = computeLockedLectureIds(LECTURES, new Set(), true);
    expect(locked.has("l1")).toBe(false);
    expect(locked.has("l2")).toBe(true);
    expect(locked.has("l3")).toBe(true);
    expect(locked.has("l4")).toBe(true);
  });

  it("unlocks the next lecture once the current one is completed", () => {
    const locked = computeLockedLectureIds(LECTURES, new Set(["l1"]), true);
    expect(locked.has("l1")).toBe(false);
    expect(locked.has("l2")).toBe(false);
    expect(locked.has("l3")).toBe(true);
    expect(locked.has("l4")).toBe(true);
  });

  it("locks nothing once every lecture is completed", () => {
    const locked = computeLockedLectureIds(LECTURES, new Set(LECTURES), true);
    expect(locked.size).toBe(0);
  });

  it("does not unlock past a gap — completing l1 and l3 but skipping l2 still locks l3 onward", () => {
    // l3 shouldn't have been reachable in the first place, but if data
    // somehow ends up in this state (e.g. manual completion via API),
    // locking must still be driven by *earlier* lectures, not by whichever
    // ones happen to be marked complete.
    const locked = computeLockedLectureIds(LECTURES, new Set(["l1", "l3"]), true);
    expect(locked.has("l2")).toBe(false); // l1 done -> l2 unlocked
    expect(locked.has("l3")).toBe(true);  // l2 not done -> l3 still locked
    expect(locked.has("l4")).toBe(true);
  });

  it("handles an empty course without throwing", () => {
    const locked = computeLockedLectureIds([], new Set(), true);
    expect(locked.size).toBe(0);
  });
});

describe("isLectureLocked", () => {
  it("never locks the first lecture, even with zero progress", () => {
    expect(isLectureLocked("l1", LECTURES, new Set(), true)).toBe(false);
  });

  it("returns false for a lecture id not found in the course (fails open rather than blocking)", () => {
    expect(isLectureLocked("does-not-exist", LECTURES, new Set(), true)).toBe(false);
  });

  it("locks a later lecture when an earlier one is incomplete", () => {
    expect(isLectureLocked("l3", LECTURES, new Set(["l1"]), true)).toBe(true);
  });

  it("unlocks a later lecture once all earlier ones are complete", () => {
    expect(isLectureLocked("l3", LECTURES, new Set(["l1", "l2"]), true)).toBe(false);
  });

  it("never locks anything when sequentialLearning is off", () => {
    expect(isLectureLocked("l4", LECTURES, new Set(), false)).toBe(false);
  });
});
