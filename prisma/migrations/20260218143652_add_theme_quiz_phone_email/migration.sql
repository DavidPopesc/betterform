-- AlterEnum
ALTER TYPE "FieldType" ADD VALUE 'phone';

-- AlterTable
ALTER TABLE "Form" ADD COLUMN     "isQuiz" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "oneResponsePerEmail" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "responseDeadline" TIMESTAMP(3),
ADD COLUMN     "responsesEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "showScore" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "theme" TEXT NOT NULL DEFAULT 'blue';

-- CreateTable
CREATE TABLE "FormAccountUUID" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeen" TIMESTAMP(3) NOT NULL,
    "ipAddresses" JSONB NOT NULL DEFAULT '[]',
    "deviceMetrics" JSONB,
    "verifiedEmails" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "verifiedPhones" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "formsViewed" JSONB NOT NULL DEFAULT '[]',
    "formsSubmitted" JSONB NOT NULL DEFAULT '[]',

    CONSTRAINT "FormAccountUUID_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailVerificationRecord" (
    "id" TEXT NOT NULL,
    "formId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "formAccountId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailVerificationRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EmailVerificationRecord_tokenHash_key" ON "EmailVerificationRecord"("tokenHash");

-- CreateIndex
CREATE INDEX "EmailVerificationRecord_formId_email_idx" ON "EmailVerificationRecord"("formId", "email");

-- CreateIndex
CREATE INDEX "EmailVerificationRecord_formAccountId_idx" ON "EmailVerificationRecord"("formAccountId");

-- AddForeignKey
ALTER TABLE "EmailVerificationRecord" ADD CONSTRAINT "EmailVerificationRecord_formId_fkey" FOREIGN KEY ("formId") REFERENCES "Form"("id") ON DELETE CASCADE ON UPDATE CASCADE;
