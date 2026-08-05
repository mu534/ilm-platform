-- CreateEnum
CREATE TYPE "MediaCategory" AS ENUM ('RESOURCE', 'REFERENCE');

-- AlterEnum
ALTER TYPE "MediaType" ADD VALUE 'LINK';

-- AlterTable
ALTER TABLE "courses" ADD COLUMN     "enrollmentType" TEXT NOT NULL DEFAULT 'FREE',
ADD COLUMN     "language" TEXT NOT NULL DEFAULT 'en',
ADD COLUMN     "seoDescription" TEXT,
ADD COLUMN     "seoTitle" TEXT,
ADD COLUMN     "subtitle" TEXT,
ADD COLUMN     "tags" TEXT[];

-- AlterTable
ALTER TABLE "media" ADD COLUMN     "category" "MediaCategory" NOT NULL DEFAULT 'RESOURCE';
