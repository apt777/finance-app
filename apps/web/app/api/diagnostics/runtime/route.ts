import { NextResponse } from 'next/server'
import prisma from '@lib/prisma'
import { requireRouteSession } from '@/lib/server-auth'

function extractSupabaseRefFromUrl(url?: string) {
  if (!url) return null

  try {
    const hostname = new URL(url).hostname
    return hostname.split('.')[0] ?? null
  } catch {
    return null
  }
}

function extractSupabaseRefFromDatabaseUrl(databaseUrl?: string) {
  if (!databaseUrl) return null

  try {
    const parsed = new URL(databaseUrl)
    const username = decodeURIComponent(parsed.username || '')
    const match = username.match(/^postgres\.([a-z0-9]+)$/i)
    return match?.[1] ?? null
  } catch {
    return null
  }
}

export async function GET() {
  const { userId } = await requireRouteSession()

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabaseRef = extractSupabaseRefFromUrl(process.env.NEXT_PUBLIC_SUPABASE_URL)
  const databaseRef = extractSupabaseRefFromDatabaseUrl(process.env.DATABASE_URL)

  try {
    const [accountCount, transactionCount, holdingCount, goalCount] = await Promise.all([
      prisma.account.count({ where: { userId } }),
      prisma.transaction.count({ where: { userId } }),
      prisma.holding.count({ where: { userId } }),
      prisma.goal.count({ where: { userId } }),
    ])

    return NextResponse.json({
      userId,
      refs: {
        supabaseAuthProject: supabaseRef,
        prismaDatabaseProject: databaseRef,
        matches: Boolean(supabaseRef && databaseRef && supabaseRef === databaseRef),
      },
      counts: {
        accounts: accountCount,
        transactions: transactionCount,
        holdings: holdingCount,
        goals: goalCount,
      },
    })
  } catch (error: any) {
    return NextResponse.json(
      {
        userId,
        refs: {
          supabaseAuthProject: supabaseRef,
          prismaDatabaseProject: databaseRef,
          matches: Boolean(supabaseRef && databaseRef && supabaseRef === databaseRef),
        },
        error: error.message || 'Failed to inspect runtime diagnostics',
      },
      { status: 500 }
    )
  }
}
