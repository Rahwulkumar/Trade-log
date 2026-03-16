import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

const isPublicPageRoute = createRouteMatcher([
  '/',
  '/auth/login(.*)',
  '/auth/signup(.*)',
  '/auth/forgot-password(.*)',
  '/auth/callback(.*)',
  '/auth/clear-session(.*)',
]);

const isPublicApiRoute = createRouteMatcher([
  '/api/webhook/terminal(.*)',
  '/api/internal/mt5-worker(.*)',
  '/api/orchestrator(.*)',
]);

export default clerkMiddleware(async (auth, request) => {
  // /auth/clear-session: wipe stale Clerk cookies and redirect to login
  if (request.nextUrl.pathname === '/auth/clear-session') {
    const response = NextResponse.redirect(new URL('/auth/login', request.url));
    // Clear all Clerk cookies so a fresh session can be established
    for (const name of request.cookies.getAll().map((c) => c.name)) {
      if (name.startsWith('__clerk') || name.startsWith('__session') || name.startsWith('__client')) {
        response.cookies.delete(name);
      }
    }
    return response;
  }

  if (isPublicPageRoute(request) || isPublicApiRoute(request)) {
    return;
  }

  if (request.nextUrl.pathname.startsWith('/api/')) {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    return;
  }

  await auth.protect();
}, { clockSkewInMs: 60_000 });

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
