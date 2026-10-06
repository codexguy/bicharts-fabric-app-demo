import { useState } from "react";
import {
    useBicControls,
    useBicFilter,
    BicFilterChips,
    noteBadges,
    notesFor,
    badgeKey,
} from "@bicharts/chart-host/react";

import { BicChartPanel } from "@/components/bic-chart-panel";
import { NotesDialog } from "@/components/bic-notes-dialog";
import { ScenariosPanel } from "@/components/bic-scenarios-panel";
import { useAppTheme } from "@/hooks/use-theme";
import { useAuthorName } from "@/hooks/use-author-name";
import { useModelTables } from "@/data/use-model";
import { useBicChartOptions } from "@/lib/bic-chart-options";
import { useMarkNotes } from "@/lib/bic-notes";
import { BivariateWorldChoroplethChart, rowsFromTable } from "@/charts/country-map/chart.component";
import { OriginDestinationFlowMapChart } from "@/charts/shipping-lanes/chart.component";
import { WhatIfProjectionChart } from "@/charts/revenue-projection/chart.component";

const COUNTRY_NOTES = { chart: "country-map", columns: "CountryCode" } as const;
const LANE_NOTES = {
    chart: "shipping-lanes",
    columns: ["OriginCountryCode", "DestinationCountryCode"],
} as const;

type OpenNotes = {
    chart: string;
    columns: string | readonly string[];
    key: readonly string[];
    title: string;
};

function Card({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
    return (
        <section className="flex min-h-0 min-w-0 flex-col rounded-lg border border-border bg-card p-4">
            <h2 className="text-base font-semibold text-foreground">{title}</h2>
            <p className="mb-3 text-sm text-muted-foreground">{subtitle}</p>
            {children}
        </section>
    );
}

function AddNote({ label, onClick }: { label: string | null; onClick: () => void }) {
    return (
        <button
            type="button"
            disabled={!label}
            onClick={onClick}
            className="mb-2 self-start rounded-lg border border-border px-3 py-1.5 text-sm font-medium disabled:opacity-50"
        >
            {label ? `Add a note on ${label}` : "Select a mark to add a note"}
        </button>
    );
}

function App() {
    const { isDark, toggleTheme } = useAppTheme();
    const options = useBicChartOptions();
    const country = useBicFilter("CountryCode", { label: "Country", display: "Country" });
    const lane = useBicFilter(["OriginCountryCode", "DestinationCountryCode"], {
        label: "Lane",
        display: ["OriginCountry", "DestinationCountry"],
    });
    const scenario = useBicControls();
    const [author, setAuthor] = useAuthorName();
    const { notes, add } = useMarkNotes(author);
    const [open, setOpen] = useState<OpenNotes | null>(null);

    const { countries, lanes, projection } = useModelTables(country.keys.map(String));

    const countryRows = countries.data?.status === "success" ? rowsFromTable(countries.data.table) : [];

    return (
        <main className="flex min-h-screen flex-col gap-4 bg-background p-4 text-foreground">
            <header className="flex flex-wrap items-center justify-between gap-2">
                <div>
                    <h1 className="text-xl font-semibold">Global Revenue</h1>
                    <p className="text-sm text-muted-foreground">
                        Click a country on the map to filter the shipping lanes and the revenue projection. Select a
                        country or a lane to leave a note on it. Notes and scenarios are kept in this browser only.
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <BicFilterChips />
                    <label className="flex items-center gap-2 text-sm">
                        Your name
                        <input
                            value={author}
                            onChange={(e) => setAuthor(e.target.value)}
                            maxLength={80}
                            placeholder="Anonymous"
                            className="w-36 rounded-lg border border-border bg-card px-2 py-1.5"
                        />
                    </label>
                    <button
                        type="button"
                        onClick={toggleTheme}
                        aria-pressed={isDark}
                        className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium"
                    >
                        {isDark ? "Light mode" : "Dark mode"}
                    </button>
                </div>
            </header>

            <div className="grid min-w-0 grid-cols-1 gap-4 xl:grid-cols-2">
                <Card
                    title="Revenue per capita vs return rate"
                    subtitle="Each country by revenue per inhabitant (USD) and share of orders returned"
                >
                    <AddNote
                        label={country.active ? country.text : null}
                        onClick={() =>
                            setOpen({ ...COUNTRY_NOTES, key: [String(country.keys[0])], title: country.text })
                        }
                    />
                    <BicChartPanel
                        result={countries}
                        minChartWidth={560}
                        minChartHeight={320}
                        onClearFilters={country.clear}
                    >
                        {(table, size) => (
                            <BivariateWorldChoroplethChart
                                table={table}
                                {...size}
                                options={options}
                                selects={country}
                                annotations={noteBadges(notes, COUNTRY_NOTES)}
                                onAnnotationClick={(a) => {
                                    const key = badgeKey(a);
                                    setOpen({
                                        ...COUNTRY_NOTES,
                                        key: [String(key)],
                                        title: country.textOf(key, countryRows) || String(key),
                                    });
                                }}
                            />
                        )}
                    </BicChartPanel>
                </Card>

                <Card
                    title="Shipping lanes"
                    subtitle="Units shipped from origin to destination country; shows lanes touching the selected country"
                >
                    <AddNote
                        label={lane.active ? lane.text : null}
                        onClick={() => setOpen({ ...LANE_NOTES, key: lane.keys.map(String), title: lane.text })}
                    />
                    <BicChartPanel
                        result={lanes}
                        minChartWidth={560}
                        minChartHeight={320}
                        onClearFilters={country.clear}
                    >
                        {(table, size) => (
                            <OriginDestinationFlowMapChart
                                table={table}
                                {...size}
                                options={options}
                                selects={lane}
                                filterBy={{
                                    filter: country,
                                    columns: ["OriginCountryCode", "DestinationCountryCode"],
                                }}
                                annotations={noteBadges(notes, LANE_NOTES)}
                                onAnnotationClick={(a) => {
                                    const key = (badgeKey(a) as unknown as unknown[]).map(String);
                                    setOpen({ ...LANE_NOTES, key, title: key.join(" → ") });
                                }}
                            />
                        )}
                    </BicChartPanel>
                </Card>
            </div>

            <Card
                title="Revenue projection"
                subtitle="Steer the growth rate in the chart to compare projected revenue with the target, and save a setting as a named scenario"
            >
                <BicChartPanel
                    result={projection}
                    minChartWidth={560}
                    minChartHeight={340}
                    onClearFilters={country.clear}
                >
                    {(table, size) => (
                        <WhatIfProjectionChart table={table} {...size} options={options} controls={scenario} />
                    )}
                </BicChartPanel>
                <ScenariosPanel chart="revenue-projection" controls={scenario} author={author} />
            </Card>

            {open ? (
                <NotesDialog
                    title={open.title}
                    notes={notesFor(notes, open.key, { chart: open.chart, columns: open.columns })}
                    onAdd={(body) => add(open.chart, open.key, body)}
                    onClose={() => setOpen(null)}
                />
            ) : null}
        </main>
    );
}

export default App;
