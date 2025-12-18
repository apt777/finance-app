import { NextResponse } from 'next/server'
import { supabaseServer } from '../../../../../../lib/supabaseServer'
import { AuthError } from '@supabase/supabase-js' // Import AuthError

export async function POST(request: Request) {
  const { email, password } = await request.json()

  const { data, error }: { data: any, error: AuthError | null } = await supabaseServer.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json(data, { status: 200 })
}