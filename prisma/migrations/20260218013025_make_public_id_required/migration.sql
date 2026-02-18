/*
  Warnings:

  - Made the column `publicId` on table `Form` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Form" ALTER COLUMN "publicId" SET NOT NULL;
