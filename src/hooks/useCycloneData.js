import { useState, useEffect, useCallback, useRef } from 'react';

const REFRESH_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

export function useCycloneData() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [simulation, setSimulation] = useState(false);
    const timerRef = useRef(null);

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            const [summaryRes, riskRes, tracksRes, liveRiskRes, summaryRawRes] = await Promise.all([
                fetch(`/api/cyclones/summary`),
                fetch(`/api/cyclones/risk${simulation ? '?simulate=sst_increase' : ''}`),
                fetch(`/api/cyclones/tracks`),
                fetch(`/api/cyclone-risk`),
                fetch(`/api/cyclones/summary-raw`)
            ]);

            if (!summaryRes.ok || !riskRes.ok || !tracksRes.ok) {
                throw new Error("Failed to load Cyclone data from server.");
            }

            const summary = await summaryRes.json();
            const risk = await riskRes.json();
            const tracks = await tracksRes.json();
            const liveRisk = liveRiskRes.ok ? await liveRiskRes.json() : null;
            const summaryRaw = summaryRawRes.ok ? await summaryRawRes.json() : [];

            setData({ summary, risk, tracks, simulation, liveRisk, summaryRaw });
            setLoading(false);
        } catch (err) {
            console.error("useCycloneData error:", err);
            setError(err.message || 'Error loading cyclone intelligence');
            setLoading(false);
        }
    }, [simulation]);

    useEffect(() => {
        fetchData();
        // Set up auto-refresh for live risk data
        timerRef.current = setInterval(fetchData, REFRESH_INTERVAL_MS);
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [fetchData]);

    const toggleSimulation = () => {
        setSimulation(prev => !prev);
    };

    return {
        data,
        loading,
        error,
        toggleSimulation,
        refetch: fetchData
    };
}
