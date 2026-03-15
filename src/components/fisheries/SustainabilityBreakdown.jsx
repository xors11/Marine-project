import React from 'react';

export default function SustainabilityBreakdown({ species, sustainabilityIndex }) {
    const avgHealth = species.reduce((acc, s) => acc + s.stock_health_percent, 0) / species.length;
    const stableCount = species.filter(s => s.trend === 'Stable').length;
    const decliningCount = species.filter(s => s.trend === 'Declining' || s.trend === 'Critical').length;
    const overfishedCount = species.filter(s => s.utilization > 80).length;

    const stablePct = (stableCount / species.length) * 100;
    const decliningPct = (decliningCount / species.length) * 100;
    const overfishingPressure = (overfishedCount / species.length) * 100;

    const metrics = [
        { label: 'Avg Stock Health', value: avgHealth, color: '#10b981' },
        { label: 'Stable Species %', value: stablePct, color: '#6366f1' },
        { label: 'Declining Species %', value: decliningPct, color: '#f97316' },
        { label: 'Overfishing Pressure', value: overfishingPressure, color: '#ef4444' }
    ];

    return (
        <div className="glass-card p-4">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-blue-400 mb-4">Sustainability Breakdown</h3>

            <div className="space-y-4">
                {metrics.map(m => (
                    <div key={m.label} className="space-y-1">
                        <div className="flex justify-between text-[10px] uppercase font-bold tracking-tight">
                            <span className="opacity-60">{m.label}</span>
                            <span style={{ color: m.color }}>{Math.round(m.value)}%</span>
                        </div>
                        <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                            <div
                                className="h-full rounded-full transition-all duration-1000"
                                style={{ width: `${m.value}%`, backgroundColor: m.color }}
                            />
                        </div>
                    </div>
                ))}
            </div>

            <div className="mt-6 pt-4 border-t border-white/5">
                <div className="flex justify-between items-center mb-1">
                    <span className="text-[10px] font-bold opacity-60">Aggregate Performance</span>
                    <span className="text-xs font-black text-blue-300">{sustainabilityIndex}%</span>
                </div>
                <div className="text-[9px] text-blue-300/60 leading-relaxed italic">
                    This score is derived from aggregate stock health, Msy utilization, and dynamic trend analysis across {species.length} species.
                </div>
            </div>
        </div>
    );
}
