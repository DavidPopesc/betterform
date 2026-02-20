-- CreateTable
CREATE TABLE "LoginApproval" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "approved" BOOLEAN NOT NULL DEFAULT false,
    "rejected" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "approvedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),

    CONSTRAINT "LoginApproval_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LoginApproval_tokenHash_key" ON "LoginApproval"("tokenHash");

-- CreateIndex
CREATE INDEX "LoginApproval_userId_idx" ON "LoginApproval"("userId");

-- CreateIndex
CREATE INDEX "LoginApproval_expiresAt_idx" ON "LoginApproval"("expiresAt");

-- AddForeignKey
ALTER TABLE "LoginApproval" ADD CONSTRAINT "LoginApproval_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;
