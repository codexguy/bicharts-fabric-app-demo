import { useCallback } from "react";
import type { Controls } from "@bicharts/chart-host";
import { newId, prepend, useStoredList } from "@/lib/local-store";

/** A named setting of a chart's own controls. `values` is the controls' values as JSON, `summary` the chart's wording. */
export interface SavedScenario {
    id: string;
    chart: string;
    name: string;
    comment?: string;
    values: string;
    summary: string;
    author: string;
    createdAt: string;
}

const KEY = "global-revenue.scenarios";

/**
 * A chart's saved scenarios kept in this browser, newest first. `save(name, comment)` stores the controls' values as
 * they stand - the opening values too, before any slider has moved - with the chart's own summary; it throws when the
 * browser refuses the write. `apply` puts a saved scenario back on the chart.
 */
export function useSavedScenarios(chart: string, controls: Controls, author: string) {
    const all = useStoredList<SavedScenario>(KEY);
    const scenarios = all.filter((s) => s.chart === chart);
    const save = useCallback(
        async (name: string, comment?: string) => {
            prepend<SavedScenario>(KEY, {
                id: newId(),
                chart,
                name,
                comment: comment || undefined,
                values: JSON.stringify(controls.values),
                summary: controls.summary,
                author: author || "Anonymous",
                createdAt: new Date().toISOString(),
            });
        },
        [chart, controls, author],
    );
    const apply = useCallback(
        (s: SavedScenario) => {
            try {
                controls.set(JSON.parse(s.values) as Record<string, unknown>);
            } catch {
                /* a malformed entry changes nothing */
            }
        },
        [controls],
    );
    // The saved scenario the chart shows now: its values are the controls' values (applied, or dialled in by hand).
    const now = JSON.stringify(controls.values);
    const applied = scenarios.find((s) => s.values === now) ?? null;
    return { scenarios, error: null as string | null, save, apply, applied };
}
