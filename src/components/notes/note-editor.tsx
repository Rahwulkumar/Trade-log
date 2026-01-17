"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { Note } from "@/types/notes";
import { cn } from "@/lib/utils";
import { FileText, Command, Loader2 } from "lucide-react";

// Dynamically import BlockNote with SSR disabled
const BlockNoteEditor = dynamic(
  () => import("./blocknote-editor").then((mod) => mod.BlockNoteEditor),
  { 
    ssr: false,
    loading: () => (
      <div className="flex-1 flex flex-col items-center justify-center gap-4">
        <div className="relative">
          <div className="h-12 w-12 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
            <Loader2 className="h-6 w-6 text-blue-400 animate-spin" />
          </div>
        </div>
        <div className="text-sm text-muted-foreground">Loading editor...</div>
      </div>
    ),
  }
);

interface NoteEditorProps {
  note: Note | null;
  onContentChange?: (content: string) => void;
}

export function NoteEditor({ note, onContentChange }: NoteEditorProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4">
        <div className="relative">
          <div className="h-12 w-12 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
            <Loader2 className="h-6 w-6 text-blue-400 animate-spin" />
          </div>
        </div>
        <div className="text-sm text-muted-foreground">Loading editor...</div>
      </div>
    );
  }

  if (!note) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center">
        <div className="max-w-md text-center px-8">
          {/* Illustration */}
          <div className="relative mb-8">
            <div className="h-24 w-24 mx-auto rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-center">
              <FileText className="h-10 w-10 text-muted-foreground" />
            </div>
          </div>

          <h3 className="text-xl font-semibold mb-2">
            No note selected
          </h3>
          <p className="text-muted-foreground mb-6 text-sm">
            Select a note from the sidebar or create a new one to start capturing your trading insights.
          </p>

          {/* Quick tips */}
          <div className="space-y-3 text-left">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-white/[0.02] border border-white/5">
              <kbd className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-void rounded border border-white/10">
                <Command className="h-3 w-3" />
                K
              </kbd>
              <span className="text-sm text-muted-foreground">Quick search</span>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-white/[0.02] border border-white/5">
              <kbd className="px-2 py-1 text-xs font-medium bg-void rounded border border-white/10">/</kbd>
              <span className="text-sm text-muted-foreground">Insert blocks</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-hidden flex flex-col bg-void">
      <BlockNoteEditor
        note={note}
        onContentChange={onContentChange}
      />
    </div>
  );
}
