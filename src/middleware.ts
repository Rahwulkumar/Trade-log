import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

// Define routes that do NOT require authentication
const isPublicRoute = createRouteMatcher([
  '/',
  '/auth/login(.*)',
  '/auth/signup(.*)',
  '/auth/forgot-password(.*)',
  '/auth/callback(.*)',
  '/api/webhook/terminal(.*)', // EA webhooks — authenticated with API key, not session
  '/api/orchestrator(.*)',     // Orchestrator — authenticated with ORCHESTRATOR_SECRET
]);

export default clerkMiddleware(async (auth, request) => {
  if (!isPublicRoute(request)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    // Match all routes except static assets
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
