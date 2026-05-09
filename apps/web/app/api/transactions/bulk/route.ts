import { NextResponse } from 'next/server'
import prisma from '@lib/prisma'
import { requireRouteSession } from '@/lib/server-auth'

interface BulkRow {
  clientId?: string
  accountId: string
  date: string
  description: string
  type: 'income' | 'expense'
  amount: number
  currency: string
  categoryKey?: string | null
  applyBalanceAdjustment?: boolean
}

function unauthorized() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}

function normalizeDateInput(date: string) {
  return date.includes('T') ? date.split('T')[0] ?? date : date
}

function getLocalTodayDateString() {
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, '0')
  const day = String(today.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function shouldApplyBalanceAdjustment(date: string, requested?: boolean) {
  if (normalizeDateInput(date) === getLocalTodayDateString()) {
    return true
  }

  return Boolean(requested)
}

export async function POST(request: Request) {
  const { userId } = await requireRouteSession()

  if (!userId) {
    return unauthorized()
  }

  try {
    const body = await request.json()
    const rows = Array.isArray(body?.rows) ? (body.rows as BulkRow[]) : []

    if (rows.length === 0) {
      return NextResponse.json({ error: 'No transactions to import' }, { status: 400 })
    }

    const validRows = rows.filter((row) => {
      return (
        row.accountId &&
        row.date &&
        row.description &&
        (row.type === 'income' || row.type === 'expense') &&
        Number.isFinite(Number(row.amount)) &&
        Number(row.amount) > 0 &&
        row.currency
      )
    })

    if (validRows.length === 0) {
      return NextResponse.json({ error: 'No valid transactions to import' }, { status: 400 })
    }

    const accountIds = [...new Set(validRows.map((row) => row.accountId))]
    const accounts = await prisma.account.findMany({
      where: {
        userId,
        id: { in: accountIds },
      },
    })

    const accountMap = new Map(accounts.map((account) => [account.id, account]))
    const accountBalanceMap = new Map(accounts.map((account) => [account.id, account.balance]))
    const createPayloads: Array<{
      userId: string
      accountId: string
      date: Date
      description: string
      type: 'income' | 'expense'
      amount: number
      currency: string
      categoryKey?: string | null
    }> = []

    let importedCount = 0
    const importedClientIds: string[] = []
    const skippedDuplicateClientIds: string[] = []

    for (const row of validRows) {
      const account = accountMap.get(row.accountId)

      if (!account) {
        continue
      }

      const normalizedAmount = Number(row.amount)
      const signedAmount = row.type === 'expense' ? -normalizedAmount : normalizedAmount

      createPayloads.push({
        userId,
        accountId: row.accountId,
        date: new Date(row.date),
        description: row.description,
        type: row.type,
        amount: signedAmount,
        currency: row.currency,
        categoryKey: row.categoryKey || undefined,
      })

      if (shouldApplyBalanceAdjustment(row.date, row.applyBalanceAdjustment)) {
        const currentBalance = accountBalanceMap.get(row.accountId) ?? account.balance
        const nextBalance =
          account.type === 'credit_card'
            ? row.type === 'income'
              ? currentBalance - normalizedAmount
              : currentBalance + normalizedAmount
            : row.type === 'income'
              ? currentBalance + normalizedAmount
              : currentBalance - normalizedAmount

        accountBalanceMap.set(row.accountId, nextBalance)
      }

      importedCount += 1
      if (row.clientId) {
        importedClientIds.push(row.clientId)
      }
    }

    await prisma.$transaction(async (tx) => {
      if (createPayloads.length > 0) {
        await tx.transaction.createMany({
          data: createPayloads,
        })
      }

      for (const account of accounts) {
        const nextBalance = accountBalanceMap.get(account.id)
        if (typeof nextBalance === 'number' && nextBalance !== account.balance) {
          await tx.account.update({
            where: { id: account.id },
            data: { balance: nextBalance },
          })
        }
      }
    })

    return NextResponse.json({
      importedCount,
      skippedDuplicateCount: 0,
      importedClientIds,
      skippedDuplicateClientIds,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to import transactions' }, { status: 500 })
  }
}
