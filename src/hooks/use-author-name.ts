import { useState } from "react";

const KEY = "global-revenue.author";

/** The name notes and scenarios are signed with, remembered in this browser. */
export function useAuthorName(): [string, (name: string) => void] {
    const [name, setName] = useState(() => {
        try {
            return localStorage.getItem(KEY) ?? "";
        } catch {
            return "";
        }
    });
    const update = (next: string) => {
        setName(next);
        try {
            localStorage.setItem(KEY, next);
        } catch {
            /* storage blocked: the name lasts for this visit */
        }
    };
    return [name, update];
}
