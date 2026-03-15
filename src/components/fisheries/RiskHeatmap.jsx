import React, { useState } from 'react';

export default function RiskHeatmap({ species, msyUtilizationFn }) {
    if (!species) return null;

    const [hoverSpan, setHoverSpan] = useState(null);

    // STEP 8: Fixed cell dimensions matching the EXACT CSS from phase 8 issue resolution
    // Sorted arbitrarily by ID or natural row to represent an unsorted "map" of risk.
    const getHealthColor = (health) => {
        if (health < 50) return { bg: '#2a0505', text: '#f87171', border: '#7f1d1d' };
        if (health < 65) return { bg: '#1e1000', text: '#fb923c', border: '#7c2d12' };
        if (health < 75) return { bg: '#1a1800', text: '#facc15', border: '#713f12' };
        return { bg: '#052e16', text: '#4ade80', border: '#14532d' };
    };

    return (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col w-full h-full overflow-hidden shrink-0">
            <div className="flex justify-between items-center mb-4 shrink-0">
                <h3 className="text-[9px] text-slate-600 uppercase tracking-widest font-bold">Risk Distribution Heatmap</h3>
                <span className="text-xs text-slate-500">{species.length} Active Species</span>
            </div>

            <div className="overflow-y-auto custom-scrollbar flex-1 w-full relative h-[185px]">
                {/* Fixed Grid exactly as requested in URGENT FIX */}
                <div className="grid grid-cols-9 gap-1 w-full">
                    {species.map(s => {
                        const style = getHealthColor(s.stock_health_percent);
                        const msy = msyUtilizationFn(s);

                        return (
                            <div
                                key={s.id}
                                className="relative rounded-[6px] p-[6px_4px] text-center cursor-pointer overflow-hidden border transition-all hover:brightness-125"
                                style={{
                                    backgroundColor: style.bg,
                                    borderColor: style.border,
                                    height: '56px',
                                    minHeight: '56px',
                                    maxHeight: '56px'
                                }}
                                onMouseEnter={() => setHoverSpan(s)}
                                onMouseLeave={() => setHoverSpan(null)}
                            >
                                {/* Core Data */}
                                <div className="font-bold text-[9px] whitespace-nowrap overflow-hidden text-ellipsis mb-0.5" style={{ color: style.text }} title={s.species}>
                                    {s.species.slice(0, 10).toUpperCase()}
                                </div>
                                <div className="text-[8px] opacity-85 mt-[2px]" style={{ color: style.text }}>
                                    H: {Math.round(s.stock_health_percent)}%
                                </div>
                                <div className="text-[8px] opacity-75 mt-0 font-bold" style={{ color: msy > 90 ? '#f87171' : style.text }}>
                                    M: {msy}%
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Floating Tooltip */}
                {hoverSpan && (
                    <div className="absolute top-2 left-1/2 transform -translate-x-1/2 bg-black/90 border border-slate-700 text-white p-3 rounded-lg text-xs z-50 whitespace-nowrap shadow-2xl backdrop-blur pointer-events-none">
                        <div className="font-bold mb-1 text-cyan-400">{hoverSpan.species} <span className="text-slate-500 font-normal">({hoverSpan.scientific_name})</span></div>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-2">
                            <span className="text-slate-400">Region:</span> <span>{hoverSpan.region}</span>
                            <span className="text-slate-400">Target MSY:</span> <span>{hoverSpan.msy_tonnes} t</span>
                            <span className="text-slate-400">Curr Catch:</span> <span>{hoverSpan.current_catch_tonnes} t</span>
                            <span className="text-slate-400">Health State:</span> <span>{Math.round(hoverSpan.stock_health_percent)}% ({hoverSpan.trend})</span>
                            <span className="text-slate-400">Status:</span> <span>{hoverSpan.protected ? 'Protected 🛡️' : 'Commercial'} | Season: {hoverSpan.season_open ? 'Open' : 'Closed'}</span>
                        </div>
                    </div>
                )}
            </div>

        </div>
    );
}
