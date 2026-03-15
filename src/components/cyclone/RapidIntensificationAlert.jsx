import React, { useMemo } from 'react';

export default function RapidIntensificationAlert({ summaryData }) {
    const riEvent = useMemo(() => {
        if (!summaryData || summaryData.length < 2) return null;

        // Sort by season descending to find most recent
        const sorted = [...summaryData].sort((a, b) => b.season - a.season);

        // Group by season and find max wind delta between storms in same season
        const seasonMap = {};
        sorted.forEach(s => {
            const yr = Math.floor(s.season);
            if (!seasonMap[yr]) seasonMap[yr] = [];
            seasonMap[yr].push(s);
        });

        let bestDelta = 0;
        let bestStorm = null;

        for (const [, storms] of Object.entries(seasonMap)) {
            if (storms.length < 2) continue;
            storms.sort((a, b) => b.max_wind_kmh - a.max_wind_kmh);
            for (let i = 0; i < storms.length - 1; i++) {
                const delta = storms[i].max_wind_kmh - storms[i + 1].max_wind_kmh;
                if (delta >= 30 && delta > bestDelta) {
                    bestDelta = Math.round(delta);
                    bestStorm = storms[i];
                }
            }
        }

        if (bestStorm && bestDelta >= 30) {
            return { name: bestStorm.name, delta: bestDelta, season: Math.floor(bestStorm.season) };
        }
        return null;
    }, [summaryData]);

    if (riEvent) {
        return (
            <div className="bg-slate-900 border border-red-500/30 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                    <span className="inline-block w-3 h-3 rounded-full bg-red-500 animate-pulse" />
                    <span className="text-red-400 text-xs font-bold uppercase tracking-wider">Rapid Intensification Detected</span>
                </div>
                <div className="text-white text-sm font-semibold">
                    ⚠ RAPID INTENSIFICATION — {riEvent.name !== 'UNNAMED' ? riEvent.name : 'Unknown Storm'} +{riEvent.delta} km/h — {riEvent.season}
                </div>
            </div>
        );
    }

    return (
        <div className="bg-slate-900 border border-green-500/30 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
                <span className="inline-block w-3 h-3 rounded-full bg-green-500" />
                <span className="text-green-400 text-xs font-bold uppercase tracking-wider">Conditions Stable</span>
            </div>
            <div className="text-slate-300 text-sm">
                ✓ CONDITIONS STABLE — No Rapid Intensification Detected
            </div>
        </div>
    );
}
