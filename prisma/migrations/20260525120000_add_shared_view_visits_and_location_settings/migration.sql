ALTER TABLE "Form"
ADD COLUMN "requireLocationOnSubmit" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "geoLockEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "geoLockLatitude" DOUBLE PRECISION,
ADD COLUMN "geoLockLongitude" DOUBLE PRECISION,
ADD COLUMN "geoLockRadiusMeters" INTEGER,
ADD COLUMN "notifyOnLimitedViewVisit" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "Response"
ADD COLUMN "submissionLocation" JSONB;

CREATE TABLE "LimitedPublicViewVisit" (
    "id" TEXT NOT NULL,
    "formId" TEXT NOT NULL,
    "viewId" TEXT NOT NULL,
    "viewName" TEXT NOT NULL,
    "ip" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LimitedPublicViewVisit_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "LimitedPublicViewVisit_formId_viewId_createdAt_idx" ON "LimitedPublicViewVisit"("formId", "viewId", "createdAt");

ALTER TABLE "LimitedPublicViewVisit"
ADD CONSTRAINT "LimitedPublicViewVisit_formId_fkey" FOREIGN KEY ("formId") REFERENCES "Form"("id") ON DELETE CASCADE ON UPDATE CASCADE;
