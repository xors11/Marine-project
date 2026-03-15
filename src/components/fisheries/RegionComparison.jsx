import React from 'react';

export default function RegionComparison({ comparisonData }) {
    if (!comparisonData) return null;

    return (
        <div className="glass-card p-4">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-blue-400 mb-4">Regional Comparison</h3>

            <div className="space-y-6">
                {comparisonData.map(reg => (
                    <div key={reg.region} className="space-y-2">
                        <div className="flex justify-between items-end">
                            <span className="text-[10px] font-bold text-white opacity-80 uppercase tracking-tight">{reg.region}</span>
                            <span className="text-xs font-black text-blue-300">{reg.sustainability_index}/100</span>
                        </div>

                        <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                            <div
                                className="h-full rounded-full transition-all duration-1000"
                                style={{
                                    width: `${reg.sustainability_index}%`,
                                    background: reg.sustainability_index >= 75 ? '#10b981' : reg.sustainability_index >= 50 ? '#f59e0b' : '#ef4444'
                                }}
                            />
                        </div>

                        <div className="grid grid-cols-3 gap-2">
                            <div className="flex flex-col">
                                <span className="text-[8px] opacity-40 uppercase">Total</span>
                                <span className="text-[10px] font-bold">{reg.count}</span>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[8px] opacity-40 uppercase">Critical</span>
                                <span className="text-[10px] font-bold text-red-400">{reg.critical_species_count}</span>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[8px] opacity-40 uppercase">Safe</span>
                                <span className="text-[10px] font-bold text-green-400">{reg.safe_species_count}</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
