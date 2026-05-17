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
        <div style={{
            background: '#040d1a',
            border: '0.5px solid #0d2135',
            borderRadius: 9,
            borderTop: '1.5px solid #fb923c',
            padding: '14px',
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
        }}>
            <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#0f2d44', marginBottom: 14, display: 'block' }}>Primary Risk Drivers</span>

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
                <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#0f2d44', display: 'block', marginTop: 20, marginBottom: 10 }}>Regional Population Indicators</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {regionalData.length === 0 ? (
                        <div style={{ textAlign: 'center', fontSize: 11, color: '#2a4a62', padding: '8px 0' }}>No regional data for current selection.</div>
                    ) : (
                        regionalData.map((rd, i) => (
                            <div key={i} style={{
                                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                fontSize: 11, padding: '6px 8px',
                                background: '#040f1f', borderRadius: 7,
                                border: '0.5px solid #0d2135',
                            }}>
                                <span style={{ fontWeight: 600, width: 90, flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: rd.color }}>{rd.region}</span>
                                <span style={{ color: '#2a4a62', width: 44, textAlign: 'center', flexShrink: 0, fontSize: 10 }}>{rd.count} sp.</span>
                                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                                    <span style={{ fontSize: 9, padding: '1px 6px', borderRadius: 99, fontWeight: 700, background: 'rgba(248,113,113,0.07)', border: '0.5px solid rgba(248,113,113,0.25)', color: '#f87171' }}>{rd.critical} Crit</span>
                                    <span style={{ fontSize: 9, padding: '1px 6px', borderRadius: 99, fontWeight: 700, background: 'rgba(74,222,128,0.07)', border: '0.5px solid rgba(74,222,128,0.25)', color: '#4ade80' }}>{rd.healthy} Safe</span>
                                </div>
                                <span style={{ fontSize: 9, padding: '1px 6px', borderRadius: 99, fontWeight: 700, background: 'rgba(34,211,238,0.07)', border: '0.5px solid rgba(34,211,238,0.2)', color: '#22d3ee', flexShrink: 0 }}>MSY {rd.msyAvg}%</span>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
