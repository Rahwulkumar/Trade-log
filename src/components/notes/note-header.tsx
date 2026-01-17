"use client";

import { useState, useRef, useEffect } from "react";
import {
  Star,
  MoreHorizontal,
  Trash2,
  Copy,
  Share2,
  Download,
  Tag,
  Clock,
  ChevronRight,
  ImageIcon,
  MessageSquare,
  Link2,
  Archive,
  FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Note } from "@/types/notes";
import { mockTags, mockFolders } from "@/lib/notes-mock-data";
import { formatDistanceToNow } from "date-fns";

interface NoteHeaderProps {
  note: Note | null;
  onTitleChange?: (title: string) => void;
  onToggleFavorite?: () => void;
  onDelete?: () => void;
  onIconChange?: (icon: string) => void;
}

export function NoteHeader({
  note,
  onTitleChange,
  onToggleFavorite,
  onDelete,
}: NoteHeaderProps) {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [title, setTitle] = useState(note?.title || "");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (note) setTitle(note.title);
  }, [note?.id, note?.title]);

  useEffect(() => {
    if (isEditingTitle && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditingTitle]);

  if (!note) {
    return null;
  }

  const handleTitleSubmit = () => {
    if (title.trim() && onTitleChange && title !== note.title) {
      onTitleChange(title.trim());
    }
    setIsEditingTitle(false);
  };

  const noteTags = mockTags.filter(t => note.tags.includes(t.id));
  const folder = mockFolders.find(f => f.id === note.folderId);

  return (
    <div className="border-b border-white/5 bg-void-soft">
      {/* Breadcrumb & Actions Bar */}
      <div className="flex items-center justify-between px-6 py-2 border-b border-white/5">
        {/* Breadcrumb */}
        <div className="flex items-center gap-1 text-sm text-muted-foreground">
          <span className="hover:text-foreground cursor-pointer transition-colors">Notes</span>
          {folder && (
            <>
              <ChevronRight className="h-3.5 w-3.5" />
              <span className="hover:text-foreground cursor-pointer transition-colors">
                {folder.name}
              </span>
            </>
          )}
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="text-foreground font-medium truncate max-w-[200px]">{note.title}</span>
        </div>

        {/* Quick Actions */}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "h-7 px-2 gap-1.5 text-muted-foreground hover:text-foreground hover:bg-white/5",
              note.isFavorite && "text-yellow-500 hover:text-yellow-400"
            )}
            onClick={onToggleFavorite}
          >
            <Star className={cn("h-3.5 w-3.5", note.isFavorite && "fill-current")} />
            <span className="text-xs">{note.isFavorite ? "Starred" : "Star"}</span>
          </Button>
          
          <Button variant="ghost" size="sm" className="h-7 px-2 gap-1.5 text-muted-foreground hover:text-foreground hover:bg-white/5">
            <Share2 className="h-3.5 w-3.5" />
            <span className="text-xs">Share</span>
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-white/5">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem className="gap-2">
                <Copy className="h-4 w-4" />
                Duplicate
              </DropdownMenuItem>
              <DropdownMenuItem className="gap-2">
                <Link2 className="h-4 w-4" />
                Copy link
              </DropdownMenuItem>
              <DropdownMenuItem className="gap-2">
                <Download className="h-4 w-4" />
                Export
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="gap-2">
                <Archive className="h-4 w-4" />
                Archive
              </DropdownMenuItem>
              <DropdownMenuItem className="gap-2 text-red-400" onClick={onDelete}>
                <Trash2 className="h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Main Header */}
      <div className="px-6 py-6">
        {/* Icon & Title */}
        <div className="flex items-start gap-4 mb-4">
          {/* Icon */}
          <div className="h-12 w-12 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
            <FileText className="h-6 w-6 text-blue-400" />
          </div>

          {/* Title */}
          <div className="flex-1 min-w-0">
            {isEditingTitle ? (
              <input
                ref={inputRef}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={handleTitleSubmit}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleTitleSubmit();
                  if (e.key === "Escape") {
                    setTitle(note.title);
                    setIsEditingTitle(false);
                  }
                }}
                className={cn(
                  "w-full text-3xl font-bold bg-transparent border-none outline-none",
                  "placeholder:text-muted-foreground/50"
                )}
                placeholder="Untitled"
              />
            ) : (
              <h1
                onClick={() => setIsEditingTitle(true)}
                className={cn(
                  "text-3xl font-bold cursor-text transition-colors",
                  "hover:text-muted-foreground"
                )}
              >
                {note.title || "Untitled"}
              </h1>
            )}
            
            {/* Meta Info */}
            <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                <span>Edited {formatDistanceToNow(note.updatedAt, { addSuffix: true })}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Tags & Quick Actions */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Tags */}
          <Popover>
            <PopoverTrigger asChild>
              <button className={cn(
                "inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm",
                "bg-white/[0.02] border border-white/5 hover:border-white/10 transition-colors",
                "text-muted-foreground hover:text-foreground"
              )}>
                <Tag className="h-3.5 w-3.5" />
                {noteTags.length > 0 ? (
                  <div className="flex gap-1">
                    {noteTags.slice(0, 3).map(tag => (
                      <Badge
                        key={tag.id}
                        variant="secondary"
                        className={cn(
                          "h-5 text-xs px-1.5 border-0",
                          tag.color.replace("bg-", "bg-") + "/20",
                          tag.color.replace("bg-", "text-").replace("-500", "-400")
                        )}
                      >
                        {tag.name}
                      </Badge>
                    ))}
                    {noteTags.length > 3 && (
                      <span className="text-xs">+{noteTags.length - 3}</span>
                    )}
                  </div>
                ) : (
                  <span>Add tags</span>
                )}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-56 p-2" align="start">
              <div className="text-xs font-medium text-muted-foreground mb-2 px-1">
                Select tags
              </div>
              <div className="space-y-0.5">
                {mockTags.map(tag => (
                  <button
                    key={tag.id}
                    className={cn(
                      "flex items-center gap-2 w-full px-2 py-1.5 rounded-md text-sm",
                      "hover:bg-white/5 transition-colors",
                      note.tags.includes(tag.id) && "bg-white/5"
                    )}
                  >
                    <div className={cn("w-2.5 h-2.5 rounded-full", tag.color)} />
                    <span className="flex-1 text-left">{tag.name}</span>
                    {note.tags.includes(tag.id) && (
                      <span className="text-blue-400">✓</span>
                    )}
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>

          {/* Add cover */}
          <button className={cn(
            "inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm",
            "text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors"
          )}>
            <ImageIcon className="h-3.5 w-3.5" />
            Add cover
          </button>

          {/* Add comment */}
          <button className={cn(
            "inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm",
            "text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors"
          )}>
            <MessageSquare className="h-3.5 w-3.5" />
            Comment
          </button>
        </div>
      </div>
    </div>
  );
}
