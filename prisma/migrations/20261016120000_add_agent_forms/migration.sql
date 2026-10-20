-- AlterTable
ALTER TABLE "Form" ALTER COLUMN "accountId" DROP NOT NULL,
ADD COLUMN     "createdByAgent" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "claimTokenHash" TEXT,
ADD COLUMN     "editTokenHash" TEXT,
ADD COLUMN     "claimExpiresAt" TIMESTAMP(3),
ADD COLUMN     "claimedAt" TIMESTAMP(3),
ADD COLUMN     "creatorIpHash" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Form_claimTokenHash_key" ON "Form"("claimTokenHash");

-- CreateIndex
CREATE UNIQUE INDEX "Form_editTokenHash_key" ON "Form"("editTokenHash");

-- CreateIndex
CREATE INDEX "Form_claimExpiresAt_idx" ON "Form"("claimExpiresAt");

-- CreateIndex
CREATE INDEX "Form_creatorIpHash_createdAt_idx" ON "Form"("creatorIpHash", "createdAt");
