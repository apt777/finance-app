import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import prisma from '@lib/prisma'

export async function requireRouteSession() {
  const cookieStore = await cookies()
  const supabase = createRouteHandlerClient({ cookies: () => cookieStore as any })
  const {
    data: { session },
  } = await supabase.auth.getSession()

  let resolvedUser = session?.user ?? null

  if (!resolvedUser) {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    resolvedUser = user ?? null
  }

  if (!resolvedUser) {
    return { session: null, userId: null }
  }

  await prisma.user.upsert({
    where: { id: resolvedUser.id },
    update: {
      email: resolvedUser.email ?? undefined,
    },
    create: {
      id: resolvedUser.id,
      email: resolvedUser.email ?? `${resolvedUser.id}@local.invalid`,
      name: resolvedUser.user_metadata?.name ?? resolvedUser.email ?? 'User',
    },
  })

  return { session, userId: resolvedUser.id }
}
