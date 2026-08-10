CREATE TYPE "ScholarApplicationStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED');
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'SCHOLAR_APPLICATION_SUBMITTED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'SCHOLAR_APPLICATION_APPROVED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'SCHOLAR_APPLICATION_REJECTED';
ALTER TABLE "users" ADD COLUMN "country" TEXT, ADD COLUMN "certificateName" TEXT;
CREATE TABLE "learner_profiles" (
  "id" TEXT NOT NULL, "userId" TEXT NOT NULL, "city" TEXT, "educationLevel" TEXT, "fieldOfStudy" TEXT, "occupation" TEXT,
  "preferredLanguage" TEXT NOT NULL DEFAULT 'en', "preferredDifficulty" "DifficultyLevel", "accountIntention" TEXT NOT NULL DEFAULT 'LEARN',
  "onboardingCompleted" BOOLEAN NOT NULL DEFAULT false, "onboardingStep" INTEGER NOT NULL DEFAULT 1, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "learner_profiles_pkey" PRIMARY KEY ("id"), CONSTRAINT "learner_profiles_userId_key" UNIQUE ("userId"), CONSTRAINT "learner_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE "learner_interests" ("id" TEXT NOT NULL, "profileId" TEXT NOT NULL, "categoryId" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "learner_interests_pkey" PRIMARY KEY ("id"), CONSTRAINT "learner_interests_profileId_categoryId_key" UNIQUE ("profileId", "categoryId"), CONSTRAINT "learner_interests_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "learner_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE, CONSTRAINT "learner_interests_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE);
CREATE INDEX "learner_interests_categoryId_idx" ON "learner_interests"("categoryId");
CREATE TABLE "learner_goals" ("id" TEXT NOT NULL, "profileId" TEXT NOT NULL, "goal" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "learner_goals_pkey" PRIMARY KEY ("id"), CONSTRAINT "learner_goals_profileId_goal_key" UNIQUE ("profileId", "goal"), CONSTRAINT "learner_goals_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "learner_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE);
CREATE TABLE "scholar_applications" (
  "id" TEXT NOT NULL, "userId" TEXT NOT NULL, "status" "ScholarApplicationStatus" NOT NULL DEFAULT 'DRAFT', "bio" TEXT, "city" TEXT, "education" TEXT,
  "institutions" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[], "qualifications" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[], "specializations" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[], "teachingExperience" TEXT, "teachingYears" INTEGER,
  "intendedCategories" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[], "teachingLanguages" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[], "documentKeys" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[], "submittedAt" TIMESTAMP(3), "reviewedAt" TIMESTAMP(3), "reviewedById" TEXT, "internalNotes" TEXT, "decisionReason" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "scholar_applications_pkey" PRIMARY KEY ("id"), CONSTRAINT "scholar_applications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE, CONSTRAINT "scholar_applications_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX "scholar_applications_status_submittedAt_idx" ON "scholar_applications"("status", "submittedAt");
CREATE INDEX "scholar_applications_userId_status_idx" ON "scholar_applications"("userId", "status");
