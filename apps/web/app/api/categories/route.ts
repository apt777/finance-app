import { NextResponse } from 'next/server'
import prisma from '@lib/prisma'
import { ensureDefaultCategories } from '@/lib/categories'
import { requireRouteSession } from '@/lib/server-auth'

export async function GET() {
  const { userId } = await requireRouteSession()

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const categories = await ensureDefaultCategories(userId)
    return NextResponse.json(categories)
  } catch (error: any) {
    return NextResponse.json([], { status: 200 })
  }
}

export async function POST(request: Request) {
  const { userId } = await requireRouteSession()

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { name, key, icon, color, type } = await request.json()

    if (!name || !type) {
      return NextResponse.json({ error: 'Invalid category payload' }, { status: 400 })
    }

    const generatedKey = key || `${type}-${Date.now()}`

    let category
    try {
      category = await prisma.transactionCategory.create({
        data: {
          userId,
          name,
          key: generatedKey,
          icon,
          color,
          type,
        },
      })
    } catch {
      category = await prisma.transactionCategory.create({
        data: {
          name,
          key: generatedKey,
          icon,
        },
      })
    }

    return NextResponse.json(category, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to create category' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  const { userId } = await requireRouteSession()

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const categoryId = searchParams.get('id')

    if (!categoryId) {
      return NextResponse.json({ error: 'Category ID is required' }, { status: 400 })
    }

    const deleted = await prisma.transactionCategory.deleteMany({
      where: {
        id: categoryId,
        userId,
      },
    })

    if (deleted.count === 0) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 })
    }

    return NextResponse.json({ message: 'Category deleted successfully' })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to delete category' }, { status: 500 })
  }
}
