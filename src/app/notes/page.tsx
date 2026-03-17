"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { format } from "date-fns";
import { IconSearch } from "@/components/ui/icons";
import {
  Plus,
  Trash2,
  Star,
  Hash,
  BookOpen,
  FileText,
  TrendingUp,
  Lightbulb,
  Target,
  Zap,
  BarChart3,
  Brain,
  DollarSign,
  StickyNote,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Note {
  id: string;
  title: string;
  content: string;
  emoji: string;
  pinned: boolean;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

const STORAGE_KEY = "tradelog_notebook_notes";

// ─── Icon Set ─────────────────────────────────────────────────────────────────
type NoteIconKey =
  | "file"
  | "lightbulb"
  | "chart"
  | "target"
  | "zap"
  | "trending"
  | "dollar"
  | "brain"
  | "book"
  | "sticky";
const NOTE_ICONS: Record<NoteIconKey, LucideIcon> = {
  file: FileText,
  lightbulb: Lightbulb,
  chart: BarChart3,
  target: Target,
  zap: Zap,
  trending: TrendingUp,
  dollar: DollarSign,
  brain: Brain,
  book: BookOpen,
  sticky: StickyNote,
};
const NOTE_ICON_KEYS = Object.keys(NOTE_ICONS) as NoteIconKey[];

function NoteIcon({ iconKey, size = 14 }: { iconKey: string; size?: number }) {
  const Icon = NOTE_ICONS[iconKey as NoteIconKey] ?? FileText;
  return <Icon size={size} strokeWidth={1.7} />;
}

function createNote(): Note {
  return {
    id: crypto.randomUUID(),
    title: "",
    content: "",
    emoji: NOTE_ICON_KEYS[Math.floor(Math.random() * NOTE_ICON_KEYS.length)],
    pinned: false,
    tags: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

// ─── Load / Save ──────────────────────────────────────────────────────────────
function loadNotes(): Note[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Note[]) : [];
  } catch {
    return [];
  }
}

function saveNotes(notes: Note[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
}

// ─── Note List Item ─────────────────────────────────────────────────────────
function NoteListItem({
  note,
  isActive,
  onClick,
}: {
  note: Note;
  isActive: boolean;
  onClick: () => void;
}) {
  const preview =
    note.content.replace(/#+\s/g, "").slice(0, 60) || "No content";

  return (
    <Button
      type="button"
      onClick={onClick}
      variant="ghost"
      className={cn(
        "h-auto w-full justify-start whitespace-normal rounded-[var(--radius-default)] border px-3 py-2.5 text-left transition-all",
        "hover:bg-[var(--surface-hover)] hover:text-inherit",
      )}
      style={{
        background: isActive ? "var(--accent-soft)" : "transparent",
        border: `1px solid ${isActive ? "var(--accent-primary)" : "transparent"}`,
        boxShadow: isActive ? "0 0 10px var(--accent-glow)" : "none",
      }}
    >
      <div className="flex items-center gap-2 mb-0.5">
        <span
          className="flex items-center justify-center w-5 h-5 rounded-[4px] shrink-0"
          style={{
            background: "var(--accent-soft)",
            color: "var(--accent-primary)",
          }}
        >
          <NoteIcon iconKey={note.emoji} size={11} />
        </span>
        <span
          className="flex-1 truncate text-[0.82rem] font-semibold"
          style={{
            color: isActive ? "var(--accent-primary)" : "var(--text-primary)",
          }}
        >
          {note.title || "Untitled"}
        </span>
        {note.pinned && (
          <Star
            size={10}
            fill="currentColor"
            style={{
              color: "var(--accent-primary)",
              flexShrink: 0,
              filter: "drop-shadow(0 0 4px var(--accent-glow))",
            }}
          />
        )}
      </div>
      <div className="flex items-center gap-2">
        <span
          className="text-[0.65rem] leading-snug truncate flex-1 font-medium"
          style={{ color: "var(--text-tertiary)" }}
        >
          {preview}
        </span>
        <span
          className="text-[0.6rem] shrink-0 font-mono"
          style={{ color: "var(--text-tertiary)" }}
        >
          {format(new Date(note.updatedAt), "MMM d")}
        </span>
      </div>
    </Button>
  );
}

// ─── Auto-resizing Textarea ───────────────────────────────────────────────────
function AutoTextarea({
  value,
  onChange,
  placeholder,
  className,
  style,
  minRows = 3,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
  style?: React.CSSProperties;
  minRows?: number;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);

  return (
    <Textarea
      ref={ref}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={className}
      style={{ ...style, overflow: "hidden", minHeight: `${minRows * 1.6}rem` }}
      rows={minRows}
    />
  );
}

// ─── Tag Chip ────────────────────────────────────────────────────────────────
function TagChip({
  label,
  onRemove,
}: {
  label: string;
  onRemove?: () => void;
}) {
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[0.65rem] font-medium"
      style={{
        background: "var(--accent-soft)",
        color: "var(--accent-primary)",
      }}
    >
      <Hash size={9} />
      {label}
      {onRemove && (
        <Button
          type="button"
          onClick={onRemove}
          variant="ghost"
          size="icon-sm"
          className="h-4 w-4 rounded-full p-0 text-current hover:bg-transparent hover:opacity-70"
        >
          ×
        </Button>
      )}
    </span>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function NotesPage() {
  const [notes, setNotes] = useState<Note[]>(loadNotes);
  const [activeId, setActiveId] = useState<string | null>(() => {
    const loaded = loadNotes();
    return loaded.length > 0 ? loaded[0].id : null;
  });
  const [search, setSearch] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const activeNote = useMemo(
    () => notes.find((n) => n.id === activeId) ?? null,
    [notes, activeId],
  );

  useEffect(() => {
    return () => {
      if (saveTimer.current) {
        clearTimeout(saveTimer.current);
        saveTimer.current = null;
      }
    };
  }, []);

  // Debounced save
  const updateNote = useCallback((id: string, patch: Partial<Note>) => {
    setNotes((prev) => {
      const updated = prev.map((n) =>
        n.id === id
          ? { ...n, ...patch, updatedAt: new Date().toISOString() }
          : n,
      );
      if (saveTimer.current) clearTimeout(saveTimer.current);
      setIsSaving(true);
      saveTimer.current = setTimeout(() => {
        saveNotes(updated);
        setIsSaving(false);
      }, 600);
      return updated;
    });
  }, []);

  const newNote = () => {
    const note = createNote();
    setNotes((prev) => {
      const updated = [note, ...prev];
      saveNotes(updated);
      return updated;
    });
    setActiveId(note.id);
  };

  const deleteNote = (id: string) => {
    setNotes((prev) => {
      const updated = prev.filter((n) => n.id !== id);
      saveNotes(updated);
      return updated;
    });
    setActiveId((prev) => {
      if (prev !== id) return prev;
      const remaining = notes.filter((n) => n.id !== id);
      return remaining[0]?.id ?? null;
    });
  };

  const togglePin = (id: string) => {
    const note = notes.find((n) => n.id === id);
    if (!note) return;
    updateNote(id, { pinned: !note.pinned });
  };

  const addTag = (id: string, tag: string) => {
    const note = notes.find((n) => n.id === id);
    if (!note || !tag.trim() || note.tags.includes(tag.trim())) return;
    updateNote(id, { tags: [...note.tags, tag.trim()] });
    setTagInput("");
  };

  const removeTag = (id: string, tag: string) => {
    const note = notes.find((n) => n.id === id);
    if (!note) return;
    updateNote(id, { tags: note.tags.filter((t) => t !== tag) });
  };

  // Filtered + sorted
  const filtered = useMemo(() => {
    const query = search.toLowerCase();
    return [...notes]
      .filter((n) =>
        query
          ? n.title.toLowerCase().includes(query) ||
            n.content.toLowerCase().includes(query) ||
            n.tags.some((t) => t.toLowerCase().includes(query))
          : true,
      )
      .sort((a, b) => {
        if (a.pinned && !b.pinned) return -1;
        if (!a.pinned && b.pinned) return 1;
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      });
  }, [notes, search]);

  const pinnedCount = useMemo(
    () => notes.filter((n) => n.pinned).length,
    [notes],
  );

  return (
    <div
      className="h-[calc(100vh-3.5rem)] flex overflow-hidden"
      style={{ background: "var(--app-bg)" }}
    >
      {/* ──────────── LEFT SIDEBAR ──────────── */}
      <div
        className="w-[260px] shrink-0 flex flex-col h-full"
        style={{
          background: "var(--surface)",
          borderRight: "1px solid var(--border-default)",
        }}
      >
        {/* Header */}
        <div
          className="gradient-mesh-header px-4 py-3.5 flex items-center justify-between shrink-0 relative"
          style={{ borderBottom: "1px solid var(--border-default)" }}
        >
          <div className="flex items-center gap-2.5 relative z-10">
            <div
              className="flex items-center justify-center w-7 h-7 rounded-[var(--radius-sm)]"
              style={{
                background:
                  "linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))",
                boxShadow: "0 3px 10px var(--accent-glow)",
              }}
            >
              <BookOpen size={13} color="#fff" />
            </div>
            <span
              className="text-gradient"
              style={{
                fontWeight: 800,
                fontSize: "0.95rem",
                letterSpacing: "-0.02em",
              }}
            >
              Notebook
            </span>
          </div>
          <Button
            type="button"
            onClick={newNote}
            size="icon-sm"
            className="relative z-10 h-6 w-6 rounded-[var(--radius-sm)] border-0 p-0 text-white transition-transform hover:scale-110 hover:text-white"
            style={{
              background:
                "linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))",
              boxShadow: "0 2px 8px var(--accent-glow)",
            }}
            title="New note"
          >
            <Plus size={13} strokeWidth={2.5} color="#fff" />
          </Button>
        </div>

        {/* Search */}
        <div
          className="px-3 py-2 shrink-0"
          style={{ borderBottom: "1px solid var(--border-subtle)" }}
        >
          <div
            className="flex items-center gap-2 px-2.5 py-1.5 rounded-[var(--radius-default)]"
            style={{
              background: "var(--surface-elevated)",
              border: "1px solid var(--border-default)",
            }}
          >
            <IconSearch
              size={12}
              style={{ color: "var(--text-tertiary)", flexShrink: 0 }}
            />
            <Input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search notes..."
              className="h-auto flex-1 border-0 bg-transparent px-0 py-0 text-[0.72rem] text-[var(--text-primary)] shadow-none focus-visible:ring-0"
            />
          </div>
        </div>

        {/* Stats chips */}
        <div
          className="flex items-center gap-2 px-3 py-1.5 shrink-0"
          style={{ borderBottom: "1px solid var(--border-subtle)" }}
        >
          <span
            className="text-[0.6rem] px-1.5 py-0.5 rounded-full"
            style={{
              background: "var(--surface-elevated)",
              color: "var(--text-tertiary)",
            }}
          >
            {notes.length} notes
          </span>
          {pinnedCount > 0 && (
            <span
              className="text-[0.6rem] px-1.5 py-0.5 rounded-full flex items-center gap-0.5"
              style={{
                background: "var(--accent-soft)",
                color: "var(--accent-primary)",
              }}
            >
              <Star size={7} fill="currentColor" />
              {pinnedCount} pinned
            </span>
          )}
        </div>

        {/* Note list */}
        <div className="flex-1 overflow-y-auto px-2 py-2 space-y-0.5">
          {filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <div
                className="flex items-center justify-center w-12 h-12 rounded-[var(--radius-lg)] float"
                style={{
                  background: "var(--accent-soft)",
                  color: "var(--accent-primary)",
                }}
              >
                <BookOpen size={22} strokeWidth={1.5} />
              </div>
              <div className="text-center">
                <p
                  className="text-[0.78rem] font-medium"
                  style={{ color: "var(--text-secondary)" }}
                >
                  {search
                    ? "Nothing matched that search"
                    : "Your notebook is empty"}
                </p>
                <p
                  className="text-[0.68rem] mt-0.5"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  {search
                    ? "Try different keywords"
                    : "Hit + to jot something down"}
                </p>
              </div>
            </div>
          )}
          {filtered.map((note) => (
            <NoteListItem
              key={note.id}
              note={note}
              isActive={note.id === activeId}
              onClick={() => setActiveId(note.id)}
            />
          ))}
        </div>
      </div>

      {/* ──────────── EDITOR AREA ──────────── */}
      {activeNote ? (
        <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
          {/* Toolbar */}
          <div
            className="flex items-center justify-between px-6 py-2.5 shrink-0"
            style={{
              borderBottom: "1px solid var(--border-subtle)",
              background: "var(--surface)",
            }}
          >
            <div className="flex items-center gap-2">
              {/* Icon picker trigger */}
              <div className="relative">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setShowEmojiPicker((v) => !v)}
                  className="h-7 w-7 rounded-[var(--radius-sm)] bg-[var(--accent-soft)] p-0 text-[var(--accent-primary)] hover:scale-110 hover:bg-[var(--accent-soft)] hover:text-[var(--accent-primary)]"
                  title="Change note icon"
                >
                  <NoteIcon iconKey={activeNote.emoji} size={13} />
                </Button>
                {showEmojiPicker && (
                  <div
                    className="absolute left-0 top-full mt-1 z-50 p-2 rounded-[var(--radius-md)] flex flex-wrap gap-1"
                    style={{
                      background: "var(--surface-elevated)",
                      border: "1px solid var(--border-default)",
                      boxShadow: "var(--shadow-lg)",
                      width: "160px",
                    }}
                  >
                    {NOTE_ICON_KEYS.map((key) => (
                      <Button
                        key={key}
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        className="h-7 w-7 rounded-[var(--radius-sm)] p-0 text-[var(--text-secondary)] hover:scale-125 hover:bg-[var(--accent-soft)] hover:text-[var(--accent-primary)]"
                        onClick={() => {
                          updateNote(activeNote.id, { emoji: key });
                          setShowEmojiPicker(false);
                        }}
                      >
                        <NoteIcon iconKey={key} size={13} />
                      </Button>
                    ))}
                  </div>
                )}
              </div>

              {/* Metadata */}
              <span
                className="text-[0.65rem]"
                style={{ color: "var(--text-tertiary)" }}
              >
                Last edited{" "}
                {format(new Date(activeNote.updatedAt), "MMM d, yyyy · HH:mm")}
              </span>

              {isSaving && (
                <span
                  className="text-[0.6rem] animate-pulse"
                  style={{ color: "var(--accent-primary)" }}
                >
                  Saving...
                </span>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1.5">
              <Button
                type="button"
                onClick={() => togglePin(activeNote.id)}
                variant="ghost"
                size="sm"
                className="h-auto gap-1 rounded-[var(--radius-sm)] px-2 py-1 text-[0.68rem] font-medium"
                style={
                  activeNote.pinned
                    ? {
                        background: "var(--accent-soft)",
                        color: "var(--accent-primary)",
                      }
                    : {
                        background: "var(--surface-elevated)",
                        color: "var(--text-tertiary)",
                      }
                }
              >
                <Star
                  size={11}
                  fill={activeNote.pinned ? "currentColor" : "none"}
                />
                {activeNote.pinned ? "Pinned" : "Pin"}
              </Button>

              <Button
                type="button"
                onClick={() => deleteNote(activeNote.id)}
                variant="ghost"
                size="sm"
                className="h-auto gap-1 rounded-[var(--radius-sm)] px-2 py-1 text-[0.68rem] font-medium hover:text-[var(--loss-primary)]"
                style={{
                  background: "var(--loss-bg)",
                  color: "var(--loss-primary)",
                }}
              >
                <Trash2 size={11} />
                Delete
              </Button>
            </div>
          </div>

          {/* Editor body */}
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-3xl px-8 py-10">
              {/* Title */}
              <Input
                type="text"
                value={activeNote.title}
                onChange={(e) =>
                  updateNote(activeNote.id, { title: e.target.value })
                }
                placeholder="Untitled"
                className="mb-6 h-auto w-full border-0 bg-transparent px-0 py-0 text-[2.2rem] font-bold leading-tight tracking-[-0.03em] text-[var(--text-primary)] shadow-none focus-visible:ring-0"
                style={{
                  caretColor: "var(--accent-primary)",
                }}
              />

              {/* Tags row */}
              <div className="flex flex-wrap items-center gap-1.5 mb-6">
                {activeNote.tags.map((tag) => (
                  <TagChip
                    key={tag}
                    label={tag}
                    onRemove={() => removeTag(activeNote.id, tag)}
                  />
                ))}
                <div className="flex items-center gap-1">
                  <Input
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === ",") {
                        e.preventDefault();
                        addTag(activeNote.id, tagInput);
                      }
                    }}
                    placeholder="+ Add tag"
                    className="h-auto w-[84px] border-0 bg-transparent px-0 py-0 text-[0.68rem] text-[var(--text-tertiary)] shadow-none focus-visible:ring-0"
                  />
                </div>
              </div>

              {/* Divider */}
              <div
                className="mb-6"
                style={{ height: "1px", background: "var(--border-subtle)" }}
              />

              {/* Content */}
              <AutoTextarea
                value={activeNote.content}
                onChange={(v) => updateNote(activeNote.id, { content: v })}
                placeholder={`Start writing…\n\nTip: Use # for headings, - for lists, and write freely. Notes are saved automatically.`}
                className="w-full bg-transparent outline-none resize-none leading-[1.8] border-none"
                style={{
                  fontFamily: "var(--font-dm-sans)",
                  fontSize: "0.95rem",
                  color: "var(--text-primary)",
                  caretColor: "var(--accent-primary)",
                }}
                minRows={20}
              />
            </div>
          </div>
        </div>
      ) : (
        /* Empty state */
        <div
          className="flex-1 flex flex-col items-center justify-center gap-4"
          style={{ background: "var(--app-bg)" }}
        >
          <div
            className="flex h-16 w-16 items-center justify-center rounded-2xl"
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border-default)",
            }}
          >
            <BookOpen
              size={28}
              style={{ color: "var(--accent-primary)", opacity: 0.7 }}
            />
          </div>
          <div className="text-center">
            <p
              className="font-bold text-[1rem] mb-1"
              style={{
                color: "var(--text-primary)",
              }}
            >
              Your Notebook
            </p>
            <p
              className="text-[0.8rem] max-w-[260px] leading-relaxed"
              style={{ color: "var(--text-tertiary)" }}
            >
              A quiet space to think, plan, and write. Create your first note to
              get started.
            </p>
          </div>
          <Button onClick={newNote}>
            <Plus size={14} />
            New Note
          </Button>
        </div>
      )}
    </div>
  );
}
