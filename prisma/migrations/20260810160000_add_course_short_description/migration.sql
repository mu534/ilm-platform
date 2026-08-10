-- AlterTable: add shortDescription to courses (nullable — fallback excerpt from description)
ALTER TABLE "courses" ADD COLUMN "shortDescription" TEXT;