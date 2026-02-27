"use client";

import { useState, useRef, KeyboardEvent } from "react";
import { X, Search, Plus } from "lucide-react";
import { ICT_SETUP_TAGS, ICT_MISTAKE_TAGS } from "@/lib/constants/ict-tags";

interface TagSelectorProps {
  type: "setup" | "mistake";
  value: string[];
  onChange: (tags: string[]) => void;
}

export function TagSelector({ type, value, onChange }: TagSelectorProps) {
  const [search, setSearch] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const presetTags: string[] =
    type === "setup" ? [...ICT_SETUP_TAGS] : [...ICT_MISTAKE_TAGS];
  const isSetup = type === "setup";

  const activeColor = isSetup ? "var(--accent-primary)" : "var(--loss-primary)";
  const activeBg = isSetup ? "var(--accent-soft)" : "var(--loss-bg)";
  const activeBorder = isSetup
    ? "var(--accent-primary)"
    : "var(--loss-primary)";

  // All tags = preset union custom (ones in value[] not in preset list)
  const customTags = value.filter((t) => !presetTags.includes(t));

  // Filtered preset list based on search
  const filteredPresets = search.trim()
    ? presetTags.filter((t) =>
        t.toLowerCase().includes(search.trim().toLowerCase()),
      )
    : presetTags;

  // Whether the current search text can be added as a new custom tag
  const trimmed = search.trim();
  const canCreate =
    trimmed.length > 0 &&
    !presetTags.map((t) => t.toLowerCase()).includes(trimmed.toLowerCase()) &&
    !value.map((t) => t.toLowerCase()).includes(trimmed.toLowerCase());

  const toggle = (tag: string) => {
    onChange(
      value.includes(tag) ? value.filter((t) => t !== tag) : [...value, tag],
    );
  };

  const createCustom = () => {
    if (!canCreate) return;
    onChange([...value, trimmed]);
    setSearch("");
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (canCreate) {
        createCustom();
      } else if (filteredPresets.length === 1) {
        // Quick-select single match
        toggle(filteredPresets[0]);
        setSearch("");
      }
    } else if (e.key === "Escape") {
      setSearch("");
    }
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Selected tags */}
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {value.map((tag) => {
            const isCustom = !presetTags.includes(tag);
            return (
              <span
                key={tag}
                className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-medium"
                style={{
                  fontSize: "0.72rem",
                  background: activeBg,
                  color: activeColor,
                  border: `1px ${isCustom ? "dashed" : "solid"} ${activeBorder}`,
                }}
              >
                {isCustom && (
                  <span style={{ fontSize: "0.6rem", opacity: 0.7 }}>✦</span>
                )}
                {tag}
                <button
                  type="button"
                  onClick={() => onChange(value.filter((t) => t !== tag))}
                  style={{ color: activeColor, opacity: 0.7 }}
                >
                  <X size={10} />
                </button>
              </span>
            );
          })}
        </div>
      )}

      {/* Search + create input */}
      <div
        className="flex items-center gap-2 rounded-[8px] px-3"
        style={{
          background: "var(--surface-elevated)",
          border: "1px solid var(--border-subtle)",
        }}
      >
        <Search
          size={12}
          style={{ color: "var(--text-tertiary)", flexShrink: 0 }}
        />
        <input
          ref={inputRef}
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={`Search or create ${isSetup ? "setup" : "mistake"} tag…`}
          className="flex-1 bg-transparent outline-none py-2.5"
          style={{ fontSize: "0.75rem", color: "var(--text-primary)" }}
        />
        {search && (
          <button
            type="button"
            onClick={() => setSearch("")}
            style={{ color: "var(--text-tertiary)", flexShrink: 0 }}
          >
            <X size={10} />
          </button>
        )}
        {/* Custom create button */}
        {canCreate && (
          <button
            type="button"
            onClick={createCustom}
            title={`Create tag "${trimmed}"`}
            className="flex items-center gap-1 rounded-[5px] px-2 py-1 font-semibold shrink-0 transition-all"
            style={{
              fontSize: "0.62rem",
              background: activeBg,
              color: activeColor,
              border: `1px solid ${activeBorder}`,
            }}
          >
            <Plus size={9} strokeWidth={2.5} />
            Create
          </button>
        )}
      </div>

      {/* Hint */}
      {canCreate && (
        <p
          style={{
            fontSize: "0.6rem",
            color: "var(--text-tertiary)",
            marginTop: -8,
          }}
        >
          Press{" "}
          <kbd
            style={{
              fontFamily: "monospace",
              padding: "0 3px",
              background: "var(--surface-elevated)",
              borderRadius: 3,
            }}
          >
            Enter
          </kbd>{" "}
          or click Create to add &ldquo;{trimmed}&rdquo; as a custom tag
        </p>
      )}

      {/* Tag grid */}
      <div className="flex flex-wrap gap-1.5 max-h-52 overflow-y-auto">
        {/* Custom tags not in preset list */}
        {customTags.map((tag) => (
          <button
            key={tag}
            type="button"
            onClick={() => toggle(tag)}
            className="rounded-full font-medium transition-all duration-150"
            style={{
              padding: "4px 12px",
              fontSize: "0.72rem",
              background: value.includes(tag)
                ? activeBg
                : "var(--surface-elevated)",
              color: value.includes(tag)
                ? activeColor
                : "var(--text-secondary)",
              border: `1px dashed ${value.includes(tag) ? activeBorder : "var(--border-default)"}`,
              boxShadow: value.includes(tag)
                ? `0 0 6px var(--accent-glow)`
                : "none",
            }}
          >
            ✦ {tag}
          </button>
        ))}

        {/* Preset tags */}
        {filteredPresets.map((tag) => {
          const on = value.includes(tag);
          return (
            <button
              key={tag}
              type="button"
              onClick={() => toggle(tag)}
              className="rounded-full font-medium transition-all duration-150"
              style={{
                padding: "4px 12px",
                fontSize: "0.72rem",
                background: on ? activeBg : "var(--surface-elevated)",
                color: on ? activeColor : "var(--text-secondary)",
                border: `1px solid ${on ? activeBorder : "var(--border-subtle)"}`,
                boxShadow:
                  on && isSetup ? "0 0 6px var(--accent-glow)" : "none",
              }}
            >
              {tag}
            </button>
          );
        })}

        {filteredPresets.length === 0 && customTags.length === 0 && (
          <span
            style={{
              fontSize: "0.72rem",
              color: "var(--text-tertiary)",
              fontStyle: "italic",
            }}
          >
            {canCreate ? `Press Enter to create "${trimmed}"` : "No tags match"}
          </span>
        )}
      </div>
    </div>
  );
}
