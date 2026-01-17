"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Search,
  Plus,
  FileText,
  FolderClosed,
  Star,
  Clock,
  ArrowRight,
  Hash,
  Command,
  CornerDownLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Note, NoteFolder } from "@/types/notes";
import { mockNotes, mockFolders, noteTemplates } from "@/lib/notes-mock-data";
import { format } from "date-fns";

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  notes: Note[];
  folders: NoteFolder[];
  onSelectNote: (noteId: string) => void;
  onCreateNote: (folderId: string | null, templateId?: string) => void;
}

type CommandItem = {
  id: string;
  type: "note" | "folder" | "action" | "template";
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  keywords?: string[];
  action?: () => void;
};

export function CommandPalette({
  open,
  onOpenChange,
  notes,
  folders,
  onSelectNote,
  onCreateNote,
}: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Build command items
  const allItems = useMemo((): CommandItem[] => {
    const items: CommandItem[] = [];

    // Actions
    items.push({
      id: "new-note",
      type: "action",
      title: "Create New Note",
      subtitle: "Start with a blank note",
      icon: <Plus className="h-4 w-4 text-[#7c8bb8]" />,
      keywords: ["new", "create", "add"],
      action: () => {
        onCreateNote(null, "blank");
        onOpenChange(false);
      },
    });

    // Templates
    noteTemplates.forEach(template => {
      items.push({
        id: `template-${template.id}`,
        type: "template",
        title: `New ${template.name}`,
        subtitle: template.description,
        icon: <span className="text-lg">{template.icon}</span>,
        keywords: ["new", "create", "template", template.name.toLowerCase()],
        action: () => {
          onCreateNote(null, template.id);
          onOpenChange(false);
        },
      });
    });
    
    // Notes
    notes.filter(n => !n.isArchived).forEach(note => {
      const folder = folders.find(f => f.id === note.folderId);
      items.push({
        id: note.id,
        type: "note",
        title: note.title,
        subtitle: folder ? folder.name : "Uncategorized",
        icon: <span className="text-lg">{note.icon}</span>,
        keywords: [note.title.toLowerCase()],
        action: () => {
          onSelectNote(note.id);
          onOpenChange(false);
        },
      });
    });

    // Folders
    folders.forEach(folder => {
      items.push({
        id: `folder-${folder.id}`,
        type: "folder",
        title: folder.name,
        subtitle: `${notes.filter(n => n.folderId === folder.id).length} notes`,
        icon: <FolderClosed className="h-4 w-4 text-muted-foreground" />,
        keywords: [folder.name.toLowerCase(), "folder"],
      });
    });

    return items;
  }, [notes, folders, onCreateNote, onSelectNote, onOpenChange]);

  // Filter items based on query
  const filteredItems = useMemo(() => {
    if (!query.trim()) {
      // Show recent notes and quick actions when no query
      const recentNotes = allItems
        .filter(item => item.type === "note")
        .slice(0, 5);
      const actions = allItems.filter(item => item.type === "action" || item.type === "template");
      return [...actions.slice(0, 3), ...recentNotes];
    }

    const lowerQuery = query.toLowerCase();
    return allItems.filter(item => {
      if (item.title.toLowerCase().includes(lowerQuery)) return true;
      if (item.subtitle?.toLowerCase().includes(lowerQuery)) return true;
      if (item.keywords?.some(k => k.includes(lowerQuery))) return true;
      return false;
    });
  }, [query, allItems]);

  // Reset selection when items change
  useEffect(() => {
    setSelectedIndex(0);
  }, [filteredItems.length]);

  // Reset query when closed
  useEffect(() => {
    if (!open) {
      setQuery("");
      setSelectedIndex(0);
    }
  }, [open]);

  // Keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex(i => Math.min(i + 1, filteredItems.length - 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex(i => Math.max(i - 1, 0));
        break;
      case "Enter":
        e.preventDefault();
        const item = filteredItems[selectedIndex];
        if (item?.action) {
          item.action();
        }
        break;
      case "Escape":
        onOpenChange(false);
        break;
    }
  }, [filteredItems, selectedIndex, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="p-0 gap-0 max-w-xl overflow-hidden bg-background border-border shadow-2xl"
        showCloseButton={false}
      >
        {/* Search Input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border/50">
          <Search className="h-5 w-5 text-muted-foreground shrink-0" />
          <Input
            placeholder="Search notes, create new, or jump to..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            className="border-0 bg-transparent p-0 h-auto text-base focus-visible:ring-0 placeholder:text-muted-foreground/60"
            autoFocus
          />
          <kbd className="hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 text-xs font-medium bg-muted rounded border border-border">
            esc
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-[400px] overflow-y-auto p-2">
          {filteredItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="h-12 w-12 rounded-xl bg-muted/50 flex items-center justify-center mb-3">
                <Search className="h-5 w-5 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium">No results found</p>
              <p className="text-xs text-muted-foreground mt-1">Try a different search term</p>
            </div>
          ) : (
            <div className="space-y-1">
              {/* Group by type */}
              {filteredItems.filter(i => i.type === "action" || i.type === "template").length > 0 && (
                <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Quick Actions
                </div>
              )}
              {filteredItems
                .filter(i => i.type === "action" || i.type === "template")
                .map((item, index) => (
                  <CommandItem
                    key={item.id}
                    item={item}
                    isSelected={selectedIndex === index}
                    onSelect={() => item.action?.()}
                    onHover={() => setSelectedIndex(index)}
                  />
                ))}

              {filteredItems.filter(i => i.type === "note").length > 0 && (
                <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider mt-2">
                  Notes
                </div>
              )}
              {filteredItems
                .filter(i => i.type === "note")
                .map((item, index) => {
                  const actualIndex = filteredItems.findIndex(i => i.id === item.id);
                  return (
                    <CommandItem
                      key={item.id}
                      item={item}
                      isSelected={selectedIndex === actualIndex}
                      onSelect={() => item.action?.()}
                      onHover={() => setSelectedIndex(actualIndex)}
                    />
                  );
                })}

              {filteredItems.filter(i => i.type === "folder").length > 0 && (
                <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider mt-2">
                  Folders
                </div>
              )}
              {filteredItems
                .filter(i => i.type === "folder")
                .map((item) => {
                  const actualIndex = filteredItems.findIndex(i => i.id === item.id);
                  return (
                    <CommandItem
                      key={item.id}
                      item={item}
                      isSelected={selectedIndex === actualIndex}
                      onSelect={() => item.action?.()}
                      onHover={() => setSelectedIndex(actualIndex)}
                    />
                  );
                })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-2 border-t border-border/50 bg-muted/30">
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 bg-muted rounded text-[10px]">↑↓</kbd>
              navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 bg-muted rounded text-[10px]">↵</kbd>
              select
            </span>
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Command className="h-3 w-3" />
            <span>K to open anytime</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Command Item Component
function CommandItem({
  item,
  isSelected,
  onSelect,
  onHover,
}: {
  item: CommandItem;
  isSelected: boolean;
  onSelect: () => void;
  onHover: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      onMouseEnter={onHover}
      className={cn(
        "flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-left transition-colors",
        isSelected 
          ? "bg-[#7c8bb8]/10 text-[#5d6a94] dark:text-[#9aa8d4]" 
          : "hover:bg-muted/50"
      )}
    >
      <div className="shrink-0 flex items-center justify-center w-8 h-8 rounded-lg bg-muted/50">
        {item.icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-medium text-sm truncate">{item.title}</div>
        {item.subtitle && (
          <div className="text-xs text-muted-foreground truncate">{item.subtitle}</div>
        )}
      </div>
      {isSelected && (
        <div className="shrink-0 flex items-center gap-1 text-xs text-[#7c8bb8]">
          <CornerDownLeft className="h-3 w-3" />
        </div>
      )}
    </button>
  );
}



