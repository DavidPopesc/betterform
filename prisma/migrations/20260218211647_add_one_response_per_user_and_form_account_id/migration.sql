-- AlterTable
ALTER TABLE "Form" ADD COLUMN     "oneResponsePerUser" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Response" ADD COLUMN     "formAccountId" TEXT;
