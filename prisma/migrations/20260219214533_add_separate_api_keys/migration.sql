/*
  Warnings:

  - A unique constraint covering the columns `[submissionApiKey]` on the table `Form` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[dataApiKey]` on the table `Form` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Form" ADD COLUMN     "dataApiKey" TEXT,
ADD COLUMN     "submissionApiKey" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Form_submissionApiKey_key" ON "Form"("submissionApiKey");

-- CreateIndex
CREATE UNIQUE INDEX "Form_dataApiKey_key" ON "Form"("dataApiKey");
