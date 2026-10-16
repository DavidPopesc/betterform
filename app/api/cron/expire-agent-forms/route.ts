import { NextResponse } from 'next/server'

// Daily Vercel Cron (see vercel.json): deletes agent-created forms nobody claimed in time.
// Vercel sends `Authorization: Bearer $CRON_SECRET` when CRON_SECRET is set.
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const { default: prisma } = await import('@/lib/db')
  const { count } = await prisma.form.deleteMany({
    where: { accountId: null, claimExpiresAt: { lt: new Date() } },
  })

  return NextResponse.json({ deleted: count })
}

export const dynamic = 'force-dynamic'
