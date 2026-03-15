import React, { useState } from 'react';

export default function SpeciesTable({ species, msyUtilizationFn, critThreshold, highThreshold }) {
    const [showAll, setShowAll] = useState(false);

    if (!species) return null;

    // STEP 9: Display worst performing species (Ascending by health)
    const sortedSpecies = [...species].sort((a, b) => a.stock_health_percent - b.stock_health_percent);

    const hasMore = sortedSpecies.length > 20;
    let displayList = sortedSpecies;

    if (hasMore && !showAll) {
        displayList = sortedSpecies.slice(0, 20);
    }

    const getHealthColor = (health) => {
        if (health < 50) return '#f87171'; // red
        if (health < 65) return '#fb923c'; // orange
        if (health < 75) return '#facc15'; // yellow
        return '#4ade80'; // green
    };

    const getStatusProps = (health) => {
        if (health < 50) return { label: 'CRIT', css: 'bg-red-950 text-red-400 border border-red-900' };
        if (health < 65) return { label: 'HIGH', css: 'bg-orange-950 text-orange-400 border border-orange-900' };
        if (health < 75) return { label: 'MOD', css: 'bg-yellow-950 text-yellow-400 border border-yellow-900' };
        return { label: 'SAFE', css: 'bg-green-950 text-green-400 border border-green-900' };
    };

    const getTrendProps = (trend) => {
        if (!trend) return { icon: '→', css: 'text-[#facc15]' };
        const t = trend.toLowerCase();
        if (t === 'critical' || t.includes('severe')) return { icon: '↓↓', css: 'text-[#f87171]' };
        if (t === 'declining') return { icon: '↓', css: 'text-[#fb923c]' };
        if (t === 'increasing') return { icon: '↑', css: 'text-[#4ade80]' };
        return { icon: '→', css: 'text-[#facc15]' }; // stable
    };

    return (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col h-full">
            {/* Header */}
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-[9px] text-slate-600 uppercase tracking-widest font-bold">Speaker Health — MSY Utilization Deep Dive</h3>
                <div className="flex gap-2">
                    <span className="bg-red-950 text-red-400 px-2 py-0.5 rounded text-[8px] font-bold">Critical &lt;50</span>
                    <span className="bg-orange-950 text-orange-400 px-2 py-0.5 rounded text-[8px] font-bold">High 50-65</span>
                    <span className="bg-green-950 text-green-400 px-2 py-0.5 rounded text-[8px] font-bold">Safe &gt;75</span>
                </div>
            </div>

            {/* 2-Column Grid */}
            <div className="flex-1 flex flex-col min-h-0">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-1 overflow-auto custom-scrollbar pr-1 flex-1">
                    {displayList.map((s, idx) => {
                        const healthColor = getHealthColor(s.stock_health_percent);
                        const msy = msyUtilizationFn(s);
                        const status = getStatusProps(s.stock_health_percent);
                        const trend = getTrendProps(s.trend);

                        return (
                            <div
                                key={s.id}
                                className="bg-[#060f1e] border border-slate-800 rounded-lg p-[6px] px-[8px] flex items-center gap-2 cursor-pointer hover:border-cyan-500/30 hover:bg-[#0a1e35] transition-colors"
                                title={`Scientific: ${s.scientific_name}\nCurrent Catch: ${s.current_catch_tonnes?.toLocaleString()}t\nMax Sustainable: ${s.msy_tonnes?.toLocaleString()}t\nProtected: ${s.protected ? 'Yes' : 'No'}`}
                            >
                                {/* 1. Rank */}
                                <span className="text-xs text-slate-600 w-[14px] text-center shrink-0">{idx + 1}</span>

                                {/* 2. Name */}
                                <span className="text-xs font-semibold w-[95px] shrink-0 text-[#e2e8f0] truncate" title={s.species}>
                                    {s.species}
                                </span>

                                {/* 3. Health Value */}
                                <span className="text-xs font-bold w-[32px] shrink-0 text-right" style={{ color: healthColor }}>
                                    {Math.round(s.stock_health_percent)}%
                                </span>

                                {/* 4. Health Bar */}
                                <div className="flex-1 h-[5px] bg-slate-800 rounded overflow-hidden shrink-0 min-w-[30px]">
                                    <div className="h-full rounded transition-all" style={{ width: `${Math.min(100, s.stock_health_percent)}%`, backgroundColor: healthColor }} />
                                </div>

                                {/* 5. MSY */}
                                <span className="text-[10px] font-bold w-[32px] shrink-0 text-right text-slate-400">
                                    {msy}%
                                </span>

                                {/* 6. Status Badge */}
                                <span className={`text-[8px] px-[5px] py-[1px] rounded font-bold shrink-0 ${status.css}`}>
                                    {status.label}
                                </span>

                                {/* 7. Trend Arrow */}
                                <span className={`text-xs ml-1 font-bold shrink-0 ${trend.css}`}>
                                    {trend.icon}
                                </span>
                            </div>
                        );
                    })}
                </div>
                {hasMore && !showAll && (
                    <button
                        onClick={() => setShowAll(true)}
                        className="mt-3 w-full bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs py-2 rounded transition-colors cursor-pointer"
                    >
                        Show all {sortedSpecies.length} species
                    </button>
                )}
                {hasMore && showAll && (
                    <button
                        onClick={() => setShowAll(false)}
                        className="mt-3 w-full bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs py-2 rounded transition-colors cursor-pointer"
                    >
                        Show top 20 only
                    </button>
                )}
            </div>
        </div>
    );
}
