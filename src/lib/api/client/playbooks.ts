/**
 * Client-safe Playbooks API
 * Uses fetch() — safe to import in "use client" components.
 */

import type { Playbook, PlaybookInsert } from '@/lib/db/schema';
export type { Playbook, PlaybookInsert };

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
  try {
    const res = await fetch('/api/playbooks');
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

export async function getActivePlaybooks(): Promise<Playbook[]> {
  try {
    const res = await fetch('/api/playbooks?active=true');
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

export async function getPlaybook(id: string): Promise<Playbook | null> {
  try {
    const res = await fetch(`/api/playbooks/${id}`);
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function createPlaybook(
  data: Omit<PlaybookInsert, 'userId'>
): Promise<Playbook> {
  const res = await fetch('/api/playbooks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to create playbook');
  return res.json();
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
  if (!res.ok) throw new Error('Failed to update playbook');
  return res.json();
}

export async function deletePlaybook(id: string): Promise<void> {
  const res = await fetch(`/api/playbooks/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete playbook');
}

export async function togglePlaybookActive(id: string): Promise<Playbook> {
  const res = await fetch(`/api/playbooks/${id}/toggle-active`, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to toggle playbook');
  return res.json();
}

export async function duplicatePlaybook(id: string): Promise<Playbook> {
  const res = await fetch(`/api/playbooks/${id}/duplicate`, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to duplicate playbook');
  return res.json();
}

export async function getAllPlaybooksWithStats(
  propAccountId?: string | null
): Promise<PlaybookStats[]> {
  const qs = propAccountId ? `?propAccountId=${propAccountId}` : '';
  try {
    const res = await fetch(`/api/playbooks/stats${qs}`);
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}
