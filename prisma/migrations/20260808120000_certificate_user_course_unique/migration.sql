-- Deduplicate certificates before adding unique (userId, courseId).
-- Keep the earliest certificate for each (userId, courseId) pair.
DELETE FROM "certificates" a
USING "certificates" b
WHERE a."userId" = b."userId"
  AND a."courseId" IS NOT DISTINCT FROM b."courseId"
  AND a."courseId" IS NOT NULL
  AND a."id" <> b."id"
  AND a."issuedAt" > b."issuedAt";

CREATE UNIQUE INDEX "certificates_userId_courseId_key" ON "certificates"("userId", "courseId");
