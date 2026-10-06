import { useEffect, useMemo, useState } from "react";
import { loadModel } from "@/data/load";
import {
    aggregate,
    countryMap,
    revenueProjection,
    shippingLanes,
    type Aggregates,
    type ModelTables,
    type ResultTable,
} from "@/data/model";

/** The shape BicChartPanel reads. */
export interface TableResult {
    data?: { status: "success"; table: ResultTable };
    isLoading: boolean;
    error?: Error;
}

type Loaded = { status: "loading" } | { status: "error"; error: Error } | { status: "ready"; tables: ModelTables };

/** Loads the CSVs once and derives the three chart tables; `selectedCountries` narrows the projection. */
export function useModelTables(selectedCountries: readonly string[]) {
    const [loaded, setLoaded] = useState<Loaded>({ status: "loading" });
    useEffect(() => {
        let live = true;
        loadModel().then(
            (tables) => {
                if (live) setLoaded({ status: "ready", tables });
            },
            (e: unknown) => {
                if (live) setLoaded({ status: "error", error: e instanceof Error ? e : new Error(String(e)) });
            },
        );
        return () => {
            live = false;
        };
    }, []);

    const agg = useMemo(() => (loaded.status === "ready" ? aggregate(loaded.tables) : undefined), [loaded]);
    // A string stands in for the array so an equal selection keeps the same result objects.
    const key = selectedCountries.join(",");

    return useMemo(() => {
        const wrap = (build: (t: ModelTables, a: Aggregates) => ResultTable): TableResult => {
            if (loaded.status === "error") return { isLoading: false, error: loaded.error };
            if (loaded.status !== "ready" || !agg) return { isLoading: true };
            return { isLoading: false, data: { status: "success", table: build(loaded.tables, agg) } };
        };
        return {
            countries: wrap((t, a) => countryMap(t, a)),
            lanes: wrap((t) => shippingLanes(t)),
            projection: wrap((t, a) => revenueProjection(t, a, key ? key.split(",") : [])),
        };
    }, [loaded, agg, key]);
}
