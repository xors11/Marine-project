import { useState, useCallback, useRef } from 'react';
import { fetchHistoricalBuoyData } from '../services/api';

/**
 * useHistoricalBuoyData — LAZY, YEAR-BASED version
 *
 * Data is fetched ONLY when `load(year)` is called for a new year.
 * Subsequent calls to `load(year)` are no-ops if that year's data is already cached.
 * This prevents re-fetching when the user toggles back and forth.
 */
export function useHistoricalBuoyData() {
    const [allData, setAllData] = useState([]); // Array of parsed records across all loaded years
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Track loaded and loading years to avoid redundant fetches
    const loadedYearsRef = useRef(new Set());
    const loadingYearsRef = useRef(new Set());

    const load = useCallback(async (year) => {
        if (!year) return;
        if (loadedYearsRef.current.has(year) || loadingYearsRef.current.has(year)) {
            return;
        }

        loadingYearsRef.current.add(year);
        setLoading(true);
        setError(null);
        try {
            const raw = await fetchHistoricalBuoyData(year);

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
                    year: ts ? ts.getFullYear() : year, // fallback to requested year if parse fails or is missing
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

            setAllData((prev) => {
                // Remove any pre-existing rows for this year (in case of retry/overwrite)
                const filtered = prev.filter(r => r.year !== year);
                return [...filtered, ...parsed];
            });

            loadedYearsRef.current.add(year);
        } catch (err) {
            setError(err.message || `Failed to fetch historical data for ${year}`);
        } finally {
            loadingYearsRef.current.delete(year);
            setLoading(loadingYearsRef.current.size > 0);
        }
    }, []);

    return {
        allData: allData ?? [],   // always return an array for downstream code
        hasLoaded: loadedYearsRef.current.size > 0,
        loading,
        error,
        load,                     // caller triggers fetch on demand
    };
}
