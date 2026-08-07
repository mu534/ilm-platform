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
 *
 * @param lectureId        The lecture to check.
 * @param orderedLectureIds All lecture IDs for the course in order (flat, all modules).
 * @param completedIds     Set of lecture IDs the student has already completed.
 * @param sequential       Whether the course has sequential learning enabled.
 */
export function isLectureLocked(
  lectureId:         string,
  orderedLectureIds: string[],
  completedIds:      Set<string>,
  sequential:        boolean,
): boolean {
  if (!sequential) return false;

  const idx = orderedLectureIds.indexOf(lectureId);
  if (idx <= 0) return false; // first lecture is always unlocked

  // Every lecture before this one must be completed
  for (let i = 0; i < idx; i++) {
    if (!completedIds.has(orderedLectureIds[i]!)) return true;
  }
  return false;
}

/**
 * Returns the slug of the next lecture the student should watch,
 * i.e. the first incomplete lecture in order, falling back to the first
 * lecture if nothing has been started yet.
 */
export function getNextLectureSlug(
  lectures:     { id: string; slug: string }[],
  completedIds: Set<string>,
): string | null {
  if (lectures.length === 0) return null;
  const next = lectures.find((l) => !completedIds.has(l.id));
  return next?.slug ?? lectures[0]?.slug ?? null;
}
