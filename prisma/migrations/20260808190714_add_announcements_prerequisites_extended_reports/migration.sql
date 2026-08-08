-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'COURSE_ANNOUNCEMENT';

-- AlterTable
ALTER TABLE "reports" ADD COLUMN     "courseId" TEXT,
ADD COLUMN     "forumQuestionId" TEXT,
ADD COLUMN     "forumReplyId" TEXT,
ADD COLUMN     "resolvedById" TEXT;

-- CreateTable
CREATE TABLE "course_prerequisites" (
    "id" TEXT NOT NULL,
    "prerequisiteCourseId" TEXT NOT NULL,
    "dependentCourseId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "course_prerequisites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "course_announcements" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "published" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "course_announcements_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "course_prerequisites_dependentCourseId_idx" ON "course_prerequisites"("dependentCourseId");

-- CreateIndex
CREATE UNIQUE INDEX "course_prerequisites_prerequisiteCourseId_dependentCourseId_key" ON "course_prerequisites"("prerequisiteCourseId", "dependentCourseId");

-- CreateIndex
CREATE INDEX "course_announcements_courseId_idx" ON "course_announcements"("courseId");

-- CreateIndex
CREATE INDEX "course_announcements_authorId_idx" ON "course_announcements"("authorId");

-- CreateIndex
CREATE INDEX "reports_reportedById_idx" ON "reports"("reportedById");

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_forumQuestionId_fkey" FOREIGN KEY ("forumQuestionId") REFERENCES "forum_questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_forumReplyId_fkey" FOREIGN KEY ("forumReplyId") REFERENCES "forum_replies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_resolvedById_fkey" FOREIGN KEY ("resolvedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_prerequisites" ADD CONSTRAINT "course_prerequisites_prerequisiteCourseId_fkey" FOREIGN KEY ("prerequisiteCourseId") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_prerequisites" ADD CONSTRAINT "course_prerequisites_dependentCourseId_fkey" FOREIGN KEY ("dependentCourseId") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_announcements" ADD CONSTRAINT "course_announcements_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_announcements" ADD CONSTRAINT "course_announcements_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
