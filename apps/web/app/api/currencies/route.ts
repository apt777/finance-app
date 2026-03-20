import { NextRequest, NextResponse } from 'next/server'
import prisma from '@lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const currencies = await prisma.currency.findMany({
      orderBy: { code: 'asc' },
    })

    return NextResponse.json(currencies, { status: 200 })
  } catch (error: any) {
    console.error('Currencies fetch error:', error)
    return NextResponse.json(
      { error: '통화 정보를 불러올 수 없습니다.' },
      { status: 500 }
    )
  }
}
