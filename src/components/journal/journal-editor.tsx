"use client";

import { useMemo } from "react";
import { PartialBlock } from "@blocknote/core";
import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import { MantineProvider } from "@mantine/core";
import "@mantine/core/styles.css";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";

interface JournalEditorProps {
  initialContent?: string | null;
  onChange?: (jsonContent: string) => void;
  editable?: boolean;
  className?: string;
}

export function JournalEditor({
  initialContent,
  onChange,
  editable = true,
  className,
}: JournalEditorProps) {
  const { resolvedTheme } = useTheme();

  // Parse initial content: JSON string or plain text
  const initialBlocks = useMemo(() => {
    if (!initialContent) return undefined;
    try {
      // Try parsing as JSON array of blocks
      const parsed = JSON.parse(initialContent);
      if (Array.isArray(parsed)) return parsed as PartialBlock[];
      return [{ type: "paragraph", content: initialContent }] as PartialBlock[];
    } catch {
      // Fallback: It's plain text, wrap in paragraph
      return [{ type: "paragraph", content: initialContent }] as PartialBlock[];
    }
  }, [initialContent]);

  const editor = useCreateBlockNote({
    initialContent: initialBlocks,
  });

  const handleEditorChange = () => {
    if (onChange && editor) {
      onChange(JSON.stringify(editor.document));
    }
  };

  if (!editor) {
    return null;
  }

  return (
    <div
      className={cn(
        "journal-editor-wrapper rounded-md border border-input bg-card/50 overflow-hidden",
        className,
      )}
    >
      <MantineProvider
        defaultColorScheme={resolvedTheme === "dark" ? "dark" : "light"}
      >
        <BlockNoteView
          editor={editor}
          editable={editable}
          theme={resolvedTheme === "dark" ? "dark" : "light"}
          onChange={handleEditorChange}
          className="min-h-[200px] py-2"
        />
      </MantineProvider>
    </div>
  );
}
