import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import prisma from '@lib/prisma';

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const cookieStore = await cookies();
  const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
  try {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;

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
