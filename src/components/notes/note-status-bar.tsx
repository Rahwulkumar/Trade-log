"use client";

import { useMemo } from "react";
import { FileText, Clock, Hash, Pencil, Eye } from "lucide-react";
import { cn } from "@/lib/utils";
import { Note } from "@/types/notes";
import { format } from "date-fns";

interface NoteStatusBarProps {
  note: Note | null;
  wordCount?: number;
  characterCount?: number;
  isEditing?: boolean;
}

export function NoteStatusBar({ 
  note, 
  wordCount = 0, 
  characterCount = 0,
  isEditing = false 
}: NoteStatusBarProps) {
  if (!note) return null;

  const readingTime = useMemo(() => {
    const wordsPerMinute = 200;
    const minutes = Math.ceil(wordCount / wordsPerMinute);
    return minutes < 1 ? "< 1 min read" : `${minutes} min read`;
  }, [wordCount]);

  return (
    <div className="flex items-center justify-between px-6 py-2 border-t border-border/30 bg-muted/20 text-xs text-muted-foreground">
      {/* Left side - Document stats */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5">
          <FileText className="h-3.5 w-3.5" />
          <span>{wordCount.toLocaleString()} words</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Hash className="h-3.5 w-3.5" />
          <span>{characterCount.toLocaleString()} characters</span>
        </div>
        <div className="flex items-center gap-1.5 text-muted-foreground/60">
          <Clock className="h-3.5 w-3.5" />
          <span>{readingTime}</span>
        </div>
      </div>

      {/* Right side - Edit status & last saved */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5">
          {isEditing ? (
            <>
              <Pencil className="h-3.5 w-3.5 text-[#7c8bb8]" />
              <span className="text-[#7c8bb8]">Editing</span>
            </>
          ) : (
            <>
              <Eye className="h-3.5 w-3.5" />
              <span>Viewing</span>
            </>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-1.5 w-1.5 rounded-full bg-[#7c8bb8] animate-pulse" />
          <span>Saved</span>
        </div>
      </div>
    </div>
  );
}

// Utility to count words in BlockNote content
export function getContentStats(content: string): { wordCount: number; characterCount: number } {
  try {
    const blocks = JSON.parse(content);
    let text = "";
    
    const extractText = (items: unknown[]): void => {
      items.forEach((item: unknown) => {
        if (typeof item === "object" && item !== null) {
          const obj = item as Record<string, unknown>;
          if (obj.type === "text" && typeof obj.text === "string") {
            text += obj.text + " ";
          }
          if (Array.isArray(obj.content)) {
            extractText(obj.content);
          }
          if (Array.isArray(obj.children)) {
            extractText(obj.children);
          }
        }
      });
    };
    
    if (Array.isArray(blocks)) {
      extractText(blocks);
    }
    
    const words = text.trim().split(/\s+/).filter(w => w.length > 0);
    return {
      wordCount: words.length,
      characterCount: text.trim().length,
    };
  } catch {
    return { wordCount: 0, characterCount: 0 };
  }
}



