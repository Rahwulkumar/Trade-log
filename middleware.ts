import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

const isPublicPageRoute = createRouteMatcher([
  '/',
  '/auth/login(.*)',
  '/auth/signup(.*)',
  '/auth/forgot-password(.*)',
  '/auth/callback(.*)',
]);

const isPublicApiRoute = createRouteMatcher([
  '/api/webhook/terminal(.*)',
  '/api/orchestrator(.*)',
]);

export default clerkMiddleware(async (auth, request) => {
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
});

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
