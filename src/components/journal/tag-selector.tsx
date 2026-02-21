"use client";

import { useState } from "react";
import { X, Search } from "lucide-react";
import { ICT_SETUP_TAGS, ICT_MISTAKE_TAGS } from "@/lib/constants/ict-tags";

interface TagSelectorProps {
  type: "setup" | "mistake";
  value: string[];
  onChange: (tags: string[]) => void;
}

export function TagSelector({ type, value, onChange }: TagSelectorProps) {
  const [search, setSearch] = useState("");
  const allTags = type === "setup" ? ICT_SETUP_TAGS : ICT_MISTAKE_TAGS;

  const filtered = allTags.filter((t) =>
    t.toLowerCase().includes(search.toLowerCase())
  );

  const toggle = (tag: string) => {
    if (value.includes(tag)) {
      onChange(value.filter((t) => t !== tag));
    } else {
      onChange([...value, tag]);
    }
  };

  const remove = (tag: string) => onChange(value.filter((t) => t !== tag));

  const isSetup = type === "setup";
  const activeColor = isSetup ? "var(--accent-primary)" : "var(--loss-primary)";
  const activeBg = isSetup ? "var(--accent-soft)" : "var(--loss-bg)";
  const activeBorder = isSetup ? "var(--accent-primary)" : "var(--loss-primary)";

  return (
    <div className="flex flex-col gap-3">
      {/* Selected chips */}
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {value.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 rounded-full text-[11px] font-medium px-2.5 py-0.5"
              style={{
                background: activeBg,
                color: activeColor,
                border: `1px solid ${activeBorder}`,
                opacity: 0.9,
              }}
            >
              {tag}
              <button
                type="button"
                onClick={() => remove(tag)}
                className="opacity-60 hover:opacity-100 transition-opacity"
              >
                <X className="w-2.5 h-2.5" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search
          className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 pointer-events-none"
          style={{ color: "var(--text-tertiary)" }}
        />
        <input
          type="text"
          placeholder="Search tags..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-7 pr-3 py-1.5 text-[11px] rounded-[var(--radius-default)] focus:outline-none"
          style={{
            background: "var(--surface-elevated)",
            border: "1px solid var(--border-default)",
            color: "var(--text-primary)",
          }}
          onFocus={(e) => (e.target.style.borderColor = "var(--accent-primary)")}
          onBlur={(e) => (e.target.style.borderColor = "var(--border-default)")}
        />
      </div>

      {/* Tag grid */}
      <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto">
        {filtered.map((tag) => {
          const selected = value.includes(tag);
          return (
            <button
              key={tag}
              type="button"
              onClick={() => toggle(tag)}
              className="rounded-full text-[11px] font-medium px-2.5 py-0.5 transition-all duration-150"
              style={{
                background: selected ? activeBg : "var(--surface-elevated)",
                color: selected ? activeColor : "var(--text-secondary)",
                border: `1px solid ${selected ? activeBorder : "var(--border-default)"}`,
              }}
            >
              {tag}
            </button>
          );
        })}
        {filtered.length === 0 && (
          <span className="text-[11px]" style={{ color: "var(--text-tertiary)" }}>
            No tags match your search
          </span>
        )}
      </div>
    </div>
  );
}
