ALTER TABLE "users"
  ADD COLUMN "termsAcceptedAt" TIMESTAMP(3),
  ADD COLUMN "privacyAcceptedAt" TIMESTAMP(3),
  ADD COLUMN "termsVersion" TEXT,
  ADD COLUMN "privacyVersion" TEXT;

CREATE TABLE "consent_records" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "version" TEXT NOT NULL,
  "acceptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "consent_records_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "consent_records_userId_type_version_key" UNIQUE ("userId", "type", "version"),
  CONSTRAINT "consent_records_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "consent_records_userId_acceptedAt_idx" ON "consent_records"("userId", "acceptedAt");

CREATE TABLE "scholar_application_categories" (
  "applicationId" TEXT NOT NULL,
  "categoryId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "scholar_application_categories_pkey" PRIMARY KEY ("applicationId", "categoryId"),
  CONSTRAINT "scholar_application_categories_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "scholar_applications"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "scholar_application_categories_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "scholar_application_categories_categoryId_idx" ON "scholar_application_categories"("categoryId");
INSERT INTO "scholar_application_categories" ("applicationId", "categoryId")
SELECT sa."id", c."id"
FROM "scholar_applications" sa
CROSS JOIN LATERAL unnest(sa."intendedCategories") AS category_value(value)
JOIN "categories" c ON c."id" = category_value.value OR lower(c."name") = lower(category_value.value) OR lower(c."slug") = lower(category_value.value)
ON CONFLICT DO NOTHING;

CREATE TABLE "scholar_application_documents" (
  "id" TEXT NOT NULL,
  "applicationId" TEXT NOT NULL,
  "storageKey" TEXT NOT NULL,
  "originalName" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "size" INTEGER NOT NULL,
  "kind" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "scholar_application_documents_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "scholar_application_documents_storageKey_key" UNIQUE ("storageKey"),
  CONSTRAINT "scholar_application_documents_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "scholar_applications"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "scholar_application_documents_applicationId_idx" ON "scholar_application_documents"("applicationId");

CREATE TABLE "scholar_application_reviews" (
  "id" TEXT NOT NULL,
  "applicationId" TEXT NOT NULL,
  "reviewerId" TEXT NOT NULL,
  "status" "ScholarApplicationStatus" NOT NULL,
  "internalNotes" TEXT,
  "decisionReason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "scholar_application_reviews_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "scholar_application_reviews_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "scholar_applications"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "scholar_application_reviews_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "scholar_application_reviews_applicationId_createdAt_idx" ON "scholar_application_reviews"("applicationId", "createdAt");

ALTER TABLE "scholar_applications" DROP COLUMN "intendedCategories", DROP COLUMN "documentKeys";
ALTER TABLE "scholar_applications"
  ALTER COLUMN "institutions" DROP DEFAULT,
  ALTER COLUMN "qualifications" DROP DEFAULT,
  ALTER COLUMN "specializations" DROP DEFAULT,
  ALTER COLUMN "teachingLanguages" DROP DEFAULT;
