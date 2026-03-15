import React from 'react';

export default function PredictiveIndexCard({ current, projection }) {
    const isDeclining = projection.direction === 'Declining';
    const isImproving = projection.direction === 'Improving';
    const color = isImproving ? '#10b981' : isDeclining ? '#ef4444' : '#6366f1';
    const icon = isImproving ? '↑' : isDeclining ? '↓' : '→';

    return (
        <div className="glass-card p-6 flex flex-col justify-between border-l-4" style={{ borderColor: color }}>
            <div className="flex justify-between items-start">
                <span className="text-[10px] uppercase font-black tracking-widest opacity-60">6-Month Projection</span>
                <div
                    className="px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest"
                    style={{ backgroundColor: `${color}20`, color }}
                >
                    {projection.direction}
                </div>
            </div>

            <div className="my-3 flex items-baseline gap-2">
                <span className="text-3xl font-black text-white">{projection.index_6_month}</span>
                <span className="text-sm font-bold" style={{ color }}>{icon} {Math.abs(projection.change)}</span>
            </div>

            <div className="mt-auto">
                <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden flex">
                    <div
                        className="h-full opacity-30"
                        style={{ width: `${current}%`, backgroundColor: '#4db8e8' }}
                    />
                    <div
                        className="h-full"
                        style={{
                            width: `${Math.abs(projection.change)}%`,
                            backgroundColor: color,
                            marginLeft: projection.change < 0 ? `-${Math.abs(projection.change)}%` : '0'
                        }}
                    />
                </div>
                <div className="flex justify-between mt-2 text-[9px] font-bold opacity-40 uppercase tracking-tighter">
                    <span>Current: {current}</span>
                    <span>Target: {projection.index_6_month}</span>
                </div>
            </div>
        </div>
    );
}
