import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const rawNext = searchParams.get('next') ?? '/dashboard';
  const next = rawNext.startsWith('/') && !rawNext.startsWith('//') ? rawNext : '/dashboard';

  return NextResponse.redirect(
    `${origin}/auth/login?next=${encodeURIComponent(next)}&error=${encodeURIComponent(
      'Supabase auth callbacks are no longer supported. Sign in with Clerk.',
    )}`,
  );
}
