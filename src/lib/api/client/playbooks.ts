/**
 * Client-safe Playbooks API
 * Uses fetch() — safe to import in "use client" components.
 */

import type { Playbook, PlaybookInsert } from '@/lib/db/schema';
import { readJsonIfAvailable } from '@/lib/api/client/http';
export type { Playbook, PlaybookInsert };

interface ApiErrorPayload {
  error?: string;
  message?: string;
}

function isApiErrorPayload(payload: unknown): payload is ApiErrorPayload {
  return (
    !!payload &&
    typeof payload === 'object' &&
    !Array.isArray(payload) &&
    ('error' in payload || 'message' in payload)
  );
}

function getApiErrorMessage(
  payload: unknown,
  fallback: string,
) {
  if (isApiErrorPayload(payload) && typeof payload.error === 'string') {
    return payload.error;
  }

  if (isApiErrorPayload(payload) && typeof payload.message === 'string') {
    return payload.message;
  }

  return fallback;
}

export interface PlaybookStats {
  playbook: Playbook;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  avgRMultiple: number;
  totalPnl: number;
}

export async function getPlaybooks(): Promise<Playbook[]> {
  const res = await fetch('/api/playbooks');
  const payload = await readJsonIfAvailable<Playbook[] | ApiErrorPayload>(res);

  if (!res.ok) {
    throw new Error(getApiErrorMessage(payload, 'Failed to load playbooks'));
  }

  if (!payload || !Array.isArray(payload)) {
    throw new Error('Failed to load playbooks');
  }

  return payload;
}

export async function getActivePlaybooks(): Promise<Playbook[]> {
  const res = await fetch('/api/playbooks?active=true');
  const payload = await readJsonIfAvailable<Playbook[] | ApiErrorPayload>(res);

  if (!res.ok) {
    throw new Error(getApiErrorMessage(payload, 'Failed to load playbooks'));
  }

  if (!payload || !Array.isArray(payload)) {
    throw new Error('Failed to load playbooks');
  }

  return payload;
}

export async function getPlaybook(id: string): Promise<Playbook> {
  const res = await fetch(`/api/playbooks/${id}`);
  const payload = await readJsonIfAvailable<Playbook | ApiErrorPayload>(res);

  if (!res.ok) {
    throw new Error(getApiErrorMessage(payload, 'Failed to load playbook'));
  }

  if (!payload || Array.isArray(payload) || isApiErrorPayload(payload)) {
    throw new Error('Failed to load playbook');
  }

  return payload;
}

export async function createPlaybook(
  data: Omit<PlaybookInsert, 'userId'>
): Promise<Playbook> {
  const res = await fetch('/api/playbooks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const payload = await readJsonIfAvailable<Playbook | ApiErrorPayload>(res);

  if (!res.ok) {
    throw new Error(getApiErrorMessage(payload, 'Failed to create playbook'));
  }

  if (!payload || Array.isArray(payload) || isApiErrorPayload(payload)) {
    throw new Error('Failed to create playbook');
  }

  return payload;
}

export async function updatePlaybook(
  id: string,
  updates: Partial<Omit<PlaybookInsert, 'id' | 'userId'>>
): Promise<Playbook> {
  const res = await fetch(`/api/playbooks/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
  const payload = await readJsonIfAvailable<Playbook | ApiErrorPayload>(res);

  if (!res.ok) {
    throw new Error(getApiErrorMessage(payload, 'Failed to update playbook'));
  }

  if (!payload || Array.isArray(payload) || isApiErrorPayload(payload)) {
    throw new Error('Failed to update playbook');
  }

  return payload;
}

export async function deletePlaybook(id: string): Promise<void> {
  const res = await fetch(`/api/playbooks/${id}`, { method: 'DELETE' });
  const payload = await readJsonIfAvailable<ApiErrorPayload>(res);

  if (!res.ok) {
    throw new Error(getApiErrorMessage(payload, 'Failed to delete playbook'));
  }
}

export async function togglePlaybookActive(id: string): Promise<Playbook> {
  const res = await fetch(`/api/playbooks/${id}/toggle-active`, { method: 'POST' });
  const payload = await readJsonIfAvailable<Playbook | ApiErrorPayload>(res);

  if (!res.ok) {
    throw new Error(getApiErrorMessage(payload, 'Failed to toggle playbook'));
  }

  if (!payload || Array.isArray(payload) || isApiErrorPayload(payload)) {
    throw new Error('Failed to toggle playbook');
  }

  return payload;
}

export async function duplicatePlaybook(id: string): Promise<Playbook> {
  const res = await fetch(`/api/playbooks/${id}/duplicate`, { method: 'POST' });
  const payload = await readJsonIfAvailable<Playbook | ApiErrorPayload>(res);

  if (!res.ok) {
    throw new Error(getApiErrorMessage(payload, 'Failed to duplicate playbook'));
  }

  if (!payload || Array.isArray(payload) || isApiErrorPayload(payload)) {
    throw new Error('Failed to duplicate playbook');
  }

  return payload;
}

export async function getAllPlaybooksWithStats(
  propAccountId?: string | null
): Promise<PlaybookStats[]> {
  const searchParams = new URLSearchParams();
  if (propAccountId) {
    searchParams.set('propAccountId', propAccountId);
  }

  const qs = searchParams.toString();
  const res = await fetch(`/api/playbooks/stats${qs ? `?${qs}` : ''}`);
  const payload = await readJsonIfAvailable<PlaybookStats[] | ApiErrorPayload>(res);

  if (!res.ok) {
    const message =
      payload &&
      typeof payload === 'object' &&
      !Array.isArray(payload) &&
      typeof payload.error === 'string'
        ? payload.error
        : payload &&
            typeof payload === 'object' &&
            !Array.isArray(payload) &&
            typeof payload.message === 'string'
          ? payload.message
          : 'Failed to load playbooks';
    throw new Error(message);
  }

  if (!payload || !Array.isArray(payload)) {
    throw new Error('Failed to load playbooks');
  }

  return payload;
}
