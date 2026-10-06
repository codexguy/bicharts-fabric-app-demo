import { readFileSync } from "node:fs";
import { join } from "node:path";
import { csvParse } from "d3";
import { describe, expect, it } from "vitest";
import { aggregate, countryMap, revenueProjection, shippingLanes, type ModelTables, type Row } from "@/data/model";

const tiny: ModelTables = {
    country: [
        { CountryCode: "AAA", Country: "Alpha", Population: "1000", Latitude: "1", Longitude: "2" },
        { CountryCode: "BBB", Country: "Beta", Population: "500", Latitude: "3", Longitude: "4" },
    ],
    date: [{ MonthStart: "2020-02-01" }, { MonthStart: "2020-01-01" }],
    sales: [
        { MonthStart: "2020-01-01", CountryCode: "AAA", RevenueUSD: "100", OrderCount: "10", ReturnCount: "1" },
        { MonthStart: "2020-01-01", CountryCode: "AAA", RevenueUSD: "50", OrderCount: "10", ReturnCount: "3" },
        { MonthStart: "2020-02-01", CountryCode: "BBB", RevenueUSD: "25", OrderCount: "5", ReturnCount: "0" },
    ],
    shipments: [
        { OriginCountryCode: "AAA", DestinationCountryCode: "BBB", UnitsShipped: "7" },
        { OriginCountryCode: "AAA", DestinationCountryCode: "BBB", UnitsShipped: "3" },
        { OriginCountryCode: "BBB", DestinationCountryCode: "AAA", UnitsShipped: "20" },
    ],
    target: [
        { MonthStart: "2020-01-01", CountryCode: "AAA", TargetRevenueUSD: "200" },
        { MonthStart: "2020-02-01", CountryCode: "BBB", TargetRevenueUSD: "40" },
    ],
};

describe("model calculations", () => {
    const agg = aggregate(tiny);

    it("revenue per capita and return rate per country", () => {
        expect(countryMap(tiny, agg).rows).toEqual([
            ["AAA", "Alpha", 0.15, 4 / 20],
            ["BBB", "Beta", 0.05, 0],
        ]);
    });

    it("sums units per lane and sorts the largest first", () => {
        const rows = shippingLanes(tiny).rows;
        expect(rows.map((r) => [r[0], r[4], r[8]])).toEqual([
            ["BBB", "AAA", 20],
            ["AAA", "BBB", 10],
        ]);
    });

    it("projects months in order and narrows to the selected countries", () => {
        expect(revenueProjection(tiny, agg, []).rows).toEqual([
            ["2020-01-01T00:00:00", 150, 200],
            ["2020-02-01T00:00:00", 25, 40],
        ]);
        expect(revenueProjection(tiny, agg, ["BBB"]).rows).toEqual([["2020-02-01T00:00:00", 25, 40]]);
    });
});

// Compares against the numbers the semantic model itself returned. Needs the model's CSV files and the model's
// results saved as CSV: DATA_DIR=<csv folder> EXPECTED_DIR=<folder with country-map.csv, shipping-lanes.csv,
// revenue-projection.csv> npx vitest run
const dataDir = process.env.DATA_DIR;
const expectedDir = process.env.EXPECTED_DIR;

describe.skipIf(!dataDir || !expectedDir)("matches the semantic model's own results", () => {
    const read = (dir: string, name: string) =>
        csvParse(readFileSync(join(dir, `${name}.csv`), "utf8")) as unknown as Row[];
    const tables = (): ModelTables => ({
        country: read(dataDir!, "DimCountry"),
        date: read(dataDir!, "DimDate"),
        sales: read(dataDir!, "FactSales"),
        shipments: read(dataDir!, "FactShipments"),
        target: read(dataDir!, "FactRevenueTarget"),
    });
    const close = (a: unknown, b: number) => {
        expect(typeof a).toBe("number");
        expect(Math.abs((a as number) - b)).toBeLessThanOrEqual(Math.abs(b) * 1e-9 + 1e-9);
    };

    it("country map", () => {
        const t = tables();
        const got = countryMap(t, aggregate(t));
        const want = read(expectedDir!, "country-map");
        expect(got.rows).toHaveLength(want.length);
        got.rows.forEach((r, i) => {
            expect(r[0]).toBe(want[i].CountryCode);
            expect(r[1]).toBe(want[i].Country);
            close(r[2], Number(want[i].RevenuePerCapita));
            close(r[3], Number(want[i].ReturnRate));
        });
    });

    it("shipping lanes", () => {
        const got = shippingLanes(tables());
        const want = read(expectedDir!, "shipping-lanes");
        expect(got.rows).toHaveLength(want.length);
        const key = (a: unknown, b: unknown) => `${a}>${b}`;
        const wantUnits = new Map(want.map((w) => [key(w.OriginCountryCode, w.DestinationCountryCode), Number(w.UnitsShipped)]));
        for (const r of got.rows) expect(r[8]).toBe(wantUnits.get(key(r[0], r[4])));
    });

    it("revenue projection, all countries", () => {
        const t = tables();
        const got = revenueProjection(t, aggregate(t), []);
        const want = read(expectedDir!, "revenue-projection");
        expect(got.rows).toHaveLength(want.length);
        got.rows.forEach((r, i) => {
            expect((r[0] as string).slice(0, 10)).toBe(want[i].MonthStart.slice(0, 10));
            close(r[1], Number(want[i].Revenue));
            expect(r[2]).toBe(Number(want[i].RevenueTarget));
        });
    });
});
