import React from 'react';

export default function OverfishingDetector({ species }) {
    const overfished = species.filter(s => s.utilization > 80);

    return (
        <div className="glass-card p-4">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-blue-400 mb-4">Stock Pressure Alerts</h3>

            <div className="space-y-3">
                {overfished.length === 0 ? (
                    <div className="text-center py-4 text-xs text-blue-300 opacity-60 italic">
                        No critical overfishing detected in this region.
                    </div>
                ) : (
                    overfished.map(s => (
                        <div key={s.id} className="flex items-center justify-between p-2 rounded-lg bg-white/5 border border-white/5">
                            <div className="flex flex-col">
                                <span className="text-xs font-bold text-white">{s.species}</span>
                                <span className="text-[10px] opacity-60">{s.scientific_name}</span>
                            </div>
                            <div className="flex flex-col items-end gap-1">
                                <div
                                    className="px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-tighter"
                                    style={{ backgroundColor: `${s.riskColor}20`, color: s.riskColor, border: `1px solid ${s.riskColor}40` }}
                                >
                                    {s.overfishingStatus}
                                </div>
                                <div className="text-[10px] font-mono" style={{ color: s.riskColor }}>
                                    {Math.round(s.utilization)}% MSY
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
