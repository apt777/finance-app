import { NextResponse } from 'next/server'
import prisma from '@lib/prisma'
import { requireRouteSession } from '@/lib/server-auth'

interface UserData {
  email?: string;
  name?: string;
}

export async function GET(request: Request) {
  try {
    const { userId } = await requireRouteSession()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
      },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json(user)
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch users' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const { userId } = await requireRouteSession()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { email, name }: UserData = await request.json()
    const normalizedName = typeof name === 'string' ? name.trim() : undefined
    const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : undefined

    const user = await prisma.user.upsert({
      where: { id: userId },
      update: {
        ...(normalizedEmail ? { email: normalizedEmail } : {}),
        ...(normalizedName ? { name: normalizedName } : {}),
      },
      create: {
        id: userId,
        email: normalizedEmail || '',
        name: normalizedName,
      },
      select: {
        id: true,
        email: true,
        name: true,
      },
    })

    return NextResponse.json(user, { status: 200 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to create user' }, { status: 500 })
  }
}
