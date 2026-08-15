/**
 * Sequential learning helpers.
 *
 * When a course has `sequentialLearning: true`, students must complete
 * lectures and pass module quizzes in order — they cannot skip ahead by pasting a later URL.
 *
 * Rules:
 *  - The very first lecture is always unlocked (students must start somewhere).
 *  - Every subsequent lecture is locked until all lectures before it are completed,
 *    AND any quizzes in preceding modules have been taken and passed.
 *  - A module's quiz unlocks only after all lectures within that module are completed.
 *  - Staff (ADMIN / INSTRUCTOR) bypass the lock — they can preview any lesson or quiz.
 */

export interface ModuleCheckpoint {
  id:       string;
  order?:   number;
  lectures: { id: string; order?: number; isOptional?: boolean; slug?: string }[];
  quizzes?: { id: string; isOptional?: boolean; title?: string }[];
}

/**
 * Returns true if the given lecture should be locked for the current student.
 * Checks both lecture order and whether prior module quizzes were passed.
 */
export function isLectureLocked(
  lectureId:         string,
  orderedLectureIds: string[],
  completedIds:      Set<string>,
  sequential:        boolean,
  modulesWithQuizzes?: ModuleCheckpoint[],
  passedQuizIds?:    Set<string>,
): boolean {
  if (!sequential) return false;

  const idx = orderedLectureIds.indexOf(lectureId);
  if (idx === -1) return false; // fail-open for unlisted
  if (idx === 0) return false;  // first lecture is always unlocked

  // 1. Basic lecture order check: all prior lectures in the global order must be done
  for (let i = 0; i < idx; i++) {
    if (!completedIds.has(orderedLectureIds[i]!)) return true;
  }

  // 2. Check if any prior module has an unpassed mandatory quiz
  if (modulesWithQuizzes && passedQuizIds) {
    const targetModuleIndex = modulesWithQuizzes.findIndex((m) =>
      m.lectures.some((l) => l.id === lectureId)
    );
    if (targetModuleIndex > 0) {
      for (let m = 0; m < targetModuleIndex; m++) {
        const prevMod = modulesWithQuizzes[m];
        if (prevMod?.quizzes) {
          for (const q of prevMod.quizzes) {
            if (!q.isOptional && !passedQuizIds.has(q.id)) {
              return true;
            }
          }
        }
      }
    }
  }

  return false;
}

/**
 * Returns true if a module quiz is locked for the student.
 * A quiz in module M is locked if:
 * 1. Any lecture in module M is not completed, OR
 * 2. Any prior module (0...M-1) has incomplete lectures or unpassed quizzes.
 */
export function isQuizLocked(
  quizId:              string,
  modulesWithQuizzes:  ModuleCheckpoint[],
  completedLectureIds: Set<string>,
  passedQuizIds:       Set<string>,
  sequential:          boolean,
): boolean {
  if (!sequential) return false;

  const targetModuleIndex = modulesWithQuizzes.findIndex((m) =>
    m.quizzes?.some((q) => q.id === quizId)
  );
  if (targetModuleIndex === -1) return false;

  // All lectures in current module must be completed
  const currentModule = modulesWithQuizzes[targetModuleIndex];
  for (const lec of currentModule.lectures) {
    if (!lec.isOptional && !completedLectureIds.has(lec.id)) return true;
  }

  // All prior modules must have completed lectures and passed quizzes
  for (let m = 0; m < targetModuleIndex; m++) {
    const prevMod = modulesWithQuizzes[m];
    for (const lec of prevMod.lectures) {
      if (!lec.isOptional && !completedLectureIds.has(lec.id)) return true;
    }
    if (prevMod.quizzes) {
      for (const q of prevMod.quizzes) {
        if (!q.isOptional && !passedQuizIds.has(q.id)) return true;
      }
    }
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
  modulesWithQuizzes?: ModuleCheckpoint[],
  passedQuizIds?:    Set<string>,
): Set<string> {
  if (!sequential) return new Set();

  const locked = new Set<string>();

  if (!modulesWithQuizzes || !passedQuizIds) {
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

  // Module-aware locking with mandatory quizzes
  let blocked = false;
  for (const mod of modulesWithQuizzes) {
    let modLecturesComplete = true;

    for (const lec of mod.lectures) {
      if (blocked) {
        locked.add(lec.id);
      } else if (!completedIds.has(lec.id)) {
        locked.add(lec.id);
        modLecturesComplete = false;
        blocked = true;
      }
    }

    const requiredQuizzes = (mod.quizzes ?? []).filter((q) => !q.isOptional);
    const allQuizzesPassed = requiredQuizzes.every((q) => passedQuizIds.has(q.id));

    if (!modLecturesComplete || !allQuizzesPassed) {
      blocked = true;
    }
  }

  // First lecture of the whole course is never locked
  if (orderedLectureIds.length > 0) {
    locked.delete(orderedLectureIds[0]!);
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
