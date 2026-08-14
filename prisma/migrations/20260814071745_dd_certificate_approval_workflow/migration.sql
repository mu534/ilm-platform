/*
  Warnings:

  - The `certificateApprovalStatus` column on the `courses` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - A unique constraint covering the columns `[certificateId]` on the table `certificates` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "CertificateApprovalStatus" AS ENUM ('NOT_REQUESTED', 'PENDING_REVIEW', 'APPROVED', 'REJECTED', 'DISABLED');

-- DropIndex
DROP INDEX "courses_certificateApprovalStatus_idx";

-- AlterTable
ALTER TABLE "certificates" ADD COLUMN     "certificateId" TEXT,
ADD COLUMN     "certificateTemplateVersion" TEXT NOT NULL DEFAULT 'v2.0',
ADD COLUMN     "completionDate" TIMESTAMP(3),
ADD COLUMN     "courseDuration" INTEGER,
ADD COLUMN     "instructorName" TEXT,
ADD COLUMN     "isRevoked" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "revocationReason" TEXT,
ADD COLUMN     "revokedAt" TIMESTAMP(3),
ADD COLUMN     "revokedById" TEXT,
ADD COLUMN     "signaturesSnapshot" JSONB,
ADD COLUMN     "studentName" TEXT,
ADD COLUMN     "verificationUrl" TEXT;

-- AlterTable
ALTER TABLE "courses" ADD COLUMN     "certificateEnabled" BOOLEAN NOT NULL DEFAULT false,
DROP COLUMN "certificateApprovalStatus",
ADD COLUMN     "certificateApprovalStatus" "CertificateApprovalStatus" NOT NULL DEFAULT 'NOT_REQUESTED';

-- AlterTable
ALTER TABLE "lectures" ADD COLUMN     "isOptional" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "quizzes" ADD COLUMN     "isOptional" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "certificate_audits" (
    "id" TEXT NOT NULL,
    "certificateId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "performedById" TEXT,
    "reason" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "certificate_audits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "certificate_signatures" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "title" TEXT,
    "imageUrl" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "certificate_signatures_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "certificate_audits_certificateId_idx" ON "certificate_audits"("certificateId");

-- CreateIndex
CREATE UNIQUE INDEX "certificates_certificateId_key" ON "certificates"("certificateId");

-- CreateIndex
CREATE INDEX "certificates_certificateId_idx" ON "certificates"("certificateId");

-- AddForeignKey
ALTER TABLE "certificates" ADD CONSTRAINT "certificates_revokedById_fkey" FOREIGN KEY ("revokedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certificate_audits" ADD CONSTRAINT "certificate_audits_certificateId_fkey" FOREIGN KEY ("certificateId") REFERENCES "certificates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certificate_audits" ADD CONSTRAINT "certificate_audits_performedById_fkey" FOREIGN KEY ("performedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
