export type LoginApprovalRow = {
  id: string
  userId: string
  tokenHash: string
  approved: boolean
  rejected: boolean
  createdAt: Date
  expiresAt: Date
  approvedAt: Date | null
  rejectedAt: Date | null
}

export async function createLoginApproval(params: {
  id: string
  userId: string
  tokenHash: string
  expiresAt: Date
}) {
  const { default: prisma } = await import("@/lib/db")

  await prisma.$executeRaw`
    INSERT INTO "LoginApproval" ("id", "userId", "tokenHash", "expiresAt")
    VALUES (${params.id}, ${params.userId}, ${params.tokenHash}, ${params.expiresAt})
  `
}

export async function getLoginApprovalById(id: string): Promise<LoginApprovalRow | null> {
  const { default: prisma } = await import("@/lib/db")

  const rows = await prisma.$queryRaw<LoginApprovalRow[]>`
    SELECT "id", "userId", "tokenHash", "approved", "rejected", "createdAt", "expiresAt", "approvedAt", "rejectedAt"
    FROM "LoginApproval"
    WHERE "id" = ${id}
    LIMIT 1
  `

  return rows[0] ?? null
}

export async function getLoginApprovalByIdAndTokenHash(id: string, tokenHash: string): Promise<LoginApprovalRow | null> {
  const { default: prisma } = await import("@/lib/db")

  const rows = await prisma.$queryRaw<LoginApprovalRow[]>`
    SELECT "id", "userId", "tokenHash", "approved", "rejected", "createdAt", "expiresAt", "approvedAt", "rejectedAt"
    FROM "LoginApproval"
    WHERE "id" = ${id} AND "tokenHash" = ${tokenHash}
    LIMIT 1
  `

  return rows[0] ?? null
}

export async function markLoginApprovalApproved(id: string) {
  const { default: prisma } = await import("@/lib/db")

  await prisma.$executeRaw`
    UPDATE "LoginApproval"
    SET "approved" = true, "approvedAt" = NOW()
    WHERE "id" = ${id}
  `
}

export async function markLoginApprovalRejected(id: string) {
  const { default: prisma } = await import("@/lib/db")

  await prisma.$executeRaw`
    UPDATE "LoginApproval"
    SET "rejected" = true, "rejectedAt" = NOW()
    WHERE "id" = ${id}
  `
}
