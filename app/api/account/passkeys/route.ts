import { NextResponse } from "next/server"
import { getSessionUser } from "@/lib/auth-server"

export async function GET() {
  const user = await getSessionUser()
  if (!user) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 })
  }

  const { default: prisma } = await import("@/lib/db")
  const passkeys = await prisma.passkeyCredential.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      credentialId: true,
      transports: true,
      createdAt: true,
    },
  })

  return NextResponse.json({ passkeys })
}

export const dynamic = "force-dynamic"
