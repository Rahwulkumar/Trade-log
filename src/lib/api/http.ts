import { NextResponse } from 'next/server';

export function apiError(
  status: number,
  error: string,
  extra?: Record<string, unknown>
) {
  return NextResponse.json(
    {
      success: false,
      error,
      ...(extra ?? {}),
    },
    { status }
  );
}

export function apiValidationError(
  error: string,
  details?: unknown
) {
  return apiError(400, error, details === undefined ? undefined : { details });
}

export function apiSuccess<T extends Record<string, unknown>>(payload?: T) {
  return NextResponse.json({
    success: true,
    ...(payload ?? {}),
  });
}
