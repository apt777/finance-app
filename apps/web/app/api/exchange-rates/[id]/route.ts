import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import prisma from '@lib/prisma';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const cookieStore = cookies();
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
    } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Check if the exchange rate exists and belongs to the current user
    const existingRate = await prisma.exchangeRate.findUnique({
      where: { id: id },
    });

    if (!existingRate) {
      return NextResponse.json({ error: 'Exchange rate not found' }, { status: 404 });
    }

    // Verify ownership - prevent users from deleting other users' exchange rates
    if (existingRate.userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Delete the exchange rate
    await prisma.exchangeRate.delete({
      where: { id: id },
    });

    return NextResponse.json({ message: 'Exchange rate deleted successfully' }, { status: 200 });
  } catch (error: any) {
    console.error('Error deleting exchange rate:', error);
    return NextResponse.json({ error: error.message || 'Failed to delete exchange rate' }, { status: 500 });
  }
}
