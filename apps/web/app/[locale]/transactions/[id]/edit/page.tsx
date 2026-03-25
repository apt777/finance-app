import prisma from '@lib/prisma'
import { notFound } from 'next/navigation'
import { cookies } from 'next/headers'
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import TransactionForm from '@/components/TransactionForm'

function stripInternalNotes(notes?: string | null) {
  if (!notes) return ''
  return notes.replace('[[KABLUS_NO_BALANCE_SYNC]]', '').trim()
}

export default async function EditTransactionPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params
  const cookieStore = await cookies()
  const supabase = createServerComponentClient({ cookies: () => cookieStore as any })
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    notFound()
  }

  const transaction = await prisma.transaction.findFirst({
    where: {
      id: params.id,
      userId: session.user.id,
    },
  })

  if (!transaction) {
    notFound()
  }

  return (
    <TransactionForm
      transactionId={transaction.id}
      initialData={{
        accountId: transaction.accountId || '',
        fromAccountId: transaction.fromAccountId || '',
        toAccountId: transaction.toAccountId || '',
        date: transaction.date.toISOString().slice(0, 10),
        description: transaction.description,
        type: transaction.type,
        amount: Math.abs(transaction.amount),
        currency: transaction.currency,
        exchangeToAmount: (transaction as any).exchangeToAmount || '',
        categoryKey: transaction.categoryKey || 'food',
        notes: stripInternalNotes(transaction.notes),
        applyBalanceAdjustment: !transaction.notes?.includes('[[KABLUS_NO_BALANCE_SYNC]]'),
      }}
    />
  )
}
