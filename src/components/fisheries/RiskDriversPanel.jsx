import React from 'react';

export default function RiskDriversPanel({ displaySpecies, msyUtilizationFn, sstScenario }) {
    if (!displaySpecies) return null;

    const total = displaySpecies.length || 1;

    // 1. MSY Pressure (mean MSY utilization)
    const msyPressureScore = Math.round(displaySpecies.reduce((acc, s) => acc + msyUtilizationFn(s), 0) / total);

    // 2. Stock Weakness (% of species with health < 65)
    const stockWeaknessCount = displaySpecies.filter(s => s.stock_health_percent < 65).length;
    const stockWeakness = Math.round((stockWeaknessCount / total) * 100);

    // 3. Declining Stocks (% of species with declining/critical trend)
    const decliningCount = displaySpecies.filter(s => {
        const t = (s.trend || '').toLowerCase();
        return t === 'declining' || t === 'critical';
    }).length;
    const decliningStocks = Math.round((decliningCount / total) * 100);

    // 4. Climate Stress
    const climateStress = sstScenario === 'high' ? 35 : 18;

    // 5. Bycatch Rate
    const bycatchRate = 24;

    // 6. Habitat Degradation
    const habitatDegradation = 12;

    const drivers = [
        { name: "MSY Pressure", value: msyPressureScore, color: "#f87171" },
        { name: "Stock Weakness", value: stockWeakness, color: "#fb923c" },
        { name: "Declining Stocks", value: decliningStocks, color: "#60a5fa" },
        { name: "Climate Stress", value: climateStress, color: "#a78bfa" },
        { name: "Bycatch Rate", value: bycatchRate, color: "#f0997b" },
        { name: "Habitat Degradation", value: habitatDegradation, color: "#facc15" }
    ];

    const REGIONS_SETUP = [
        { name: 'Bay of Bengal', color: '#a78bfa' },
        { name: 'Arabian Sea', color: '#f97316' },
        { name: 'Indian Ocean', color: '#22d3ee' }
    ];

    // Compute regional population indicators dynamically per Step 7 instructions / Phase 4 changes
    const regionalData = REGIONS_SETUP.map(rConfig => {
        const specsInRegion = displaySpecies.filter(s => s.region === rConfig.name || (rConfig.name === 'Indian Ocean' && (s.region === 'Indian Ocean' || s.region === 'Laccadive Sea')));
        if (specsInRegion.length === 0) return { region: rConfig.name, count: 0, critical: 0, healthy: 0, msyAvg: 0, color: rConfig.color };

        const crit = specsInRegion.filter(s => s.stock_health_percent < 50).length;
        const healthy = specsInRegion.filter(s => s.stock_health_percent >= 75).length;
        const msyAvg = Math.round(specsInRegion.reduce((acc, s) => acc + msyUtilizationFn(s), 0) / specsInRegion.length);

        return {
            region: rConfig.name,
            count: specsInRegion.length,
            critical: crit,
            healthy: healthy,
            msyAvg: msyAvg,
            color: rConfig.color
        };
    }).filter(d => d.count > 0);

    return (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col h-full">
            <h3 className="text-[9px] text-slate-600 uppercase tracking-widest font-bold mb-4">Primary Risk Drivers</h3>

            <div className="flex-1 overflow-auto custom-scrollbar pr-1">
                {/* 6 Horizontal Bars */}
                <div className="space-y-3">
                    {drivers.map((d, i) => (
                        <div key={i} className="flex items-center text-xs">
                            <span className="w-28 text-slate-400 truncate pr-2 shrink-0">{d.name}</span>
                            <div className="flex-1 h-2 bg-slate-800 rounded mx-2 overflow-hidden shrink-0 min-w-[50px]">
                                <div className="h-full rounded transition-all duration-500" style={{ width: `${d.value}%`, backgroundColor: d.color }} />
                            </div>
                            <span className="w-6 text-right font-bold text-[#e2e8f0] shrink-0">{d.value}%</span>
                        </div>
                    ))}
                </div>

                {/* Regional Indicators */}
                <h3 className="text-[9px] text-slate-600 uppercase tracking-widest font-bold mt-6 mb-3">Regional Population Indicators</h3>
                <div className="space-y-1">
                    {regionalData.length === 0 ? (
                        <div className="text-center text-xs text-slate-500 py-2">No regional data for current selection.</div>
                    ) : (
                        regionalData.map((rd, i) => (
                            <div key={i} className="flex justify-between items-center text-xs p-2 bg-[#060f1e] rounded border border-slate-800">
                                <span className="font-semibold truncate w-[85px] shrink-0" style={{ color: rd.color }}>{rd.region}</span>
                                <span className="text-slate-500 w-[40px] text-center shrink-0">{rd.count} sp.</span>

                                <div className="flex gap-2 shrink-0">
                                    <span className="text-red-400 font-bold bg-red-950 px-1 rounded">{rd.critical} Crit</span>
                                    <span className="text-green-400 font-bold bg-green-950 px-1 rounded">{rd.healthy} Safe</span>
                                </div>

                                <span className="text-cyan-400 bg-cyan-950 px-1 rounded shrink-0">MSY {rd.msyAvg}%</span>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
