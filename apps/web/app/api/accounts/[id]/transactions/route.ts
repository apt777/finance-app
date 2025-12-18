import { NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import prisma from '@lib/prisma'

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const cookieStore = await cookies()
  const supabase = createRouteHandlerClient({ cookies: () => cookieStore })
  try {
    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = params

    // Ensure the account belongs to the logged-in user
    const account = await prisma.account.findUnique({
      where: { id: id, userId: session.user.id },
    })

    if (!account) {
      return NextResponse.json({ error: 'Account not found or does not belong to user' }, { status: 404 })
    }

    const transactions = await prisma.transaction.findMany({
      where: {
        accountId: id,
      },
      orderBy: {
        date: 'desc',
      },
      include: {
        account: { // Include account details for display
          select: { name: true, currency: true },
        },
      },
    })
    return NextResponse.json(transactions)
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch transactions' }, { status: 500 })
  }
}
