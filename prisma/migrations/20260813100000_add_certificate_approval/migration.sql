-- Add certificate approval workflow fields to courses table
ALTER TABLE "courses"
  ADD COLUMN IF NOT EXISTS "certificateApprovalStatus" "ContentApprovalStatus" NOT NULL DEFAULT 'DRAFT',
  ADD COLUMN IF NOT EXISTS "certificateRequestedAt"    TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "certificateReviewedAt"     TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "certificateReviewNote"     TEXT;

-- Index for admin querying pending certificate requests
CREATE INDEX IF NOT EXISTS "courses_certificateApprovalStatus_idx"
  ON "courses"("certificateApprovalStatus");
