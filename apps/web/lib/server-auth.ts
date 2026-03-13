import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import prisma from '@lib/prisma'

export async function requireRouteSession() {
  const cookieStore = await cookies()
  const supabase = createRouteHandlerClient({ cookies: () => cookieStore as any })
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    return { session: null, userId: null }
  }

  await prisma.user.upsert({
    where: { id: session.user.id },
    update: {
      email: session.user.email ?? undefined,
    },
    create: {
      id: session.user.id,
      email: session.user.email ?? `${session.user.id}@local.invalid`,
      name: session.user.user_metadata?.name ?? session.user.email ?? 'User',
    },
  })

  return { session, userId: session.user.id }
}
