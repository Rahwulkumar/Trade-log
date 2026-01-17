"use client";

import { useState, useMemo } from "react";
import {
  ChevronRight,
  ChevronDown,
  Plus,
  Search,
  Star,
  FolderPlus,
  MoreHorizontal,
  Trash2,
  Edit,
  FolderClosed,
  FolderOpen,
  FileText,
  Sparkles,
  Clock,
  Hash,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Note, NoteFolder } from "@/types/notes";
import { mockFolders, mockNotes, noteTemplates } from "@/lib/notes-mock-data";
import { format } from "date-fns";

interface NotesSidebarProps {
  selectedNoteId: string | null;
  onSelectNote: (noteId: string) => void;
  onCreateNote: (folderId: string | null, templateId?: string) => void;
  className?: string;
}

export function NotesSidebar({
  selectedNoteId,
  onSelectNote,
  onCreateNote,
  className,
}: NotesSidebarProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [folders, setFolders] = useState<NoteFolder[]>(mockFolders);
  const [isNewFolderOpen, setIsNewFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [isTemplateOpen, setIsTemplateOpen] = useState(false);
  const [selectedFolderForNote, setSelectedFolderForNote] = useState<string | null>(null);
  const [hoveredNoteId, setHoveredNoteId] = useState<string | null>(null);

  const toggleFolder = (folderId: string) => {
    setFolders(folders.map(f => 
      f.id === folderId ? { ...f, isExpanded: !f.isExpanded } : f
    ));
  };

  const favoriteNotes = useMemo(() => 
    mockNotes.filter(n => n.isFavorite && !n.isArchived), 
    []
  );
  
  const unfolderedNotes = useMemo(() => 
    mockNotes.filter(n => !n.folderId && !n.isArchived),
    []
  );

  const getNotesForFolder = (folderId: string) => 
    mockNotes.filter(n => n.folderId === folderId && !n.isArchived);

  const filteredNotes = searchQuery
    ? mockNotes.filter(n => 
        n.title.toLowerCase().includes(searchQuery.toLowerCase()) && !n.isArchived
      )
    : null;

  const handleCreateFolder = () => {
    if (newFolderName.trim()) {
      const newFolder: NoteFolder = {
        id: `folder-${Date.now()}`,
        name: newFolderName.trim(),
        icon: "📁",
        parentId: null,
        isExpanded: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      setFolders([...folders, newFolder]);
      setNewFolderName("");
      setIsNewFolderOpen(false);
    }
  };

  const handleNewNoteClick = (folderId: string | null = null) => {
    setSelectedFolderForNote(folderId);
    setIsTemplateOpen(true);
  };

  const handleSelectTemplate = (templateId: string) => {
    onCreateNote(selectedFolderForNote, templateId);
    setIsTemplateOpen(false);
  };

  const recentNotes = useMemo(() => 
    [...mockNotes]
      .filter(n => !n.isArchived)
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
      .slice(0, 3),
    []
  );

  return (
    <div className={cn(
      "flex flex-col bg-gradient-to-b from-background to-background/95 border-r border-border/50",
      className
    )}>
      {/* Header */}
      <div className="p-4 space-y-4">
        {/* Title & Actions */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-[#7c8bb8]/20 to-[#c9b89a]/20 flex items-center justify-center">
              <FileText className="h-4 w-4 text-[#7c8bb8]" />
            </div>
            <div>
              <h2 className="font-semibold text-sm">Notes</h2>
              <p className="text-xs text-muted-foreground">{mockNotes.filter(n => !n.isArchived).length} notes</p>
            </div>
          </div>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 hover:bg-[#7c8bb8]/10 hover:text-[#7c8bb8] transition-colors"
              onClick={() => setIsNewFolderOpen(true)}
              title="New folder"
            >
              <FolderPlus className="h-3.5 w-3.5" />
            </Button>
            <Button
              size="icon"
              className="h-7 w-7 bg-gradient-to-r from-[#7c8bb8] to-[#c9b89a] hover:from-[#5d6a94] hover:to-[#a69878] text-white shadow-lg shadow-[#7c8bb8]/25"
              onClick={() => handleNewNoteClick()}
              title="New note"
            >
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="relative group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-[#7c8bb8] transition-colors" />
          <Input
            placeholder="Search notes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9 bg-muted/50 border-transparent focus:border-[#7c8bb8]/50 focus:bg-background transition-all"
          />
        </div>
      </div>

      {/* Notes List */}
      <ScrollArea className="flex-1 px-2">
        <div className="space-y-4 pb-4">
          {/* Search Results */}
          {filteredNotes && (
            <div className="space-y-1">
              <SectionHeader 
                icon={<Search className="h-3.5 w-3.5" />}
                title={`Results (${filteredNotes.length})`}
              />
              {filteredNotes.map(note => (
                <NoteItem
                  key={note.id}
                  note={note}
                  isSelected={selectedNoteId === note.id}
                  isHovered={hoveredNoteId === note.id}
                  onClick={() => onSelectNote(note.id)}
                  onMouseEnter={() => setHoveredNoteId(note.id)}
                  onMouseLeave={() => setHoveredNoteId(null)}
                />
              ))}
              {filteredNotes.length === 0 && (
                <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
                  <div className="h-12 w-12 rounded-xl bg-muted/50 flex items-center justify-center mb-3">
                    <Search className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <p className="text-sm font-medium">No notes found</p>
                  <p className="text-xs text-muted-foreground mt-1">Try a different search term</p>
                </div>
              )}
            </div>
          )}

          {/* Normal View */}
          {!filteredNotes && (
            <>
              {/* Quick Access / Recent */}
              {recentNotes.length > 0 && (
                <div className="space-y-1">
                  <SectionHeader 
                    icon={<Clock className="h-3.5 w-3.5" />}
                    title="Recent"
                  />
                  {recentNotes.map(note => (
                    <NoteItem
                      key={note.id}
                      note={note}
                      isSelected={selectedNoteId === note.id}
                      isHovered={hoveredNoteId === note.id}
                      onClick={() => onSelectNote(note.id)}
                      onMouseEnter={() => setHoveredNoteId(note.id)}
                      onMouseLeave={() => setHoveredNoteId(null)}
                      compact
                    />
                  ))}
                </div>
              )}

              {/* Favorites */}
              {favoriteNotes.length > 0 && (
                <div className="space-y-1">
                  <SectionHeader 
                    icon={<Star className="h-3.5 w-3.5 text-yellow-500" />}
                    title="Favorites"
                  />
                  {favoriteNotes.map(note => (
                    <NoteItem
                      key={note.id}
                      note={note}
                      isSelected={selectedNoteId === note.id}
                      isHovered={hoveredNoteId === note.id}
                      onClick={() => onSelectNote(note.id)}
                      onMouseEnter={() => setHoveredNoteId(note.id)}
                      onMouseLeave={() => setHoveredNoteId(null)}
                    />
                  ))}
                </div>
              )}

              {/* Folders */}
              <div className="space-y-1">
                <SectionHeader 
                  icon={<FolderClosed className="h-3.5 w-3.5" />}
                  title="Folders"
                  action={
                    <button 
                      onClick={() => setIsNewFolderOpen(true)}
                      className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-muted rounded transition-all"
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                  }
                />
                {folders.map(folder => (
                  <FolderItem
                    key={folder.id}
                    folder={folder}
                    notes={getNotesForFolder(folder.id)}
                    selectedNoteId={selectedNoteId}
                    hoveredNoteId={hoveredNoteId}
                    onToggle={() => toggleFolder(folder.id)}
                    onSelectNote={onSelectNote}
                    onNewNote={() => handleNewNoteClick(folder.id)}
                    onHoverNote={setHoveredNoteId}
                  />
                ))}
              </div>

              {/* Unfoldered Notes */}
              {unfolderedNotes.length > 0 && (
                <div className="space-y-1">
                  <SectionHeader 
                    icon={<Hash className="h-3.5 w-3.5" />}
                    title="Uncategorized"
                  />
                  {unfolderedNotes.map(note => (
                    <NoteItem
                      key={note.id}
                      note={note}
                      isSelected={selectedNoteId === note.id}
                      isHovered={hoveredNoteId === note.id}
                      onClick={() => onSelectNote(note.id)}
                      onMouseEnter={() => setHoveredNoteId(note.id)}
                      onMouseLeave={() => setHoveredNoteId(null)}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </ScrollArea>

      {/* New Folder Dialog */}
      <Dialog open={isNewFolderOpen} onOpenChange={setIsNewFolderOpen}>
        <DialogContent className="sm:max-w-[400px] bg-background border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FolderPlus className="h-5 w-5 text-[#7c8bb8]" />
              New Folder
            </DialogTitle>
            <DialogDescription>
              Create a folder to organize your trading notes.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="folder-name" className="text-sm font-medium">Folder Name</Label>
              <Input
                id="folder-name"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="e.g., Trading Ideas"
                className="focus:border-[#7c8bb8]"
                onKeyDown={(e) => e.key === "Enter" && handleCreateFolder()}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsNewFolderOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleCreateFolder} 
              className="bg-gradient-to-r from-[#7c8bb8] to-[#c9b89a] hover:from-[#5d6a94] hover:to-[#a69878]"
            >
              Create Folder
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Template Selection Dialog */}
      <Dialog open={isTemplateOpen} onOpenChange={setIsTemplateOpen}>
        <DialogContent className="sm:max-w-[480px] bg-background border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-[#7c8bb8]" />
              Create New Note
            </DialogTitle>
            <DialogDescription>
              Start with a template or create a blank note.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-4">
            {noteTemplates.map(template => (
              <button
                key={template.id}
                onClick={() => handleSelectTemplate(template.id)}
                className={cn(
                  "group flex flex-col items-start gap-2 p-4 rounded-xl border-2 border-transparent",
                  "bg-gradient-to-br from-muted/50 to-muted/30",
                  "hover:border-[#7c8bb8]/50 hover:from-[#7c8bb8]/5 hover:to-[#c9b89a]/5",
                  "transition-all duration-200 text-left"
                )}
              >
                <span className="text-3xl group-hover:scale-110 transition-transform">{template.icon}</span>
                <div>
                  <div className="font-medium text-sm">{template.name}</div>
                  <div className="text-xs text-muted-foreground line-clamp-2">{template.description}</div>
                </div>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Section Header Component
function SectionHeader({ 
  icon, 
  title, 
  action 
}: { 
  icon: React.ReactNode; 
  title: string; 
  action?: React.ReactNode;
}) {
  return (
    <div className="group flex items-center gap-2 px-2 py-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">
      {icon}
      <span className="flex-1">{title}</span>
      {action}
    </div>
  );
}

// Folder Item Component
interface FolderItemProps {
  folder: NoteFolder;
  notes: Note[];
  selectedNoteId: string | null;
  hoveredNoteId: string | null;
  onToggle: () => void;
  onSelectNote: (noteId: string) => void;
  onNewNote: () => void;
  onHoverNote: (noteId: string | null) => void;
}

function FolderItem({
  folder,
  notes,
  selectedNoteId,
  hoveredNoteId,
  onToggle,
  onSelectNote,
  onNewNote,
  onHoverNote,
}: FolderItemProps) {
  return (
    <div>
      <div 
        onClick={onToggle}
        className={cn(
          "group flex items-center gap-2 px-2 py-2 rounded-lg cursor-pointer transition-all duration-150",
          "hover:bg-muted/50"
        )}
      >
        <div className={cn(
          "flex items-center justify-center h-5 w-5 rounded transition-transform duration-200",
          folder.isExpanded && "rotate-0"
        )}>
          {folder.isExpanded ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {folder.isExpanded ? (
            <FolderOpen className="h-4 w-4 text-[#7c8bb8]/70" />
          ) : (
            <FolderClosed className="h-4 w-4 text-muted-foreground" />
          )}
          <span className="text-sm font-medium truncate">{folder.name}</span>
          <span className="text-xs text-muted-foreground tabular-nums">{notes.length}</span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-[#7c8bb8]/10 hover:text-[#7c8bb8]"
          onClick={(e) => {
            e.stopPropagation();
            onNewNote();
          }}
        >
          <Plus className="h-3 w-3" />
        </Button>
      </div>
      
      {/* Notes in folder with animation */}
      <div className={cn(
        "overflow-hidden transition-all duration-200",
        folder.isExpanded ? "opacity-100" : "opacity-0 h-0"
      )}>
        <div className="ml-4 pl-3 border-l-2 border-border/50 space-y-0.5">
          {notes.map(note => (
            <NoteItem
              key={note.id}
              note={note}
              isSelected={selectedNoteId === note.id}
              isHovered={hoveredNoteId === note.id}
              onClick={() => onSelectNote(note.id)}
              onMouseEnter={() => onHoverNote(note.id)}
              onMouseLeave={() => onHoverNote(null)}
              compact
            />
          ))}
          {notes.length === 0 && (
            <p className="text-xs text-muted-foreground py-2 px-2 italic">No notes yet</p>
          )}
        </div>
      </div>
    </div>
  );
}

// Note Item Component
interface NoteItemProps {
  note: Note;
  isSelected: boolean;
  isHovered: boolean;
  onClick: () => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  compact?: boolean;
}

function NoteItem({ 
  note, 
  isSelected, 
  isHovered,
  onClick, 
  onMouseEnter, 
  onMouseLeave,
  compact = false 
}: NoteItemProps) {
  return (
    <div
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className={cn(
        "group flex items-center gap-2 px-2 rounded-lg cursor-pointer transition-all duration-150",
        compact ? "py-1.5" : "py-2",
        isSelected
          ? "bg-gradient-to-r from-[#7c8bb8]/15 to-[#c9b89a]/10 text-[#5d6a94] dark:text-[#9aa8d4] shadow-sm"
          : "hover:bg-muted/50"
      )}
    >
      <span className={cn(
        "transition-transform duration-150",
        (isSelected || isHovered) && "scale-110"
      )}>
        {note.icon}
      </span>
      <div className="flex-1 min-w-0">
        <span className={cn(
          "text-sm truncate block",
          isSelected && "font-medium"
        )}>
          {note.title}
        </span>
        {!compact && (
          <span className="text-xs text-muted-foreground">
            {format(note.updatedAt, "MMM d")}
          </span>
        )}
      </div>
      {note.isFavorite && (
        <Star className={cn(
          "h-3 w-3 shrink-0 transition-colors",
          isSelected ? "text-yellow-500 fill-yellow-500" : "text-yellow-500/60 fill-yellow-500/60"
        )} />
      )}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "h-6 w-6 shrink-0 transition-opacity",
              isHovered || isSelected ? "opacity-100" : "opacity-0"
            )}
            onClick={(e) => e.stopPropagation()}
          >
            <MoreHorizontal className="h-3.5 w-3.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-40">
          <DropdownMenuItem className="gap-2">
            <Edit className="h-3.5 w-3.5" />
            Rename
          </DropdownMenuItem>
          <DropdownMenuItem className="gap-2">
            <Star className="h-3.5 w-3.5" />
            {note.isFavorite ? "Unfavorite" : "Favorite"}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem className="gap-2 text-destructive">
            <Trash2 className="h-3.5 w-3.5" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}



