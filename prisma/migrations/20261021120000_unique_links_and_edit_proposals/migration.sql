-- AlterTable
ALTER TABLE "PendingSubmission" ADD COLUMN     "formLinkId" TEXT;

-- AlterTable
ALTER TABLE "Response" ADD COLUMN     "formLinkId" TEXT,
ADD COLUMN     "formLinkLabel" TEXT;

-- CreateTable
CREATE TABLE "FormLink" (
    "id" TEXT NOT NULL,
    "formId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "values" JSONB NOT NULL DEFAULT '{}',
    "hiddenFieldIds" JSONB NOT NULL DEFAULT '[]',
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FormLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FormEditProposal" (
    "id" TEXT NOT NULL,
    "formId" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "definition" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "FormEditProposal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FormLink_formId_idx" ON "FormLink"("formId");

-- CreateIndex
CREATE INDEX "FormEditProposal_formId_status_idx" ON "FormEditProposal"("formId", "status");

-- AddForeignKey
ALTER TABLE "FormLink" ADD CONSTRAINT "FormLink_formId_fkey" FOREIGN KEY ("formId") REFERENCES "Form"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FormEditProposal" ADD CONSTRAINT "FormEditProposal_formId_fkey" FOREIGN KEY ("formId") REFERENCES "Form"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Response" ADD CONSTRAINT "Response_formLinkId_fkey" FOREIGN KEY ("formLinkId") REFERENCES "FormLink"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- Copy existing prefilled links out of Form.schema.prefills into FormLink, keeping their ids so
-- links already shared (/f/{id}) keep working. Form.schema.prefills is left in place, unused.
INSERT INTO "FormLink" ("id", "formId", "label", "values", "hiddenFieldIds", "createdAt")
SELECT
    p->>'id',
    f."id",
    COALESCE(NULLIF(TRIM(p->>'name'), ''), 'Unique link'),
    CASE WHEN jsonb_typeof(p->'values') = 'object' THEN p->'values' ELSE '{}'::jsonb END,
    CASE WHEN jsonb_typeof(p->'hiddenFieldIds') = 'array' THEN p->'hiddenFieldIds' ELSE '[]'::jsonb END,
    CASE
        WHEN p->>'createdAt' ~ '^\d{4}-\d{2}-\d{2}T' THEN (p->>'createdAt')::timestamptz AT TIME ZONE 'UTC'
        ELSE CURRENT_TIMESTAMP
    END
FROM "Form" f
CROSS JOIN LATERAL jsonb_array_elements(
    CASE WHEN jsonb_typeof(f."schema"->'prefills') = 'array' THEN f."schema"->'prefills' ELSE '[]'::jsonb END
) AS p
WHERE jsonb_typeof(p) = 'object' AND COALESCE(p->>'id', '') <> ''
ON CONFLICT ("id") DO NOTHING;
