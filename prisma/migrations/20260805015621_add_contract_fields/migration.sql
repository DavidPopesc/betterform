-- AlterTable
ALTER TABLE "Response" ADD COLUMN     "contractSnapshot" JSONB,
ADD COLUMN     "deviceMetadata" JSONB,
ADD COLUMN     "locked" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "lockedAt" TIMESTAMP(3),
ADD COLUMN     "respondentUserAgent" TEXT,
ADD COLUMN     "signedAt" TIMESTAMP(3);
