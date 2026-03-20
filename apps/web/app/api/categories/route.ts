import { NextResponse } from 'next/server'
import prisma from '@lib/prisma'
import { ensureDefaultCategories } from '@/lib/categories'
import { requireRouteSession } from '@/lib/server-auth'
import { DEFAULT_TRANSACTION_CATEGORIES } from '@/lib/defaultCategories'

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

    try {
      const deleted = await prisma.transactionCategory.deleteMany({
        where: {
          id: categoryId,
          OR: [
            { userId },
            { userId: null, isDefault: false },
          ],
        },
      })

      if (deleted.count === 0) {
        return NextResponse.json({ error: 'Category not found' }, { status: 404 })
      }

      return NextResponse.json({ message: 'Category deleted successfully' })
    } catch {
      // Fallback for legacy schemas where user-scoped category columns are unavailable.
      const legacyCategory = await prisma.transactionCategory.findUnique({
        where: { id: categoryId },
      })

      if (!legacyCategory) {
        return NextResponse.json({ error: 'Category not found' }, { status: 404 })
      }

      const defaultKeys = new Set(DEFAULT_TRANSACTION_CATEGORIES.map((category) => category.key))
      if (defaultKeys.has(legacyCategory.key)) {
        return NextResponse.json({ error: 'Default categories cannot be deleted' }, { status: 400 })
      }

      await prisma.transactionCategory.delete({
        where: { id: categoryId },
      })

      return NextResponse.json({ message: 'Category deleted successfully' })
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to delete category' }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  const { userId } = await requireRouteSession()

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { id, name } = await request.json()

    if (!id || !name?.trim()) {
      return NextResponse.json({ error: 'Category ID and name are required' }, { status: 400 })
    }

    const category = await prisma.transactionCategory.findUnique({
      where: { id },
    })

    if (!category) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 })
    }

    if (category.userId === userId) {
      const updated = await prisma.transactionCategory.update({
        where: { id: category.id },
        data: { name: name.trim() },
      })

      return NextResponse.json(updated)
    }

    if (category.userId === null && !category.isDefault) {
      const updated = await prisma.transactionCategory.update({
        where: { id: category.id },
        data: { name: name.trim() },
      })

      return NextResponse.json(updated)
    }

    if (category.userId === null && category.isDefault) {
      try {
        const overridden = await prisma.transactionCategory.upsert({
          where: {
            userId_key: {
              userId,
              key: category.key,
            },
          },
          update: {
            name: name.trim(),
          },
          create: {
            userId,
            key: category.key,
            name: name.trim(),
            icon: category.icon,
            color: category.color,
            type: category.type,
            isDefault: false,
          },
        })

        return NextResponse.json(overridden)
      } catch {
        // Fallback for older schemas that don't support user-scoped category overrides yet.
        const updated = await prisma.transactionCategory.update({
          where: { id: category.id },
          data: { name: name.trim() },
        })

        return NextResponse.json(updated)
      }
    }

    const updated = await prisma.transactionCategory.update({
      where: { id: category.id },
      data: { name: name.trim() },
    })

    return NextResponse.json(updated)
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to update category' }, { status: 500 })
  }
}
