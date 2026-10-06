import { useCallback } from "react";
import { newId, prepend, useStoredList } from "@/lib/local-store";

/** A reader's note on one chart mark, keyed by the mark's model key (never a row position). */
export interface MarkNote {
    id: string;
    chart: string;
    markKey: string;
    /** A route's other end; empty for one mark. */
    markKeyTo?: string;
    body: string;
    author: string;
    createdAt: string;
}

const KEY = "global-revenue.notes";

/**
 * The notes kept in this browser, newest first. `add(chart, key, body)` saves one under a mark's key - [code] for
 * one mark, [from, to] for a route; it throws when the browser refuses the write, so the dialog keeps the text.
 */
export function useMarkNotes(author: string) {
    const notes = useStoredList<MarkNote>(KEY);
    const add = useCallback(
        async (chart: string, key: readonly unknown[], body: string) => {
            prepend<MarkNote>(KEY, {
                id: newId(),
                chart,
                markKey: String(key[0] ?? ""),
                markKeyTo: key.length > 1 && key[1] != null ? String(key[1]) : undefined,
                body,
                author: author || "Anonymous",
                createdAt: new Date().toISOString(),
            });
        },
        [author],
    );
    return { notes, add };
}
