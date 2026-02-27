"use client";

// ─────────────────────────────────────────────────────────────────────────────
//  NOTEBOOK — Notion-like free-form notes
//  Left: note list with search + pin sections
//  Right: icon • big title • BlockNote rich-text editor
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/components/auth-provider";
import { JournalEditor } from "@/components/journal/journal-editor";
import { format, formatDistanceToNowStrict } from "date-fns";
import { Plus, Pin, PinOff, Trash2, Search, FileText } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Note {
  id: string;
  title: string;
  content: string | null;
  icon: string;
  pinned: boolean;
  tags: string[];
  created_at: string;
  updated_at: string;
}

// ─── Emoji picker options ─────────────────────────────────────────────────────
const EMOJI_OPTIONS = [
  "📝","📖","📊","📈","📉","🎯","💡","⚡","🧠","💰",
  "📌","🔖","📋","📄","🗒️","✏️","🖊️","📐","🔍","📅",
  "💹","🏦","📣","🔔","⚠️","✅","❌","🚀","🌐","🔑",
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getExcerpt(content: string | null): string {
  if (!content) return "No content yet…";
  try {
    const blocks = JSON.parse(content) as Array<{
      content?: Array<{ text?: string }>;
    }>;
    const texts = blocks
      .flatMap((b) => b.content ?? [])
      .map((c) => c.text ?? "")
      .join(" ")
      .trim();
    return texts.slice(0, 80) || "No content yet…";
  } catch {
    return content.slice(0, 80) || "No content yet…";
  }
}

// ─── Note list item ───────────────────────────────────────────────────────────
function NoteItem({
  note,
  selected,
  onClick,
  onPin,
  onDelete,
}: {
  note: Note;
  selected: boolean;
  onClick: () => void;
  onPin: () => void;
  onDelete: () => void;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      className="relative flex items-start gap-2.5 px-3 py-2.5 cursor-pointer rounded-[var(--radius-sm)] mx-2 transition-colors duration-100"
      style={{
        background: selected
          ? "var(--accent-soft)"
          : hovered
          ? "var(--surface-raised)"
          : "transparent",
      }}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <span className="text-base leading-none mt-0.5 flex-shrink-0">{note.icon}</span>
      <div className="flex-1 min-w-0 pr-10">
        <p
          className="text-[0.78rem] font-medium truncate leading-snug"
          style={{ color: selected ? "var(--accent-primary)" : "var(--text-primary)" }}
        >
          {note.title || "Untitled"}
        </p>
        <p
          className="text-[0.67rem] truncate mt-0.5 leading-snug"
          style={{ color: "var(--text-tertiary)" }}
        >
          {getExcerpt(note.content)}
        </p>
        <p className="text-[0.62rem] mt-1" style={{ color: "var(--text-tertiary)" }}>
          {formatDistanceToNowStrict(new Date(note.updated_at), { addSuffix: true })}
        </p>
      </div>

      {/* Action buttons — appear on hover */}
      {hovered && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
          <button
            onClick={(e) => { e.stopPropagation(); onPin(); }}
            className="p-1 rounded transition-colors hover:bg-[var(--surface-elevated)]"
            title={note.pinned ? "Unpin" : "Pin"}
          >
            {note.pinned
              ? <PinOff size={11} style={{ color: "var(--accent-primary)" }} />
              : <Pin size={11} style={{ color: "var(--text-tertiary)" }} />}
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="p-1 rounded transition-colors hover:bg-[var(--surface-elevated)]"
            title="Delete"
          >
            <Trash2 size={11} style={{ color: "var(--loss-primary)" }} />
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Emoji picker popover ─────────────────────────────────────────────────────
function EmojiPicker({
  current,
  onSelect,
  onClose,
}: {
  current: string;
  onSelect: (emoji: string) => void;
  onClose: () => void;
}) {
  // Close on click outside
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [onClose]);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 6, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 6, scale: 0.96 }}
      transition={{ duration: 0.12 }}
      className="absolute z-50 top-full mt-1 left-0 p-2 rounded-[var(--radius-md)] shadow-xl border grid grid-cols-6 gap-1"
      style={{
        background: "var(--surface-raised)",
        borderColor: "var(--border-default)",
        width: 228,
      }}
    >
      {EMOJI_OPTIONS.map((e) => (
        <button
          key={e}
          onClick={() => { onSelect(e); onClose(); }}
          className="w-8 h-8 flex items-center justify-center rounded text-xl transition-colors hover:bg-[var(--surface-elevated)]"
          style={{ background: e === current ? "var(--accent-soft)" : undefined }}
        >
          {e}
        </button>
      ))}
    </motion.div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────
function EmptyEditor({ onCreate }: { onCreate: () => void }) {
  return (
    <div
      className="flex-1 flex flex-col items-center justify-center gap-4"
      style={{ color: "var(--text-tertiary)" }}
    >
      <FileText size={52} strokeWidth={1} style={{ opacity: 0.25 }} />
      <div className="text-center">
        <p className="text-[0.95rem] font-semibold mb-1" style={{ color: "var(--text-secondary)" }}>
          No note selected
        </p>
        <p className="text-[0.8rem]">Pick a note from the list or create a new one.</p>
      </div>
      <button
        onClick={onCreate}
        className="mt-1 px-4 py-2 rounded-[var(--radius-sm)] text-sm font-semibold transition-all hover:opacity-90 active:scale-95"
        style={{ background: "var(--accent-primary)", color: "#fff" }}
      >
        New note
      </button>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function NotebookPage() {
  const { user } = useAuth();
  const supabase = createClient();

  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Load notes ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("notes")
        .select("*")
        .eq("user_id", user.id)
        .order("pinned", { ascending: false })
        .order("updated_at", { ascending: false });
      const rows = (data ?? []) as Note[];
      setNotes(rows);
      if (rows.length) setSelectedId(rows[0].id);
      setLoading(false);
    })();
  }, [user]); // eslint-disable-line

  const selected = useMemo(
    () => notes.find((n) => n.id === selectedId) ?? null,
    [notes, selectedId],
  );

  // ── CRUD ────────────────────────────────────────────────────────────────────
  const createNote = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("notes")
      .insert({ user_id: user.id, title: "Untitled", icon: "📝" })
      .select()
      .single();
    if (data) {
      const note = data as Note;
      setNotes((prev) => [note, ...prev]);
      setSelectedId(note.id);
    }
  }, [user, supabase]);

  const updateNote = useCallback(
    (field: string, value: unknown) => {
      if (!selectedId) return;
      setNotes((prev) =>
        prev.map((n) =>
          n.id === selectedId
            ? { ...n, [field]: value, updated_at: new Date().toISOString() }
            : n,
        ),
      );
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(async () => {
        await supabase.from("notes").update({ [field]: value }).eq("id", selectedId);
      }, 600);
    },
    [selectedId, supabase],
  );

  const togglePin = useCallback(
    (id: string) => {
      const note = notes.find((n) => n.id === id);
      if (!note) return;
      const next = !note.pinned;
      setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, pinned: next } : n)));
      supabase.from("notes").update({ pinned: next }).eq("id", id);
    },
    [notes, supabase],
  );

  const deleteNote = useCallback(
    async (id: string) => {
      await supabase.from("notes").delete().eq("id", id);
      setNotes((prev) => {
        const remaining = prev.filter((n) => n.id !== id);
        if (selectedId === id) setSelectedId(remaining[0]?.id ?? null);
        return remaining;
      });
    },
    [selectedId, supabase],
  );

  // ── Filtered & grouped lists ────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return notes;
    return notes.filter(
      (n) =>
        n.title.toLowerCase().includes(q) ||
        n.tags.some((t) => t.toLowerCase().includes(q)),
    );
  }, [notes, search]);

  const pinnedNotes = filtered.filter((n) => n.pinned);
  const unpinnedNotes = filtered.filter((n) => !n.pinned);

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div
      className="flex overflow-hidden"
      style={{ height: "calc(100vh - 3.5rem)", background: "var(--app-bg)" }}
    >
      {/* ════ LEFT SIDEBAR ════════════════════════════════════════════════════ */}
      <aside
        className="flex-shrink-0 flex flex-col border-r"
        style={{
          width: 260,
          borderColor: "var(--border-default)",
          background: "var(--surface)",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-4 py-3 border-b"
          style={{ borderColor: "var(--border-default)" }}
        >
          <span
            className="text-[0.78rem] font-bold tracking-wider uppercase"
            style={{ fontFamily: "var(--font-syne)", color: "var(--text-secondary)" }}
          >
            Notebook
          </span>
          <button
            onClick={createNote}
            className="w-6 h-6 flex items-center justify-center rounded transition-colors hover:bg-[var(--surface-raised)]"
            title="New note"
          >
            <Plus size={14} style={{ color: "var(--accent-primary)" }} />
          </button>
        </div>

        {/* Search */}
        <div className="px-3 py-2.5">
          <div
            className="flex items-center gap-2 px-2.5 py-1.5 rounded-[var(--radius-sm)]"
            style={{
              background: "var(--surface-raised)",
              border: "1px solid var(--border-default)",
            }}
          >
            <Search size={11} style={{ color: "var(--text-tertiary)", flexShrink: 0 }} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search notes…"
              className="flex-1 bg-transparent text-[0.73rem] outline-none placeholder:opacity-40"
              style={{ color: "var(--text-primary)" }}
            />
          </div>
        </div>

        {/* Notes list */}
        <div className="flex-1 overflow-y-auto py-1">
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <div
                className="w-4 h-4 rounded-full border-2 animate-spin"
                style={{ borderColor: "var(--accent-primary)", borderTopColor: "transparent" }}
              />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-10 px-5">
              <p className="text-[0.73rem]" style={{ color: "var(--text-tertiary)" }}>
                {search ? "No notes match your search." : "No notes yet."}
              </p>
              {!search && (
                <button
                  onClick={createNote}
                  className="mt-3 text-[0.72rem] font-semibold transition-opacity hover:opacity-80"
                  style={{ color: "var(--accent-primary)" }}
                >
                  Create your first note →
                </button>
              )}
            </div>
          ) : (
            <>
              {/* ── Pinned ── */}
              {pinnedNotes.length > 0 && (
                <div>
                  <p
                    className="px-5 pt-2 pb-1 text-[0.6rem] font-bold uppercase tracking-widest"
                    style={{ color: "var(--text-tertiary)" }}
                  >
                    Pinned
                  </p>
                  <AnimatePresence initial={false}>
                    {pinnedNotes.map((n) => (
                      <motion.div
                        key={n.id}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -8 }}
                        transition={{ duration: 0.13 }}
                      >
                        <NoteItem
                          note={n}
                          selected={selectedId === n.id}
                          onClick={() => setSelectedId(n.id)}
                          onPin={() => togglePin(n.id)}
                          onDelete={() => deleteNote(n.id)}
                        />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}

              {/* ── All Notes ── */}
              {unpinnedNotes.length > 0 && (
                <div className={pinnedNotes.length > 0 ? "mt-3" : undefined}>
                  {pinnedNotes.length > 0 && (
                    <p
                      className="px-5 pt-2 pb-1 text-[0.6rem] font-bold uppercase tracking-widest"
                      style={{ color: "var(--text-tertiary)" }}
                    >
                      Notes
                    </p>
                  )}
                  <AnimatePresence initial={false}>
                    {unpinnedNotes.map((n) => (
                      <motion.div
                        key={n.id}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -8 }}
                        transition={{ duration: 0.13 }}
                      >
                        <NoteItem
                          note={n}
                          selected={selectedId === n.id}
                          onClick={() => setSelectedId(n.id)}
                          onPin={() => togglePin(n.id)}
                          onDelete={() => deleteNote(n.id)}
                        />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {notes.length > 0 && (
          <div
            className="px-4 py-2 border-t text-center text-[0.62rem]"
            style={{ borderColor: "var(--border-default)", color: "var(--text-tertiary)" }}
          >
            {notes.length} {notes.length === 1 ? "note" : "notes"}
          </div>
        )}
      </aside>

      {/* ════ EDITOR AREA ═════════════════════════════════════════════════════ */}
      {selected ? (
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Accent stripe */}
          <div
            className="flex-shrink-0 h-px"
            style={{ background: "linear-gradient(90deg, var(--accent-primary) 0%, transparent 50%)" }}
          />

          <div className="flex-1 overflow-y-auto">
            <div className="max-w-2xl mx-auto px-10 pt-12 pb-20">
              {/* ── Emoji icon (click to change) ── */}
              <div className="relative inline-block mb-5">
                <button
                  onClick={() => setEmojiPickerOpen((v) => !v)}
                  className="text-5xl leading-none select-none transition-transform duration-150 hover:scale-110 active:scale-95 block"
                  title="Change icon"
                >
                  {selected.icon}
                </button>
                <AnimatePresence>
                  {emojiPickerOpen && (
                    <EmojiPicker
                      current={selected.icon}
                      onSelect={(e) => { updateNote("icon", e); setEmojiPickerOpen(false); }}
                      onClose={() => setEmojiPickerOpen(false)}
                    />
                  )}
                </AnimatePresence>
              </div>

              {/* ── Title ── */}
              <textarea
                value={selected.title}
                onChange={(e) => {
                  e.target.style.height = "auto";
                  e.target.style.height = `${e.target.scrollHeight}px`;
                  updateNote("title", e.target.value);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    // Focus the BlockNote editor
                    const el = document.querySelector<HTMLElement>(".bn-editor [contenteditable]");
                    el?.focus();
                  }
                }}
                placeholder="Untitled"
                rows={1}
                className="w-full bg-transparent border-none outline-none resize-none overflow-hidden font-bold placeholder:opacity-20 leading-tight"
                style={{
                  fontSize: "2.4rem",
                  fontFamily: "var(--font-syne)",
                  color: "var(--text-primary)",
                }}
              />

              {/* ── Meta row ── */}
              <div
                className="flex items-center gap-2.5 mt-3 mb-6 flex-wrap text-[0.68rem]"
                style={{ color: "var(--text-tertiary)" }}
              >
                <span>
                  {format(new Date(selected.updated_at), "MMM d, yyyy · HH:mm")}
                </span>
                <span style={{ opacity: 0.4 }}>·</span>
                <button
                  onClick={() => togglePin(selected.id)}
                  className="flex items-center gap-1 transition-colors hover:text-[var(--accent-primary)]"
                >
                  {selected.pinned ? (
                    <>
                      <Pin size={10} style={{ color: "var(--accent-primary)" }} />
                      <span style={{ color: "var(--accent-primary)" }}>Pinned</span>
                    </>
                  ) : (
                    <>
                      <PinOff size={10} />
                      <span>Pin</span>
                    </>
                  )}
                </button>
                <span style={{ opacity: 0.4 }}>·</span>
                <button
                  onClick={() => deleteNote(selected.id)}
                  className="flex items-center gap-1 transition-colors hover:text-[var(--loss-primary)]"
                >
                  <Trash2 size={10} />
                  <span>Delete</span>
                </button>
              </div>

              {/* ── Divider ── */}
              <div className="mb-8 h-px" style={{ background: "var(--border-default)" }} />

              {/* ── BlockNote editor ── */}
              <JournalEditor
                key={selected.id}
                initialContent={selected.content}
                onChange={(v) => updateNote("content", v)}
                className="min-h-[50vh]"
              />
            </div>
          </div>
        </div>
      ) : (
        <EmptyEditor onCreate={createNote} />
      )}
    </div>
  );
}
