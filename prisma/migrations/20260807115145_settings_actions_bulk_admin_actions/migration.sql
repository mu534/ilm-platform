-- AlterTable
ALTER TABLE "users" ADD COLUMN     "notifyComments" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "notifyNewContent" BOOLEAN NOT NULL DEFAULT true;
