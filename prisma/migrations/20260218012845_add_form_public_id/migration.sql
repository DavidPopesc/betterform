/*
  Warnings:

  - A unique constraint covering the columns `[publicId]` on the table `Form` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Form" ADD COLUMN     "publicId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Form_publicId_key" ON "Form"("publicId");
