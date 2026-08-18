-- CreateEnum
CREATE TYPE "ContactMessageType" AS ENUM ('GENERAL', 'SUPPORT', 'PARTNERSHIP', 'REPORT', 'OTHER');

-- CreateTable
CREATE TABLE "contact_messages" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "type" "ContactMessageType" NOT NULL DEFAULT 'GENERAL',
    "userId" TEXT,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contact_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "contact_messages_email_idx" ON "contact_messages"("email");

-- CreateIndex
CREATE INDEX "contact_messages_read_createdAt_idx" ON "contact_messages"("read", "createdAt");

-- AddForeignKey
ALTER TABLE "contact_messages" ADD CONSTRAINT "contact_messages_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
