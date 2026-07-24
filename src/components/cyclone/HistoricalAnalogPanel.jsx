import React, { useMemo } from 'react';
import { categorizeCyclone } from '../../lib/cycloneCategories';

export default function HistoricalAnalogPanel({ currentSST, currentPressure, currentWind, summaryData }) {
    const analogs = useMemo(() => {
        if (!summaryData || summaryData.length === 0) return [];

        const scored = summaryData
            .filter(s => s.name !== 'UNNAMED')
            .map(storm => {
                const windKts = (storm.max_wind_kmh || 0) / 3.6;
                let score = 100
                    - Math.abs((currentPressure || 1013) - (storm.min_pressure_mb || 1013)) * 0.3
                    - Math.abs((currentWind || 0) - windKts) * 0.5;
                score = Math.max(0, Math.round(score));
                return { ...storm, similarity: score, cat: categorizeCyclone(storm.max_wind_kmh) };
            });

        scored.sort((a, b) => b.similarity - a.similarity);
        return scored.slice(0, 3);
    }, [currentSST, currentPressure, currentWind, summaryData]);

    return (
        <div className="card">
            <div className="text-[var(--color-accent)] text-xs font-bold uppercase tracking-wider mb-3">Top Historical Analogs</div>
            <div className="flex flex-col gap-2">
                {analogs.map((storm, i) => (
                    <div key={storm.SID || i}
                        className="bg-[var(--color-abyss-950)] border border-[var(--color-abyss-800)] rounded-lg p-3 border-l-4 transition-all hover:bg-[var(--color-abyss-900)]"
                        style={{ borderLeftColor: storm.cat.color }}
                    >
                        <div className="flex justify-between items-start">
                            <div>
                                <div className="text-[var(--color-abyss-100)] font-bold text-sm">{storm.name}</div>
                                <div className="text-[var(--color-abyss-400)] text-xs mt-0.5">{Math.floor(storm.season)} — {storm.cat.label}</div>
                            </div>
                            <div className="text-[var(--color-accent)] font-bold text-sm">{storm.similarity}%</div>
                        </div>
                        <div className="flex gap-3 mt-2 text-xs text-[var(--color-abyss-400)]">
                            <span>💨 {Math.round(storm.max_wind_kmh)} km/h</span>
                            <span>📉 {storm.min_pressure_mb} mb</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
