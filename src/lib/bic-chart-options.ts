import { useEffect, useMemo, useState } from "react";

interface Colors {
    foreground: string;
    background: string;
    accent: string;
}

function readColors(): Colors {
    const style = getComputedStyle(document.documentElement);
    const pick = (name: string, fallback: string) => style.getPropertyValue(name).trim() || fallback;
    return {
        foreground: pick("--color-foreground", "#242424"),
        background: pick("--color-background", "#ffffff"),
        accent: pick("--color-brand-foreground", "#0f6cbd"),
    };
}

/** The page's theme colours from its CSS tokens, re-read when the `dark` class or the theme attribute changes. */
function useThemeColors(): Colors {
    const [colors, setColors] = useState(readColors);
    useEffect(() => {
        const update = () =>
            setColors((prev) => {
                const next = readColors();
                return next.foreground === prev.foreground &&
                    next.background === prev.background &&
                    next.accent === prev.accent
                    ? prev
                    : next;
            });
        update();
        const observer = new MutationObserver(update);
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class", "data-appearance"] });
        return () => observer.disconnect();
    }, []);
    return colors;
}

/**
 * Chart options from the page's theme, so every chart follows light and dark. A change here restyles the chart
 * live; it never regenerates it. The palette is left empty so each chart uses its own default colours.
 */
export function useBicChartOptions() {
    const { foreground, background, accent } = useThemeColors();
    return useMemo(
        () => ({ palette: [] as string[], themeFg: foreground, themeAccent: accent, backgroundColor: background }),
        [foreground, background, accent],
    );
}
