import { csvParse } from "d3";
import type { ModelTables, Row } from "@/data/model";

export const DATA_BASE_URL =
    import.meta.env.VITE_DATA_BASE_URL ??
    "https://raw.githubusercontent.com/codexguy/bicharts/main/examples/fabric-app/data";

async function table(base: string, name: string): Promise<Row[]> {
    const url = `${base.replace(/\/$/, "")}/${name}.csv`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Could not load ${name}.csv (${res.status} ${res.statusText})`);
    return csvParse(await res.text()) as unknown as Row[];
}

/** Fetches the CSV tables the page needs, in parallel. */
export async function loadModel(base: string = DATA_BASE_URL): Promise<ModelTables> {
    const [country, date, sales, shipments, target] = await Promise.all([
        table(base, "DimCountry"),
        table(base, "DimDate"),
        table(base, "FactSales"),
        table(base, "FactShipments"),
        table(base, "FactRevenueTarget"),
    ]);
    return { country, date, sales, shipments, target };
}
