import prisma from '@lib/prisma'
import { notFound } from 'next/navigation'
import { cookies } from 'next/headers'
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import AccountForm from '@/components/AccountForm'
import { getTransitCardInferenceSettingKey, parseTransitCardInferenceSetting } from '@/lib/transitCardInference'

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

  const setting = await prisma.userSetting.findUnique({
    where: {
      userId_key: {
        userId: session.user.id,
        key: getTransitCardInferenceSettingKey(account.id),
      },
    },
  }).catch(() => null)
  const inference = parseTransitCardInferenceSetting(setting?.value)

  return (
    <AccountForm
      initialData={{
        id: account.id,
        name: account.name,
        type: account.type,
        balance: account.balance,
        currency: account.currency,
        transitInferenceEnabled: inference.enabled,
        transitInferenceCategoryKey: inference.categoryKey || undefined,
      }}
    />
  )
}
