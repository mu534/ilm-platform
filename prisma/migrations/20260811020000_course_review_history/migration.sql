CREATE TABLE "course_reviews" (
  "id" TEXT NOT NULL,
  "courseId" TEXT NOT NULL,
  "reviewerId" TEXT NOT NULL,
  "status" "ContentApprovalStatus" NOT NULL,
  "applicantNote" TEXT,
  "internalNotes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "course_reviews_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "course_reviews_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "course_reviews_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "course_reviews_courseId_createdAt_idx" ON "course_reviews"("courseId", "createdAt");
