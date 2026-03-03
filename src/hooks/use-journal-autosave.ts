import { useState, useRef, useEffect, useCallback } from "react";
import type { JournalEntryDraft } from "@/domain/journal-types";
import { mapDraftToTradeUpdate } from "@/domain/journal-mapper";
import { createClient } from "@/lib/supabase/client";

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

/** Shallow check — good enough for the draft which is a flat-ish object */
function isDraftDirty(a: JournalEntryDraft, b: JournalEntryDraft): boolean {
  // Fast path: reference equality
  if (a === b) return false;

  // Check scalar fields
  if (
    a.notes !== b.notes ||
    a.feelings !== b.feelings ||
    a.observations !== b.observations ||
    a.executionNotes !== b.executionNotes ||
    a.conviction !== b.conviction ||
    a.entryRating !== b.entryRating ||
    a.exitRating !== b.exitRating ||
    a.mae !== b.mae ||
    a.mfe !== b.mfe
  )
    return true;

  // Check arrays by length + content
  if (a.setupTags.length !== b.setupTags.length) return true;
  if (a.mistakeTags.length !== b.mistakeTags.length) return true;
  if (a.executionArrays.length !== b.executionArrays.length) return true;
  if (a.screenshots.length !== b.screenshots.length) return true;

  // Check array elements (order matters)
  for (let i = 0; i < a.setupTags.length; i++) {
    if (a.setupTags[i] !== b.setupTags[i]) return true;
  }
  for (let i = 0; i < a.mistakeTags.length; i++) {
    if (a.mistakeTags[i] !== b.mistakeTags[i]) return true;
  }
  for (let i = 0; i < a.executionArrays.length; i++) {
    if (a.executionArrays[i] !== b.executionArrays[i]) return true;
  }
  for (let i = 0; i < a.screenshots.length; i++) {
    if (a.screenshots[i].url !== b.screenshots[i].url) return true;
  }

  // Check tfObservations keys
  const aKeys = Object.keys(a.tfObservations);
  const bKeys = Object.keys(b.tfObservations);
  if (aKeys.length !== bKeys.length) return true;
  for (const k of aKeys) {
    const aV = a.tfObservations[k];
    const bV = b.tfObservations[k];
    if (!bV) return true;
    if (aV?.bias !== bV?.bias || aV?.notes !== bV?.notes) return true;
  }

  return false;
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
      const supabase = createClient();
      const payload = mapDraftToTradeUpdate(draftRef.current);
      const { error } = await supabase
        .from("trades")
        .update(payload)
        .eq("id", tradeIdRef.current);

      // Reject if trade switched while saving
      if (gen !== genRef.current) return;

      if (error) {
        console.error("[Journal save error]", error.message, error.details);
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
