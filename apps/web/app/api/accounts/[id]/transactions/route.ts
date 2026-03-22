import { NextResponse } from 'next/server'
import prisma from '@lib/prisma'
import { requireRouteSession } from '@/lib/server-auth'
import { ensureDefaultCategories } from '@/lib/categories'

function stripInternalNotes(notes?: string | null) {
  if (!notes) return null

  const cleaned = notes.replace('[[KABLUS_NO_BALANCE_SYNC]]', '').trim()
  return cleaned || null
}

async function getCategoryMapSafely(userId: string) {
  try {
    const categories = await ensureDefaultCategories(userId)

    return new Map(
      categories.map((category) => [
        category.key,
        {
          key: category.key,
          name: category.name,
          icon: 'icon' in category ? category.icon : null,
          color: 'color' in category ? category.color : null,
          type: 'type' in category ? category.type : 'expense',
        },
      ])
    )
  } catch (error) {
    console.error('Failed to resolve account transaction categories:', error)
    return new Map()
  }
}

export async function GET(_request: Request, props: { params: Promise<{ id: string }> }) {
  const { userId } = await requireRouteSession()

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { id } = await props.params

    const account = await prisma.account.findFirst({
      where: {
        id,
        userId,
      },
      select: {
        id: true,
      },
    })

    if (!account) {
      return NextResponse.json({ error: 'Account not found or does not belong to user' }, { status: 404 })
    }

    const [transactions, categoryMap] = await Promise.all([
      prisma.transaction.findMany({
        where: {
          userId,
          OR: [{ accountId: id }, { fromAccountId: id }, { toAccountId: id }],
        },
        orderBy: {
          date: 'desc',
        },
        include: {
          account: {
            select: { id: true, name: true, currency: true },
          },
          fromAccount: {
            select: { id: true, name: true, currency: true },
          },
          toAccount: {
            select: { id: true, name: true, currency: true },
          },
        },
      }),
      getCategoryMapSafely(userId),
    ])

    return NextResponse.json(
      transactions.map((transaction) => ({
        ...transaction,
        notes: stripInternalNotes(transaction.notes),
        category: transaction.categoryKey ? categoryMap.get(transaction.categoryKey) ?? null : null,
      }))
    )
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch transactions' }, { status: 500 })
  }
}
