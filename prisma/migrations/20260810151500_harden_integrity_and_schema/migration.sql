-- AlterTable Certificate: make courseId NOT NULL and set CASCADE
ALTER TABLE "certificates" ALTER COLUMN "courseId" SET NOT NULL;
ALTER TABLE "certificates" DROP CONSTRAINT IF EXISTS "certificates_courseId_fkey";
ALTER TABLE "certificates" ADD CONSTRAINT "certificates_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateUniqueIndex QuizAnswer
CREATE UNIQUE INDEX IF NOT EXISTS "quiz_answers_attemptId_questionId_key" ON "quiz_answers"("attemptId", "questionId");

-- Check constraint for ForumVote (exactly one target)
ALTER TABLE "forum_votes" DROP CONSTRAINT IF EXISTS "forum_votes_target_xor";
ALTER TABLE "forum_votes" ADD CONSTRAINT "forum_votes_target_xor" CHECK (
  ("questionId" IS NOT NULL AND "replyId" IS NULL) OR
  ("questionId" IS NULL AND "replyId" IS NOT NULL)
);

-- Check constraint for Bookmark (exactly one target)
ALTER TABLE "bookmarks" DROP CONSTRAINT IF EXISTS "bookmarks_target_xor";
ALTER TABLE "bookmarks" ADD CONSTRAINT "bookmarks_target_xor" CHECK (
  ("lectureId" IS NOT NULL AND "courseId" IS NULL) OR
  ("lectureId" IS NULL AND "courseId" IS NOT NULL)
);

-- Check constraint for Report (at least one target)
ALTER TABLE "reports" DROP CONSTRAINT IF EXISTS "reports_at_least_one_target";
ALTER TABLE "reports" ADD CONSTRAINT "reports_at_least_one_target" CHECK (
  "commentId" IS NOT NULL OR
  "forumQuestionId" IS NOT NULL OR
  "forumReplyId" IS NOT NULL OR
  "courseId" IS NOT NULL
);

-- Check constraint for CoursePrerequisite (no self-reference)
ALTER TABLE "course_prerequisites" DROP CONSTRAINT IF EXISTS "course_prerequisites_no_self_ref";
ALTER TABLE "course_prerequisites" ADD CONSTRAINT "course_prerequisites_no_self_ref" CHECK (
  "prerequisiteCourseId" <> "dependentCourseId"
);
