import 'server-only';

import { currentUser } from '@clerk/nextjs/server';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { appUsers } from '@/lib/db/schema';
import {
  DEFAULT_APP_RISK_PERCENT,
  DEFAULT_APP_RR_RATIO,
  DEFAULT_APP_TIMEFRAME,
  DEFAULT_APP_TIMEZONE,
  type AppUserProfile,
  type AppUserProfileUpdate,
} from '@/lib/types/app-user-profile';

function trimToNull(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function buildFullName(
  firstName: string | null | undefined,
  lastName: string | null | undefined,
  fallback: string | null | undefined,
): string | null {
  const composed = [trimToNull(firstName), trimToNull(lastName)].filter(Boolean).join(' ').trim();
  return composed || trimToNull(fallback) || null;
}

function toProfile(row: typeof appUsers.$inferSelect): AppUserProfile {
  return {
    id: row.id,
    email: row.email ?? null,
    full_name: row.fullName ?? null,
    first_name: row.firstName ?? null,
    last_name: row.lastName ?? null,
    avatar_url: row.avatarUrl ?? null,
    timezone: row.timezone ?? null,
    default_risk_percent: row.defaultRiskPercent ?? null,
    default_rr_ratio: row.defaultRrRatio ?? null,
    default_timeframe: row.defaultTimeframe ?? null,
    created_at: row.createdAt?.toISOString() ?? null,
    updated_at: row.updatedAt?.toISOString() ?? null,
  };
}

async function getClerkUserOrThrow() {
  const user = await currentUser();
  if (!user) {
    throw new Error('Unauthorized');
  }
  return user;
}

export async function getOrCreateCurrentAppUserProfile(): Promise<AppUserProfile> {
  const clerkUser = await getClerkUserOrThrow();
  const primaryEmail = clerkUser.primaryEmailAddress?.emailAddress ?? null;
  const [existing] = await db
    .select()
    .from(appUsers)
    .where(eq(appUsers.id, clerkUser.id))
    .limit(1);

  if (!existing) {
    const [created] = await db
      .insert(appUsers)
      .values({
        id: clerkUser.id,
        email: primaryEmail,
        fullName: trimToNull(clerkUser.fullName),
        firstName: trimToNull(clerkUser.firstName),
        lastName: trimToNull(clerkUser.lastName),
        avatarUrl: clerkUser.imageUrl ?? null,
        timezone: DEFAULT_APP_TIMEZONE,
        defaultRiskPercent: DEFAULT_APP_RISK_PERCENT,
        defaultRrRatio: DEFAULT_APP_RR_RATIO,
        defaultTimeframe: DEFAULT_APP_TIMEFRAME,
      })
      .returning();

    if (!created) {
      throw new Error('Failed to provision app user');
    }

    return toProfile(created);
  }

  const nextFullName = buildFullName(
    existing.firstName,
    existing.lastName,
    trimToNull(clerkUser.fullName),
  );
  const shouldSyncIdentity =
    existing.email !== primaryEmail ||
    existing.avatarUrl !== (clerkUser.imageUrl ?? null) ||
    existing.fullName !== nextFullName;

  if (!shouldSyncIdentity) {
    return toProfile(existing);
  }

  const [updated] = await db
    .update(appUsers)
    .set({
      email: primaryEmail,
      avatarUrl: clerkUser.imageUrl ?? null,
      fullName: nextFullName,
      updatedAt: new Date(),
    })
    .where(eq(appUsers.id, clerkUser.id))
    .returning();

  return toProfile(updated ?? existing);
}

export async function updateCurrentAppUserProfile(
  updates: AppUserProfileUpdate,
): Promise<AppUserProfile> {
  const clerkUser = await getClerkUserOrThrow();
  const existing = await getOrCreateCurrentAppUserProfile();

  const nextFirstName =
    updates.first_name !== undefined ? trimToNull(updates.first_name) : existing.first_name;
  const nextLastName =
    updates.last_name !== undefined ? trimToNull(updates.last_name) : existing.last_name;
  const nextTimezone = updates.timezone !== undefined ? trimToNull(updates.timezone) : existing.timezone;
  const nextDefaultRisk =
    updates.default_risk_percent !== undefined
      ? updates.default_risk_percent
      : existing.default_risk_percent;
  const nextDefaultRr =
    updates.default_rr_ratio !== undefined ? updates.default_rr_ratio : existing.default_rr_ratio;
  const nextDefaultTimeframe =
    updates.default_timeframe !== undefined
      ? trimToNull(updates.default_timeframe)
      : existing.default_timeframe;

  const [updated] = await db
    .update(appUsers)
    .set({
      email: clerkUser.primaryEmailAddress?.emailAddress ?? existing.email,
      firstName: nextFirstName,
      lastName: nextLastName,
      fullName: buildFullName(nextFirstName, nextLastName, trimToNull(clerkUser.fullName)),
      avatarUrl: clerkUser.imageUrl ?? existing.avatar_url,
      timezone: nextTimezone ?? DEFAULT_APP_TIMEZONE,
      defaultRiskPercent: nextDefaultRisk ?? DEFAULT_APP_RISK_PERCENT,
      defaultRrRatio: nextDefaultRr ?? DEFAULT_APP_RR_RATIO,
      defaultTimeframe: nextDefaultTimeframe ?? DEFAULT_APP_TIMEFRAME,
      updatedAt: new Date(),
    })
    .where(eq(appUsers.id, clerkUser.id))
    .returning();

  if (!updated) {
    throw new Error('Failed to update app user');
  }

  return toProfile(updated);
}
