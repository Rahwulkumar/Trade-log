import { NextRequest } from 'next/server';
import { requireAdminOrSecret } from '@/lib/auth/server';
import { apiError, apiSuccess } from '@/lib/api/http';
import { seedPropFirmsIfEmpty } from '@/lib/api/prop-firms-server';

/** POST /api/seed/prop-firms - Idempotent seed for prop firms and challenges. */
export async function POST(request: NextRequest) {
  const access = await requireAdminOrSecret(request, {
    secretEnvVar: 'ADMIN_API_SECRET',
    headerNames: ['authorization', 'x-admin-secret'],
  });
  if (access.error) return access.error;

  try {
    const { inserted } = await seedPropFirmsIfEmpty();
    return apiSuccess({ inserted });
  } catch (error) {
    console.error('[seed/prop-firms] Error:', error);
    return apiError(500, 'Seed failed');
  }
}
