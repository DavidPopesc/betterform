-- AlterTable
ALTER TABLE "Account" ADD COLUMN     "stripeAccountId" TEXT,
ADD COLUMN     "stripeAccountOnboarded" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Form" ADD COLUMN     "paymentAmountCents" INTEGER,
ADD COLUMN     "paymentCurrency" TEXT NOT NULL DEFAULT 'usd',
ADD COLUMN     "paymentRequired" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Response" ADD COLUMN     "amountPaidCents" INTEGER,
ADD COLUMN     "paidAt" TIMESTAMP(3),
ADD COLUMN     "paymentCurrency" TEXT,
ADD COLUMN     "stripePaymentIntentId" TEXT;

-- CreateTable
CREATE TABLE "PendingSubmission" (
    "id" TEXT NOT NULL,
    "formId" TEXT NOT NULL,
    "stripePaymentIntentId" TEXT NOT NULL,
    "responses" JSONB NOT NULL,
    "uploadedAttachments" JSONB,
    "submissionLocation" JSONB,
    "deviceMetadata" JSONB,
    "respondentEmail" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PendingSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PendingSubmission_stripePaymentIntentId_key" ON "PendingSubmission"("stripePaymentIntentId");

-- CreateIndex
CREATE INDEX "PendingSubmission_formId_status_idx" ON "PendingSubmission"("formId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Account_stripeAccountId_key" ON "Account"("stripeAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Response_stripePaymentIntentId_key" ON "Response"("stripePaymentIntentId");

-- AddForeignKey
ALTER TABLE "PendingSubmission" ADD CONSTRAINT "PendingSubmission_formId_fkey" FOREIGN KEY ("formId") REFERENCES "Form"("id") ON DELETE CASCADE ON UPDATE CASCADE;

