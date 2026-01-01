import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import prisma from '@lib/prisma'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          cookieStore.set({ name, value, ...options })
        },
        remove(name: string, options: CookieOptions) {
          cookieStore.set({ name, value: '', ...options })
        },
      },
    }
  )
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    // Ensure the account belongs to the logged-in user
    const account = await prisma.account.findUnique({
      where: { id: id, userId: session.user.id },
    })

    if (!account) {
      return NextResponse.json(
        { error: 'Account not found or does not belong to user' },
        { status: 404 }
      )
    }

    // Delete related transactions and holdings first due to foreign key constraints
    await prisma.transaction.deleteMany({
      where: { accountId: id },
    })
    await prisma.holding.deleteMany({
      where: { accountId: id },
    })

    // Now delete the account
    await prisma.account.delete({
      where: { id: id },
    })

    return NextResponse.json(
      { message: 'Account deleted successfully' },
      { status: 200 }
    )
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to delete account' },
      { status: 500 }
    )
  }
}

