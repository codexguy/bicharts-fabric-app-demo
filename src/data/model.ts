// The semantic model's numbers, computed from its CSV tables. Each function mirrors a measure in the model:
//   Revenue = sum(RevenueUSD), Orders = sum(OrderCount), Returns = sum(ReturnCount),
//   Return Rate % = Returns / Orders, Revenue per Capita = Revenue / Population (of the countries in context),
//   Revenue Target = sum(TargetRevenueUSD), Units Shipped = sum(UnitsShipped).

export type Row = Record<string, string>;

export interface ModelTables {
    country: Row[];
    date: Row[];
    sales: Row[];
    shipments: Row[];
    target: Row[];
}

/** The shape the chart panel and the generated chart components read: { columns: [{ name }], rows: [[...]] }. */
export interface ResultTable {
    columns: { name: string }[];
    rows: unknown[][];
}

type CountryTotals = { revenue: number; orders: number; returns: number };
type MonthCell = { revenue: number; target: number };

export interface Aggregates {
    /** Per country: revenue, orders and returns over the whole period. */
    countries: Map<string, CountryTotals>;
    /** Per country then month (ISO date): revenue and target. */
    months: Map<string, Map<string, MonthCell>>;
}

const num = (v: string | undefined) => (v === undefined || v === "" ? 0 : Number(v));

/** One pass over the fact tables; everything the three charts need derives from this. */
export function aggregate(t: Pick<ModelTables, "sales" | "target">): Aggregates {
    const countries = new Map<string, CountryTotals>();
    const months = new Map<string, Map<string, MonthCell>>();
    const cell = (country: string, month: string) => {
        let byMonth = months.get(country);
        if (!byMonth) months.set(country, (byMonth = new Map()));
        let c = byMonth.get(month);
        if (!c) byMonth.set(month, (c = { revenue: 0, target: 0 }));
        return c;
    };
    for (const r of t.sales) {
        const code = r.CountryCode;
        let a = countries.get(code);
        if (!a) countries.set(code, (a = { revenue: 0, orders: 0, returns: 0 }));
        const revenue = num(r.RevenueUSD);
        a.revenue += revenue;
        a.orders += num(r.OrderCount);
        a.returns += num(r.ReturnCount);
        cell(code, r.MonthStart).revenue += revenue;
    }
    for (const r of t.target) cell(r.CountryCode, r.MonthStart).target += num(r.TargetRevenueUSD);
    return { countries, months };
}

/** One row per country: revenue per inhabitant and the share of orders returned. */
export function countryMap(t: Pick<ModelTables, "country">, agg: Aggregates): ResultTable {
    const rows: unknown[][] = [];
    for (const c of [...t.country].sort((a, b) => a.CountryCode.localeCompare(b.CountryCode))) {
        const a = agg.countries.get(c.CountryCode);
        if (!a) continue;
        const population = num(c.Population);
        rows.push([
            c.CountryCode,
            c.Country,
            population ? a.revenue / population : null,
            a.orders ? a.returns / a.orders : null,
        ]);
    }
    return {
        columns: [{ name: "CountryCode" }, { name: "Country" }, { name: "RevenuePerCapita" }, { name: "ReturnRate" }],
        rows,
    };
}

const SEP = "|";

/** One row per origin-destination pair, largest flow first. */
export function shippingLanes(t: Pick<ModelTables, "country" | "shipments">): ResultTable {
    const byCode = new Map(t.country.map((c) => [c.CountryCode, c]));
    const flows = new Map<string, number>();
    for (const r of t.shipments) {
        const key = r.OriginCountryCode + SEP + r.DestinationCountryCode;
        flows.set(key, (flows.get(key) ?? 0) + num(r.UnitsShipped));
    }
    const rows: unknown[][] = [];
    for (const [key, units] of flows) {
        const [from, to] = key.split(SEP);
        const o = byCode.get(from);
        const d = byCode.get(to);
        if (!o || !d) continue;
        rows.push([
            from, o.Country, num(o.Latitude), num(o.Longitude),
            to, d.Country, num(d.Latitude), num(d.Longitude),
            units,
        ]);
    }
    rows.sort((a, b) => (b[8] as number) - (a[8] as number));
    return {
        columns: [
            "OriginCountryCode", "OriginCountry", "OriginLatitude", "OriginLongitude",
            "DestinationCountryCode", "DestinationCountry", "DestinationLatitude", "DestinationLongitude",
            "UnitsShipped",
        ].map((name) => ({ name })),
        rows,
    };
}

/** One row per month: revenue and target, for the selected countries (all of them when none is selected). */
export function revenueProjection(
    t: Pick<ModelTables, "date">,
    agg: Aggregates,
    selected: readonly string[],
): ResultTable {
    const codes = selected.length ? selected : [...agg.months.keys()];
    const rows: unknown[][] = [];
    for (const d of [...t.date].sort((a, b) => a.MonthStart.localeCompare(b.MonthStart))) {
        let revenue = 0;
        let target = 0;
        let seen = false;
        for (const code of codes) {
            const c = agg.months.get(code)?.get(d.MonthStart);
            if (!c) continue;
            seen = true;
            revenue += c.revenue;
            target += c.target;
        }
        if (seen) rows.push([`${d.MonthStart}T00:00:00`, revenue, target]);
    }
    return { columns: [{ name: "MonthStart" }, { name: "Revenue" }, { name: "RevenueTarget" }], rows };
}
