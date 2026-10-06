import { useCallback, useSyncExternalStore } from "react";

/**
 * A list kept in the browser's localStorage under one key, shared by every hook that reads it (and across tabs
 * through the `storage` event). Everything here is local to this browser: nobody else sees it.
 */
const listeners = new Set<() => void>();
const snapshots = new Map<string, { raw: string | null; value: unknown[] }>();

function read<T>(key: string): T[] {
    let raw: string | null = null;
    try {
        raw = localStorage.getItem(key);
    } catch {
        /* storage blocked: behave as empty */
    }
    const cached = snapshots.get(key);
    if (cached && cached.raw === raw) return cached.value as T[];
    let value: unknown[] = [];
    try {
        const parsed = raw ? JSON.parse(raw) : [];
        if (Array.isArray(parsed)) value = parsed;
    } catch {
        /* a corrupted value reads as empty */
    }
    snapshots.set(key, { raw, value });
    return value as T[];
}

/** Adds one item (newest first). Throws when the browser refuses the write (private mode, quota). */
export function prepend<T>(key: string, item: T): void {
    const next = [item, ...read<T>(key)];
    localStorage.setItem(key, JSON.stringify(next));
    listeners.forEach((l) => l());
}

export function useStoredList<T>(key: string): T[] {
    const subscribe = useCallback(
        (listener: () => void) => {
            listeners.add(listener);
            const onStorage = (e: StorageEvent) => {
                if (e.key === key || e.key === null) listener();
            };
            window.addEventListener("storage", onStorage);
            return () => {
                listeners.delete(listener);
                window.removeEventListener("storage", onStorage);
            };
        },
        [key],
    );
    return useSyncExternalStore(subscribe, () => read<T>(key), () => []);
}

export function newId(): string {
    return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
