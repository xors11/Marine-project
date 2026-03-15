import React from 'react';

export default function ClimateStressIndicator({ stress }) {

    if (!stress) return null;

    const score = stress.score ?? 0;
    const sst = stress.sst ?? 0;

    let level = "Low";
    if (score > 70) level = "High";
    else if (score > 40) level = "Moderate";

    const getIcon = (lvl) => {
        if (lvl === 'High') return '🔥';
        if (lvl === 'Moderate') return '🌡️';
        return '🌊';
    };

    const getColor = (lvl) => {
        if (lvl === 'High') return '#ef4444';
        if (lvl === 'Moderate') return '#f59e0b';
        return '#4db8e8';
    };

    return (
        <div
            className="glass-card p-4 flex items-center gap-4 border-l-4"
            style={{ borderColor: getColor(level) }}
        >
            <div className="text-2xl">{getIcon(level)}</div>
            <div className="flex-1">
                <div className="flex justify-between items-center mb-1">
                    <span className="text-[9px] uppercase font-black tracking-widest opacity-60">
                        Climate Stress
                    </span>
                    <span className="text-xs font-black text-white">
                        {sst}°C
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    <span
                        className="text-[10px] font-black uppercase tracking-tight"
                        style={{ color: getColor(level) }}
                    >
                        {level} SST Impact
                    </span>

                    {level === 'High' && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/30">
                            -5 Penalty
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
}