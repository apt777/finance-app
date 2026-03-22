import { NextResponse } from 'next/server'
import { requireRouteSession } from '@/lib/server-auth'
import { searchSymbols } from '@/lib/alphaVantage'

export async function GET(request: Request) {
  const { userId } = await requireRouteSession()

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const keywords = searchParams.get('keywords')?.trim() || ''

  if (keywords.length < 2) {
    return NextResponse.json([])
  }

  try {
    const matches = await searchSymbols(keywords)
    return NextResponse.json(matches.slice(0, 8))
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to search symbols' }, { status: 500 })
  }
}
