import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  
  // Create a Supabase client configured to use cookies
  const supabase = createMiddlewareClient({ req, res })

  // Refresh session if expired - required for Server Components
  const {
    data: { session },
  } = await supabase.auth.getSession()

  const { pathname } = req.nextUrl

  // 로그인 페이지나 회원가입 페이지에 있는데 이미 로그인된 경우 메인으로 리다이렉트
  if (session && (pathname === '/login' || pathname === '/register')) {
    return NextResponse.redirect(new URL('/', req.url))
  }

  // 보호된 경로에 접근하는데 로그인이 안 된 경우 로그인 페이지로 리다이렉트
  // 루트 경로('/')도 보호된 경로에 포함
  const protectedRoutes = ['/', '/accounts', '/transactions', '/goals', '/holdings', '/settings', '/investments', '/setup']
  
  const isProtectedRoute = protectedRoutes.some(route => 
    pathname === route || (route !== '/' && pathname.startsWith(route))
  )

  if (!session && isProtectedRoute) {
    // 로그인 페이지로 리다이렉트
    const redirectUrl = new URL('/login', req.url)
    return NextResponse.redirect(redirectUrl)
  }

  return res
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     * - api (API routes)
     */
    '/((?!_next/static|_next/image|favicon.ico|api|.*\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
