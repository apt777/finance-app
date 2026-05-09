import { NextResponse } from 'next/server'
import prisma from '@lib/prisma'
import { requireRouteSession } from '@/lib/server-auth'
import { getTodayDateStringInTimeZone } from '@/lib/timezone'
import { getUserTimeZone } from '@/lib/user-timezone'

interface BulkRow {
  clientId?: string
  accountId?: string
  fromAccountId?: string
  toAccountId?: string
  date: string
  description: string
  type: 'income' | 'expense' | 'transfer'
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

function shouldApplyBalanceAdjustment(date: string, timeZone: string, requested?: boolean) {
  if (normalizeDateInput(date) === getTodayDateStringInTimeZone(timeZone)) {
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
    const userTimeZone = await getUserTimeZone(userId)

    if (rows.length === 0) {
      return NextResponse.json({ error: 'No transactions to import' }, { status: 400 })
    }

    const validRows = rows.filter((row) => {
      const isTransfer = row.type === 'transfer'

      return (
        row.date &&
        row.description &&
        (row.type === 'income' || row.type === 'expense' || row.type === 'transfer') &&
        Number.isFinite(Number(row.amount)) &&
        Number(row.amount) > 0 &&
        row.currency &&
        (
          isTransfer
            ? row.fromAccountId && row.toAccountId && row.fromAccountId !== row.toAccountId
            : row.accountId
        )
      )
    })

    if (validRows.length === 0) {
      return NextResponse.json({ error: 'No valid transactions to import' }, { status: 400 })
    }

    const accountIds = [
      ...new Set(
        validRows.flatMap((row) => {
          if (row.type === 'transfer') {
            return [row.fromAccountId, row.toAccountId].filter(Boolean) as string[]
          }

          return row.accountId ? [row.accountId] : []
        })
      ),
    ]
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
      accountId?: string
      fromAccountId?: string
      toAccountId?: string
      date: Date
      description: string
      type: 'income' | 'expense' | 'transfer'
      amount: number
      currency: string
      categoryKey?: string | null
    }> = []

    let importedCount = 0
    const importedClientIds: string[] = []
    const skippedDuplicateClientIds: string[] = []

    for (const row of validRows) {
      const normalizedAmount = Number(row.amount)
      if (row.type === 'transfer') {
        const fromAccount = row.fromAccountId ? accountMap.get(row.fromAccountId) : null
        const toAccount = row.toAccountId ? accountMap.get(row.toAccountId) : null

        if (!fromAccount || !toAccount) {
          continue
        }

        createPayloads.push({
          userId,
          fromAccountId: fromAccount.id,
          toAccountId: toAccount.id,
          date: new Date(row.date),
          description: row.description,
          type: 'transfer',
          amount: normalizedAmount,
          currency: row.currency,
          categoryKey: row.categoryKey || 'transfer',
        })

        if (shouldApplyBalanceAdjustment(row.date, userTimeZone, row.applyBalanceAdjustment)) {
          const currentFromBalance = accountBalanceMap.get(fromAccount.id) ?? fromAccount.balance
          const currentToBalance = accountBalanceMap.get(toAccount.id) ?? toAccount.balance
          const nextFromBalance =
            fromAccount.type === 'credit_card'
              ? currentFromBalance + normalizedAmount
              : currentFromBalance - normalizedAmount
          const nextToBalance =
            toAccount.type === 'credit_card'
              ? currentToBalance - normalizedAmount
              : currentToBalance + normalizedAmount

          accountBalanceMap.set(fromAccount.id, nextFromBalance)
          accountBalanceMap.set(toAccount.id, nextToBalance)
        }
      } else {
        const account = row.accountId ? accountMap.get(row.accountId) : null

        if (!account) {
          continue
        }

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

        if (shouldApplyBalanceAdjustment(row.date, userTimeZone, row.applyBalanceAdjustment)) {
          const currentBalance = accountBalanceMap.get(row.accountId as string) ?? account.balance
          const nextBalance =
            account.type === 'credit_card'
              ? row.type === 'income'
                ? currentBalance - normalizedAmount
                : currentBalance + normalizedAmount
              : row.type === 'income'
                ? currentBalance + normalizedAmount
                : currentBalance - normalizedAmount

          accountBalanceMap.set(row.accountId as string, nextBalance)
        }
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
