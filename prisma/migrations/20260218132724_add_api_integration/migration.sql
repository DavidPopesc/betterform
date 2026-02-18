/*
  Warnings:

  - A unique constraint covering the columns `[apiKey]` on the table `Form` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Form" ADD COLUMN     "apiEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "apiKey" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Form_apiKey_key" ON "Form"("apiKey");
