"use client";

import { useEffect, useCallback } from "react";

interface UseKeyboardShortcutsProps {
    onCommandK: () => void;
    onNewNote: () => void;
    onSave?: () => void;
}

export function useKeyboardShortcuts({
    onCommandK,
    onNewNote,
    onSave,
}: UseKeyboardShortcutsProps) {
    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        // Command/Ctrl + K - Open command palette
        if ((e.metaKey || e.ctrlKey) && e.key === "k") {
            e.preventDefault();
            onCommandK();
            return;
        }

        // Command/Ctrl + N - New note (when not in input)
        if ((e.metaKey || e.ctrlKey) && e.key === "n") {
            const target = e.target as HTMLElement;
            const isInput = target.tagName === "INPUT" ||
                target.tagName === "TEXTAREA" ||
                target.isContentEditable;
            if (!isInput) {
                e.preventDefault();
                onNewNote();
                return;
            }
        }

        // Command/Ctrl + S - Save (prevent default, show feedback)
        if ((e.metaKey || e.ctrlKey) && e.key === "s") {
            e.preventDefault();
            onSave?.();
            return;
        }
    }, [onCommandK, onNewNote, onSave]);

    useEffect(() => {
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [handleKeyDown]);
}
