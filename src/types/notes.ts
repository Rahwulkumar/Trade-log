// Types for Notion-like notes feature

export interface NoteFolder {
    id: string;
    name: string;
    icon: string;
    parentId: string | null;
    isExpanded: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export interface NoteTag {
    id: string;
    name: string;
    color: string; // Tailwind color class
}

export interface Note {
    id: string;
    title: string;
    content: string; // JSON string from BlockNote
    folderId: string | null;
    tags: string[]; // Tag IDs
    icon: string;
    coverImage: string | null;
    isFavorite: boolean;
    isArchived: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export interface NotesState {
    notes: Note[];
    folders: NoteFolder[];
    tags: NoteTag[];
    selectedNoteId: string | null;
    selectedFolderId: string | null;
    searchQuery: string;
    sidebarWidth: number;
}

// Template types
export type NoteTemplate =
    | 'blank'
    | 'trade-analysis'
    | 'market-review'
    | 'weekly-plan'
    | 'psychology-reflection'
    | 'strategy-notes';

export interface NoteTemplateConfig {
    id: NoteTemplate;
    name: string;
    description: string;
    icon: string;
    defaultContent: string; // JSON string
}
