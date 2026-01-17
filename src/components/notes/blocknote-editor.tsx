"use client";

import "@blocknote/core/fonts/inter.css";
import "@blocknote/mantine/style.css";

import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import { useEffect, useMemo } from "react";
import { useTheme } from "next-themes";
import { Note } from "@/types/notes";

interface BlockNoteEditorProps {
  note: Note;
  onContentChange?: (content: string) => void;
}

export function BlockNoteEditor({ note, onContentChange }: BlockNoteEditorProps) {
  const { resolvedTheme } = useTheme();

  // Parse initial content
  const initialContent = useMemo(() => {
    if (!note?.content) return undefined;
    try {
      return JSON.parse(note.content);
    } catch {
      return undefined;
    }
  }, [note?.content]);

  // Create editor instance
  const editor = useCreateBlockNote({
    initialContent: initialContent,
  });

  // Update editor content when note changes
  useEffect(() => {
    if (editor && note?.content) {
      try {
        const content = JSON.parse(note.content);
        editor.replaceBlocks(editor.document, content);
      } catch {
        // Keep existing content if parse fails
      }
    }
  }, [note?.id, editor]);

  // Handle content changes
  const handleChange = () => {
    if (onContentChange && editor) {
      const content = JSON.stringify(editor.document);
      onContentChange(content);
    }
  };

  return (
    <div className="flex-1 overflow-auto blocknote-wrapper">
      <style jsx global>{`
        /* Custom BlockNote Dark Theme Overrides */
        .blocknote-wrapper .bn-editor {
          background: transparent !important;
          font-family: inherit;
        }
        
        .blocknote-wrapper .bn-container {
          background: transparent !important;
        }
        
        /* Dark mode specific overrides */
        .dark .blocknote-wrapper .bn-editor,
        .dark .blocknote-wrapper .bn-container,
        .dark .blocknote-wrapper [data-node-type] {
          background: transparent !important;
          color: hsl(var(--foreground)) !important;
        }
        
        .dark .blocknote-wrapper .bn-block-content {
          background: transparent !important;
        }
        
        .dark .blocknote-wrapper .bn-inline-content {
          color: hsl(var(--foreground)) !important;
        }
        
        /* Placeholder text */
        .dark .blocknote-wrapper [data-placeholder]::before {
          color: hsl(var(--muted-foreground)) !important;
          opacity: 0.5;
        }
        
        /* Selection */
        .dark .blocknote-wrapper ::selection {
          background: rgba(16, 185, 129, 0.3) !important;
        }
        
        /* Links */
        .dark .blocknote-wrapper a {
          color: rgb(52, 211, 153) !important;
        }
        
        /* Code blocks */
        .dark .blocknote-wrapper code {
          background: hsl(var(--muted)) !important;
          color: rgb(52, 211, 153) !important;
          padding: 0.125rem 0.25rem;
          border-radius: 0.25rem;
        }
        
        .dark .blocknote-wrapper pre {
          background: hsl(var(--muted)) !important;
          border: 1px solid hsl(var(--border)) !important;
        }
        
        /* Headings */
        .dark .blocknote-wrapper h1,
        .dark .blocknote-wrapper h2,
        .dark .blocknote-wrapper h3 {
          color: hsl(var(--foreground)) !important;
        }
        
        /* Checkboxes */
        .dark .blocknote-wrapper [data-checked="true"] .bn-inline-content {
          text-decoration: line-through;
          opacity: 0.6;
        }
        
        /* Menu/Toolbar styling */
        .dark .blocknote-wrapper .bn-menu,
        .dark .blocknote-wrapper .bn-toolbar,
        .dark .blocknote-wrapper .mantine-Menu-dropdown,
        .dark .blocknote-wrapper .mantine-Popover-dropdown {
          background: hsl(var(--popover)) !important;
          border: 1px solid hsl(var(--border)) !important;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3) !important;
        }
        
        .dark .blocknote-wrapper .mantine-Menu-item {
          color: hsl(var(--foreground)) !important;
        }
        
        .dark .blocknote-wrapper .mantine-Menu-item:hover {
          background: hsl(var(--accent)) !important;
        }
        
        /* Side menu (drag handle) */
        .dark .blocknote-wrapper .bn-side-menu {
          background: transparent !important;
        }
        
        /* Slash menu */
        .dark .blocknote-wrapper [role="listbox"],
        .dark .blocknote-wrapper [role="menu"] {
          background: hsl(var(--popover)) !important;
          border: 1px solid hsl(var(--border)) !important;
        }
        
        /* Block styling */
        .blocknote-wrapper .bn-block-outer {
          padding: 0.25rem 0;
        }
        
        /* Better typography */
        .blocknote-wrapper .bn-editor {
          padding: 0 1.5rem !important;
          max-width: 100%;
        }
        
        /* Quotes */
        .dark .blocknote-wrapper blockquote {
          border-left: 3px solid rgb(16, 185, 129) !important;
          background: rgba(16, 185, 129, 0.05) !important;
          padding: 0.5rem 1rem !important;
          margin: 0.5rem 0 !important;
        }
        
        /* Lists */
        .dark .blocknote-wrapper ul,
        .dark .blocknote-wrapper ol {
          color: hsl(var(--foreground)) !important;
        }
        
        /* Table styling */
        .dark .blocknote-wrapper table {
          border-color: hsl(var(--border)) !important;
        }
        
        .dark .blocknote-wrapper th,
        .dark .blocknote-wrapper td {
          border-color: hsl(var(--border)) !important;
          background: transparent !important;
        }
        
        .dark .blocknote-wrapper th {
          background: hsl(var(--muted)) !important;
        }
      `}</style>
      <BlockNoteView
        editor={editor}
        theme={resolvedTheme === "dark" ? "dark" : "light"}
        onChange={handleChange}
        className="min-h-full"
      />
    </div>
  );
}



