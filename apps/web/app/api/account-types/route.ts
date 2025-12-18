import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET(request: NextRequest) {
  try {
    const accountTypes = await prisma.accountType.findMany({
      orderBy: { name: 'asc' },
    })

    return NextResponse.json(accountTypes, { status: 200 })
  } catch (error: any) {
    console.error('Account types fetch error:', error)
    return NextResponse.json(
      { error: '계정 유형을 불러올 수 없습니다.' },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}
