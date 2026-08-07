/**
 * Sequential learning helpers.
 *
 * When a course has `sequentialLearning: true`, students must complete
 * lectures in order — they cannot skip ahead by pasting a later URL.
 *
 * Rules:
 *  - The very first lecture is always unlocked (students must start somewhere).
 *  - Every subsequent lecture is locked until all lectures before it are done.
 *  - Staff (ADMIN / SCHOLAR) bypass the lock — they can preview any lesson.
 */

/**
 * Returns true if the given lecture should be locked for the current student.
 */
export function isLectureLocked(
  lectureId:         string,
  orderedLectureIds: string[],
  completedIds:      Set<string>,
  sequential:        boolean,
): boolean {
  if (!sequential) return false;
  const idx = orderedLectureIds.indexOf(lectureId);
  if (idx <= 0) return false;
  for (let i = 0; i < idx; i++) {
    if (!completedIds.has(orderedLectureIds[i]!)) return true;
  }
  return false;
}

/**
 * Returns a Set of all lecture IDs that are currently locked.
 * Used by the curriculum API to annotate the full sidebar in one pass.
 */
export function computeLockedLectureIds(
  orderedLectureIds: string[],
  completedIds:      Set<string>,
  sequential:        boolean,
): Set<string> {
  if (!sequential) return new Set();

  const locked = new Set<string>();
  for (let i = 1; i < orderedLectureIds.length; i++) {
    if (!completedIds.has(orderedLectureIds[i - 1]!)) {
      // Everything from i onwards is locked
      for (let j = i; j < orderedLectureIds.length; j++) {
        locked.add(orderedLectureIds[j]!);
      }
      break;
    }
  }
  return locked;
}

/**
 * Returns the slug of the next lecture the student should watch —
 * the first incomplete lecture in order, falling back to the first lecture.
 */
export function getNextLectureSlug(
  lectures:     { id: string; slug: string }[],
  completedIds: Set<string>,
): string | null {
  if (lectures.length === 0) return null;
  const next = lectures.find((l) => !completedIds.has(l.id));
  return next?.slug ?? lectures[0]?.slug ?? null;
}
