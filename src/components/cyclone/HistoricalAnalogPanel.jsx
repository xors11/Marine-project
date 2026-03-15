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
        <div className="bg-slate-900 border border-slate-700 rounded-xl p-4">
            <div className="text-cyan-400 text-xs font-bold uppercase tracking-wider mb-3">Top Historical Analogs</div>
            <div className="flex flex-col gap-2">
                {analogs.map((storm, i) => (
                    <div key={storm.SID || i}
                        className="bg-slate-800 rounded-lg p-3 border-l-4 transition-all hover:bg-slate-700"
                        style={{ borderColor: storm.cat.color }}
                    >
                        <div className="flex justify-between items-start">
                            <div>
                                <div className="text-white font-bold text-sm">{storm.name}</div>
                                <div className="text-slate-400 text-xs mt-0.5">{Math.floor(storm.season)} — {storm.cat.label}</div>
                            </div>
                            <div className="text-cyan-400 font-bold text-sm">{storm.similarity}%</div>
                        </div>
                        <div className="flex gap-3 mt-2 text-xs text-slate-400">
                            <span>💨 {Math.round(storm.max_wind_kmh)} km/h</span>
                            <span>📉 {storm.min_pressure_mb} mb</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
