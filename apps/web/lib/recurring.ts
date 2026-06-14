import prisma from '@lib/prisma'
import { getCalendarDateString, getTodayDateStringInTimeZone } from '@/lib/timezone'
import { getUserTimeZone } from '@/lib/user-timezone'
import { calculateInitialRunDate, calculateNextRunDate } from '@/lib/recurringSchedule'

export { calculateInitialRunDate, calculateNextRunDate } from '@/lib/recurringSchedule'

type AccountLike = {
  id: string
  type: string
  balance: number
}

type RecurringWithAccounts = {
  id: string
  userId: string
  name: string
  description: string
  type: string
  amount: number
  currency: string
  categoryKey: string | null
  accountId: string | null
  fromAccountId: string | null
  toAccountId: string | null
  interval: string
  dayOfMonth: number | null
  dayOfWeek: number | null
  startDate: Date
  endDate: Date | null
  nextRunDate: Date | null
  lastProcessedAt: Date | null
  isActive: boolean
  account?: AccountLike | null
  fromAccount?: AccountLike | null
  toAccount?: AccountLike | null
}

function startOfDay(date: Date) {
  const next = new Date(date)
  next.setHours(0, 0, 0, 0)
  return next
}

function endOfDay(date: Date) {
  const next = new Date(date)
  next.setHours(23, 59, 59, 999)
  return next
}

function shouldProcessRecurring(item: RecurringWithAccounts, todayDateString: string) {
  if (!item.isActive || !item.nextRunDate) {
    return false
  }

  return getCalendarDateString(item.nextRunDate) <= todayDateString
}

async function findExistingRecurringTransaction(
  tx: typeof prisma,
  userId: string,
  item: RecurringWithAccounts,
  runDate: Date
) {
  return tx.transaction.findFirst({
    where: {
      userId,
      type: item.type as any,
      date: {
        gte: startOfDay(runDate),
        lte: endOfDay(runDate),
      },
      description: item.description,
      ...(item.type === 'transfer'
        ? {
            fromAccountId: item.fromAccountId,
            toAccountId: item.toAccountId,
          }
        : {
            accountId: item.accountId,
          }),
    },
    select: { id: true },
  })
}

async function createRecurringTransaction(tx: typeof prisma, item: RecurringWithAccounts, runDate: Date) {
  const amount = Math.abs(item.amount)

  if (item.type === 'transfer' && item.fromAccount && item.toAccount) {
    if (item.fromAccount.type === 'credit_card') {
      await tx.account.update({
        where: { id: item.fromAccount.id },
        data: { balance: item.fromAccount.balance + amount },
      })
    } else {
      await tx.account.update({
        where: { id: item.fromAccount.id },
        data: { balance: item.fromAccount.balance - amount },
      })
    }

    if (item.toAccount.type === 'credit_card') {
      await tx.account.update({
        where: { id: item.toAccount.id },
        data: { balance: item.toAccount.balance - amount },
      })
    } else {
      await tx.account.update({
        where: { id: item.toAccount.id },
        data: { balance: item.toAccount.balance + amount },
      })
    }

    return tx.transaction.create({
      data: {
        userId: item.userId,
        fromAccountId: item.fromAccountId,
        toAccountId: item.toAccountId,
        date: runDate,
        description: item.description,
        type: 'transfer',
        amount,
        currency: item.currency,
        categoryKey: item.categoryKey || 'transfer',
      } as any,
    })
  }

  if (!item.account) {
    return null
  }

  const signedAmount = item.type === 'expense' ? -amount : amount
  const nextBalance =
    item.account.type === 'credit_card'
      ? item.type === 'income'
        ? item.account.balance - amount
        : item.account.balance + amount
      : item.type === 'income'
        ? item.account.balance + amount
        : item.account.balance - amount

  await tx.account.update({
    where: { id: item.account.id },
    data: { balance: nextBalance },
  })

  return tx.transaction.create({
    data: {
      userId: item.userId,
      accountId: item.accountId,
      date: runDate,
      description: item.description,
      type: item.type as any,
      amount: signedAmount,
      currency: item.currency,
      categoryKey: item.categoryKey || undefined,
      notes: '[[KABLUS_RECURRING_AUTO]]',
    },
  })
}

export async function processDueRecurringTransactions(userId: string) {
  const timeZone = await getUserTimeZone(userId)
  const todayDateString = getTodayDateStringInTimeZone(timeZone)
  const items = await prisma.recurringTransaction.findMany({
    where: {
      userId,
      isActive: true,
      nextRunDate: { not: null },
    },
    include: {
      account: { select: { id: true, type: true, balance: true } },
      fromAccount: { select: { id: true, type: true, balance: true } },
      toAccount: { select: { id: true, type: true, balance: true } },
    },
    orderBy: { nextRunDate: 'asc' },
  })

  for (const item of items as RecurringWithAccounts[]) {
    let nextRunDate = item.nextRunDate

    while (nextRunDate && shouldProcessRecurring({ ...item, nextRunDate }, todayDateString)) {
      if (item.endDate && getCalendarDateString(nextRunDate) > getCalendarDateString(item.endDate)) {
        nextRunDate = null
        break
      }

      // Keep automatic processing idempotent if the user already created the same entry.
      const existing = await findExistingRecurringTransaction(prisma, userId, item, nextRunDate)

      if (!existing) {
        await prisma.$transaction(async (tx) => {
          await createRecurringTransaction(tx as typeof prisma, item, nextRunDate as Date)
          await tx.recurringTransaction.update({
            where: { id: item.id },
            data: {
              lastProcessedAt: nextRunDate,
              nextRunDate: calculateNextRunDate(nextRunDate as Date, item.interval, item.dayOfMonth, item.dayOfWeek),
            },
          })
        })
      } else {
        await prisma.recurringTransaction.update({
          where: { id: item.id },
          data: {
            lastProcessedAt: nextRunDate,
            nextRunDate: calculateNextRunDate(nextRunDate, item.interval, item.dayOfMonth, item.dayOfWeek),
          },
        })
      }

      const refreshed = await prisma.recurringTransaction.findUnique({
        where: { id: item.id },
        select: { nextRunDate: true },
      })
      nextRunDate = refreshed?.nextRunDate ?? null
    }
  }
}

export function getMonthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}
