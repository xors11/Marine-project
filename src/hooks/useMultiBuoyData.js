import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchBuoyData } from '../services/api';

export const BUOYS = [
    {
        id: 'rama-23003',
        name: 'RAMA 23003',
        lat: -2,
        lng: 81,
        region: 'Indian Ocean',
        label: '2°S 81°E'
    },
    {
        id: 'north-indian',
        name: 'North Indian Ocean',
        lat: 12,
        lng: 65,
        region: 'Arabian Sea',
        label: '12°N 65°E'
    },
    {
        id: 'bay-of-bengal',
        name: 'Bay of Bengal',
        lat: 10,
        lng: 88,
        region: 'Bay of Bengal',
        label: '10°N 88°E'
    }
];

const REFRESH_INTERVAL_MS = 5 * 60 * 1000;

export default function useMultiBuoyData() {
    const [buoyData, setBuoyData] = useState({});
    const [loading, setLoading] = useState(true);
    const [lastUpdated, setLastUpdated] = useState(null);
    const [countdown, setCountdown] = useState(300);
    const timerRef = useRef(null);
    const pausedRef = useRef(false);
    const countdownRef = useRef(300);
    const lastUpdatedRef = useRef(null);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const results = await Promise.all(
                BUOYS.map(b =>
                    fetchBuoyData(b.lat, b.lng).catch(err => {
                        console.error(`Failed to fetch ${b.name}:`, err);
                        return [];
                    })
                )
            );

            const newData = {};
            results.forEach((rows, index) => {
                const b = BUOYS[index];
                const lastRow = rows.length > 0 ? rows[rows.length - 1] : {};

                newData[b.id] = {
                    ...b,
                    sst: lastRow.sea_surface_temp ?? null,
                    wind: lastRow.wind_speed ?? null,
                    pressure: lastRow.air_pressure ?? null,
                    wave: lastRow.wave_height ?? null,
                    history: rows
                };
            });

            setBuoyData(newData);
            const now = new Date();
            setLastUpdated(now);
            lastUpdatedRef.current = now;
            countdownRef.current = 300;
            setCountdown(300);
            console.log(`[LIVE ${now.toLocaleTimeString()}] Data refreshed · SST: ${Object.values(newData)[0]?.sst?.toFixed(1)}°C · Wind: ${Object.values(newData)[0]?.wind?.toFixed(1)}m/s`);
        } catch (err) {
            console.error('Multi-buoy fetch failed', err);
        } finally {
            setLoading(false);
        }
    }, []);

    const tick = useCallback(() => {
        if (!pausedRef.current) fetchData();
    }, [fetchData]);

    useEffect(() => {
        fetchData();
        timerRef.current = setInterval(tick, REFRESH_INTERVAL_MS);

        const handleVisibility = () => {
            if (!document.hidden && lastUpdatedRef.current) {
                const elapsed = Date.now() - lastUpdatedRef.current.getTime();
                if (elapsed > 5 * 60 * 1000) {
                    console.log('[LIVE] Tab refocused, data stale — refreshing...');
                    fetchData();
                }
            }
        };
        document.addEventListener('visibilitychange', handleVisibility);

        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
            document.removeEventListener('visibilitychange', handleVisibility);
        };
    }, [fetchData, tick]);

    // 1-second countdown ticker
    useEffect(() => {
        const cd = setInterval(() => {
            countdownRef.current = Math.max(0, countdownRef.current - 1);
            setCountdown(countdownRef.current);
        }, 1000);
        return () => clearInterval(cd);
    }, []);

    const pauseRefresh = useCallback(() => {
        pausedRef.current = true;
    }, []);

    const resumeRefresh = useCallback(() => {
        pausedRef.current = false;
        fetchData();
    }, [fetchData]);

    const getBuoyById = useCallback((id) => BUOYS.find(b => b.id === id), []);

    const getRegionalSummary = useCallback(() => {
        const validBuoys = Object.values(buoyData).filter(b => b.sst != null && b.wind != null && b.pressure != null);
        if (validBuoys.length === 0) return null;

        let sstSum = 0, windSum = 0, pSum = 0;
        let maxWind = -Infinity, minPressure = Infinity;
        let hottestBuoy = validBuoys[0], windiestBuoy = validBuoys[0], lowestPressureBuoy = validBuoys[0];

        validBuoys.forEach(b => {
            sstSum += b.sst;
            windSum += b.wind;
            pSum += b.pressure;

            if (b.wind > maxWind) { maxWind = b.wind; windiestBuoy = b; }
            if (b.pressure < minPressure) { minPressure = b.pressure; lowestPressureBuoy = b; }
            if (b.sst > (hottestBuoy?.sst ?? -Infinity)) { hottestBuoy = b; }
        });

        return {
            avgSST: sstSum / validBuoys.length,
            avgWind: windSum / validBuoys.length,
            avgPressure: pSum / validBuoys.length,
            maxWind,
            minPressure,
            hottestBuoy,
            windiestBuoy,
            lowestPressureBuoy
        };
    }, [buoyData]);

    return {
        buoyData,
        loading,
        lastUpdated,
        countdown,
        BUOYS,
        getBuoyById,
        getRegionalSummary,
        refetch: fetchData,
        pauseRefresh,
        resumeRefresh
    };
}
