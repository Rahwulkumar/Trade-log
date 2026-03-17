import { readJsonIfAvailable } from '@/lib/api/client/http';
import type {
  AppUserProfile,
  AppUserProfileUpdate,
} from '@/lib/types/app-user-profile';

export type { AppUserProfile, AppUserProfileUpdate };

export async function getCurrentUserProfile(): Promise<AppUserProfile | null> {
  try {
    const response = await fetch('/api/profile', {
      cache: 'no-store',
      credentials: 'include',
    });
    if (!response.ok) {
      return null;
    }
    return (await readJsonIfAvailable<AppUserProfile>(response)) ?? null;
  } catch {
    return null;
  }
}

export async function updateCurrentUserProfile(
  updates: AppUserProfileUpdate,
): Promise<AppUserProfile> {
  const response = await fetch('/api/profile', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(updates),
  });

  if (!response.ok) {
    const payload = await readJsonIfAvailable<{ error?: string }>(response);
    throw new Error(payload?.error ?? 'Failed to update profile');
  }

  const profile = await readJsonIfAvailable<AppUserProfile>(response);
  if (!profile) {
    throw new Error('Failed to update profile');
  }

  return profile;
}
