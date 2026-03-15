import React from 'react';

export default function CollapseRiskMeter({ risk }) {
    const getColor = (score) => {
        if (score > 60) return '#ef4444';
        if (score > 30) return '#f59e0b';
        return '#10b981';
    };

    const color = getColor(risk.score);

    return (
        <div className="glass-card p-6 flex flex-col justify-between border-l-4" style={{ borderColor: color }}>
            <div className="flex justify-between items-start mb-2">
                <span className="text-[10px] uppercase font-black tracking-widest opacity-60">Collapse Risk</span>
                <span className="text-[10px] font-black uppercase tracking-widest" style={{ color }}>{risk.level}</span>
            </div>

            <div className="flex items-baseline gap-1 mt-1">
                <span className="text-3xl font-black text-white">{risk.score}%</span>
                <span className="text-[10px] font-bold opacity-40 uppercase">Probability</span>
            </div>

            <div className="mt-4 space-y-2">
                <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                    <div
                        className="h-full transition-all duration-1000"
                        style={{ width: `${risk.score}%`, backgroundColor: color, filter: `drop-shadow(0 0 4px ${color})` }}
                    />
                </div>
                {risk.score > 60 && (
                    <p className="text-[9px] text-red-400 font-bold animate-pulse uppercase tracking-tight">
                        ⚠️ Critical ecosystem instability detected
                    </p>
                )}
            </div>
        </div>
    );
}
