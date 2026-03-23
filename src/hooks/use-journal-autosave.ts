import { useState, useRef, useEffect, useCallback } from "react";
import type { JournalEntryDraft } from "@/domain/journal-types";
import { mapDraftToApiUpdate } from "@/domain/journal-mapper";

// ─── useJournalAutosave ─────────────────────────────────────────────────────
// Replaces the ad-hoc useEffect + handleSave pattern in TradeJournal.
//
// Design:
//   - Trailing debounce via useRef<ReturnType<typeof setTimeout>>
//   - Uses refs for draft/tradeId so the save callback never goes stale
//   - Generation counter (saveGenRef) rejects stale saves after trade switch
//   - Returns { saving, savedAt, isDirty, save } — manual save for the button
// ────────────────────────────────────────────────────────────────────────────

interface UseJournalAutosaveOptions {
  /** Current mutable draft state */
  draft: JournalEntryDraft;
  /** Initial draft snapshot (from viewModelToDraft) — used for dirty detection */
  initialDraft: JournalEntryDraft;
  /** Trade row ID */
  tradeId: string;
  /** Callback after a successful save (e.g. refresh trade list) */
  onSaved: () => void;
  /** Debounce delay in ms (default: 2500) */
  debounceMs?: number;
}

interface UseJournalAutosaveReturn {
  saving: boolean;
  savedAt: Date | null;
  isDirty: boolean;
  /** Manually trigger a save (for the Save button) */
  save: () => Promise<void>;
}

function stableDraftSnapshot(draft: JournalEntryDraft) {
  return JSON.stringify({
    ...draft,
    setupTags: [...draft.setupTags],
    mistakeTags: [...draft.mistakeTags],
    executionArrays: [...draft.executionArrays],
    screenshots: draft.screenshots.map((item) => ({
      id: item.id,
      url: item.url,
      timeframe: item.timeframe,
      createdAt: item.createdAt,
    })),
    tfObservations: Object.fromEntries(
      Object.entries(draft.tfObservations).sort(([left], [right]) =>
        left.localeCompare(right),
      ),
    ),
    journalReview: { ...draft.journalReview },
  });
}

function isDraftDirty(a: JournalEntryDraft, b: JournalEntryDraft): boolean {
  if (a === b) return false;
  return stableDraftSnapshot(a) !== stableDraftSnapshot(b);
}

export function useJournalAutosave({
  draft,
  initialDraft,
  tradeId,
  onSaved,
  debounceMs = 2500,
}: UseJournalAutosaveOptions): UseJournalAutosaveReturn {
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);

  // ── Refs to avoid stale closures ──────────────────────────────────────
  const draftRef = useRef(draft);
  draftRef.current = draft;

  const tradeIdRef = useRef(tradeId);
  tradeIdRef.current = tradeId;

  const onSavedRef = useRef(onSaved);
  onSavedRef.current = onSaved;

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Generation counter — increments on trade switch, stale saves are rejected
  const genRef = useRef(0);

  // ── Reset on trade switch ─────────────────────────────────────────────
  useEffect(() => {
    genRef.current += 1;
    setSavedAt(null);
    // Clear any pending autosave from previous trade
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, [tradeId]);

  // ── Core save function (always reads from refs) ───────────────────────
  const performSave = useCallback(async (gen: number) => {
    // Reject stale save if trade has switched
    if (gen !== genRef.current) return;

    setSaving(true);
    try {
      const payload = mapDraftToApiUpdate(draftRef.current);
      const res = await fetch(`/api/trades/${tradeIdRef.current}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      // Reject if trade switched while saving
      if (gen !== genRef.current) return;

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        console.error("[Journal save error]", err);
        return;
      }

      setSavedAt(new Date());
      onSavedRef.current();
    } catch (e) {
      console.error("[Journal save]", e);
    } finally {
      setSaving(false);
    }
  }, []); // stable — reads everything from refs

  // ── Manual save (for the Save button) ─────────────────────────────────
  const save = useCallback(async () => {
    // Cancel any pending autosave to avoid double-save
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    await performSave(genRef.current);
  }, [performSave]);

  // ── Autosave effect (trailing debounce) ───────────────────────────────
  const isDirty = isDraftDirty(draft, initialDraft);

  useEffect(() => {
    if (!isDirty) return;

    const currentGen = genRef.current;
    timerRef.current = setTimeout(() => {
      performSave(currentGen);
    }, debounceMs);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [draft, isDirty, debounceMs, performSave]);

  return { saving, savedAt, isDirty, save };
}
