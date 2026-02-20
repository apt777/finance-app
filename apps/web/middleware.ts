import createMiddleware from 'next-intl/middleware';
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { routing } from '@/navigation';

const intlMiddleware = createMiddleware(routing);

export async function middleware(req: NextRequest) {
  // 1. Run Intl Middleware
  const res = intlMiddleware(req);

  // 2. Setup Supabase
  const supabase = createMiddlewareClient({ req, res });
  const { data: { session } } = await supabase.auth.getSession();

  // 3. Auth Logic
  const { pathname } = req.nextUrl;
  
  // Parse path to check for locale prefix
  const segments = pathname.split('/');
  const maybeLocale = segments[1];
  const isLocalePrefix = routing.locales.includes(maybeLocale as any);
  
  // Get the internal path (e.g., "/login" from "/en/login" or "/login")
  const internalPath = isLocalePrefix 
    ? '/' + segments.slice(2).join('/') 
    : pathname;
    
  // Normalize (remove trailing slash for comparison, unless it's root)
  const cleanPath = internalPath === '/' ? '/' : internalPath.replace(/\/$/, '') || '/';

  const publicAuthRoutes = ['/login', '/register', '/forgot-password', '/reset-password'];
  const protectedRoutes = ['/', '/accounts', '/transactions', '/goals', '/holdings', '/settings', '/investments', '/setup'];

  const isPublicAuthRoute = publicAuthRoutes.includes(cleanPath);
  
  // Check if path starts with any protected route
  const isProtectedRoute = protectedRoutes.some(route => 
    cleanPath === route || (route !== '/' && cleanPath.startsWith(route))
  );

  if (session && isPublicAuthRoute) {
    // Redirect to dashboard (keeping locale if present)
    const targetPath = isLocalePrefix ? `/${maybeLocale}` : '/';
    return NextResponse.redirect(new URL(targetPath, req.url));
  }

  if (!session && isProtectedRoute) {
    // Redirect to login (keeping locale if present)
    const targetPath = isLocalePrefix ? `/${maybeLocale}/login` : '/login';
    return NextResponse.redirect(new URL(targetPath, req.url));
  }

  return res;
}

export const config = {
  // Matcher ignoring api, _next, static files
  matcher: ['/((?!api|_next|.*\\..*).*)']
};
