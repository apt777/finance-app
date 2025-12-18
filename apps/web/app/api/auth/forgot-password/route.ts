import { NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export async function POST(request: Request) {
  const { email } = await request.json()
  const cookieStore = cookies()
  const supabase = createRouteHandlerClient({ cookies: () => cookieStore })

  if (!email) {
    return NextResponse.json({ error: 'Email is required' }, { status: 400 })
  }

  // IMPORTANT: This URL must be added to your Supabase project's "Redirect URLs" allowlist.
  // Go to Authentication -> URL Configuration in your Supabase dashboard.
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: 'http://localhost:3000/reset-password',
  })

  if (error) {
    // Log the error for debugging
    console.error('Supabase reset password error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ message: 'Password reset link sent to your email.' })
}
