import { useState, useEffect, useCallback, useMemo } from 'react';

/**
 * useFisheriesData
 * Custom hook to handle fisheries intelligence data fetching and processing.
 */
export function useFisheriesData(region = '') {
    const [data, setData] = useState(null);
    const [comparisonData, setComparisonData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [simulate, setSimulate] = useState(false);

    const toggleSimulate = useCallback(() => {
        setSimulate(prev => !prev);
    }, []);

    const fetchRegionData = useCallback(async (targetRegion, isSimulate = false) => {
        const queryParams = new URLSearchParams();
        if (targetRegion) queryParams.append('region', targetRegion);
        if (isSimulate) queryParams.append('simulate', 'true');

        const url = `/api/fisheries${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Failed to fetch fisheries data for ${targetRegion || 'All'}`);
        return await res.json();
    }, []);

    const refresh = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const mainResult = await fetchRegionData(region, simulate);
            setData(mainResult);

            // Fetch all regions for comparison in background if not already loaded (without simulation for comparison)
            const regions = ['North Indian Ocean', 'Bay of Bengal', 'Indian Ocean'];
            const compResults = await Promise.all(
                regions.map(r => fetchRegionData(r, false))
            );
            setComparisonData(compResults);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [region, simulate, fetchRegionData]);

    useEffect(() => {
        refresh();
    }, [refresh]);

    // Process data for the dashboard
    const processedData = useMemo(() => {
        if (!data || !data.species) return null;

        const species = data.species.map(s => {
            const utilization = (s.current_catch_tonnes / s.msy_tonnes) * 100;
            let overfishingStatus = 'Sustainable';
            let riskColor = '#10b981'; // Green

            if (utilization > 95) {
                overfishingStatus = 'Severe Overfishing';
                riskColor = '#ef4444'; // Red
            } else if (utilization > 80) {
                overfishingStatus = 'High Risk';
                riskColor = '#f59e0b'; // Amber
            } else if (utilization > 60) {
                overfishingStatus = 'Moderate';
                riskColor = '#6366f1'; // Indigo/Blue
            }

            // Stock health color
            let healthColor = '#10b981';
            if (s.stock_health_percent < 30) healthColor = '#ef4444';
            else if (s.stock_health_percent < 50) healthColor = '#f97316'; // Orange
            else if (s.stock_health_percent < 70) healthColor = '#eab308'; // Yellow

            return {
                ...s,
                utilization,
                overfishingStatus,
                riskColor,
                healthColor
            };
        });

        // Smart Alert Prioritization
        const smartAlerts = [...species].map(s => {
            let priority = 'LOW';
            let severityScore = 0;

            if (s.protected && s.stock_health_percent < 50) {
                priority = 'HIGH';
                severityScore = 100;
            } else if (s.utilization > 90) {
                priority = 'MEDIUM';
                severityScore = 80;
            } else if (s.trend === 'Critical') {
                priority = 'MEDIUM';
                severityScore = 70;
            }

            return {
                ...s,
                priority,
                severityScore,
                message: `${s.species}: ${s.protected ? 'Protected' : s.trend} status. ${s.overfishingStatus}.`
            };
        }).filter(a => a.severityScore > 0)
            .sort((a, b) => b.severityScore - a.severityScore);

        // Normalize schema for UI Components
        return {
            ...data,
            species,
            smartAlerts,
            // Mapping for UI components expecting old keys
            future_projection: data.future_projection ? {
                index_6_month: data.future_projection.index_6_month,
                change: data.future_projection.change,
                direction: data.future_projection.change > 0 ? "Improving" : data.future_projection.change < 0 ? "Declining" : "Stable"
            } : null,
            climate_stress: data.climate_stress ? {
                sst_avg: data.climate_stress.sst,
                level: data.climate_stress.score >= 90 ? "High" : data.climate_stress.score >= 60 ? "Moderate" : "Low"
            } : null,
            critical_species_count: data.critical_species_count || 0,
            overfishedCount: data.overfishedCount || 0,
            avgMsyUtilization: data.msy_utilization || 0,
            collapse_risk: data.collapse_risk || { score: 0, level: 'Unknown' },
            risk_attribution: data.risk_attribution,
            model_confidence: data.model_confidence,
            simulation: data.simulation,
        };
    }, [data]);

    return {
        data: processedData,
        comparisonData,
        loading,
        error,
        refresh,
        simulate,
        toggleSimulate
    };
}
