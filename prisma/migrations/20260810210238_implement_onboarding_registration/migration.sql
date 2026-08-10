-- AlterTable
ALTER TABLE "scholar_applications" ALTER COLUMN "institutions" DROP DEFAULT,
ALTER COLUMN "qualifications" DROP DEFAULT,
ALTER COLUMN "specializations" DROP DEFAULT,
ALTER COLUMN "intendedCategories" DROP DEFAULT,
ALTER COLUMN "teachingLanguages" DROP DEFAULT,
ALTER COLUMN "documentKeys" DROP DEFAULT;
