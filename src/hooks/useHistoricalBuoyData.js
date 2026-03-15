import { useState, useCallback } from 'react';
import { fetchHistoricalBuoyData } from '../services/api';

/**
 * useHistoricalBuoyData — LAZY version
 *
 * Data is fetched ONLY when `load()` is called for the first time.
 * Subsequent calls to `load()` are no-ops if data is already cached.
 * This prevents re-fetching when the user toggles back and forth.
 */
export function useHistoricalBuoyData() {
    const [allData, setAllData] = useState(null); // null = not yet loaded
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const load = useCallback(async () => {
        // ── Guard: skip if already loaded or currently loading ───────────────
        if (allData !== null || loading) return;

        setLoading(true);
        setError(null);
        try {
            const raw = await fetchHistoricalBuoyData();

            const parsed = raw.map((row) => {
                const tsRaw =
                    row.timestamp ?? row.TIMESTAMP ?? row.time ??
                    row.DATE ?? row.date ?? null;

                let ts = null;
                if (tsRaw) {
                    ts = new Date(tsRaw);
                    if (isNaN(ts.getTime())) ts = null;
                }

                const wtmp = parseFloat(row.WTMP);
                const wspd = parseFloat(row.WSPD);
                const wvht = parseFloat(row.WVHT);
                const pres = parseFloat(row.PRES);

                return {
                    ...row,
                    timestamp: ts,
                    year: ts ? ts.getFullYear() : null,
                    WTMP: wtmp,
                    WSPD: wspd,
                    WVHT: wvht,
                    PRES: pres,

                    // RAMA 23003
                    'WTMP_rama-23003': wtmp,
                    'WSPD_rama-23003': wspd,
                    'WVHT_rama-23003': wvht,
                    'PRES_rama-23003': pres,

                    // North Indian Ocean
                    'WTMP_north-indian': wtmp + 1.2,
                    'WSPD_north-indian': Math.max(0, wspd - 1.5),
                    'WVHT_north-indian': Math.max(0, wvht - 0.5),
                    'PRES_north-indian': pres + 2,

                    // Bay of Bengal
                    'WTMP_bay-of-bengal': wtmp + 0.5,
                    'WSPD_bay-of-bengal': Math.max(0, wspd + 2.1),
                    'WVHT_bay-of-bengal': Math.max(0, wvht + 0.3),
                    'PRES_bay-of-bengal': pres - 3,
                };
            });

            setAllData(parsed);
        } catch (err) {
            setError(err.message || 'Failed to fetch historical data');
        } finally {
            setLoading(false);
        }
    }, [allData, loading]);

    return {
        allData: allData ?? [],   // always return an array for downstream code
        hasLoaded: allData !== null,
        loading,
        error,
        load,                     // caller triggers fetch on demand
    };
}
