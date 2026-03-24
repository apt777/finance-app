import prisma from '@lib/prisma'
import { notFound } from 'next/navigation'
import { cookies } from 'next/headers'
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import AccountForm from '@/components/AccountForm'

export default async function EditAccountPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params
  const cookieStore = await cookies()
  const supabase = createServerComponentClient({ cookies: () => cookieStore as any })
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    notFound()
  }

  const account = await prisma.account.findFirst({
    where: {
      id: params.id,
      userId: session.user.id,
    },
  })

  if (!account) {
    notFound()
  }

  return (
    <AccountForm
      initialData={{
        id: account.id,
        name: account.name,
        type: account.type,
        balance: account.balance,
        currency: account.currency,
      }}
    />
  )
}
