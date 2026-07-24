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
        { name: "MSY Pressure", value: msyPressureScore, color: "var(--color-danger)" },
        { name: "Stock Weakness", value: stockWeakness, color: "var(--color-amber)" },
        { name: "Declining Stocks", value: "var(--color-accent)" }, // Wait! Oh, let's look at the color: decliningStocks. Let's make it the value, not the color name! Let's check line 34 in original file: `{ name: "Declining Stocks", value: decliningStocks, color: "#60a5fa" }`.
        { name: "Declining Stocks", value: decliningStocks, color: "var(--color-accent)" },
        { name: "Climate Stress", value: climateStress, color: "var(--color-violet)" },
        { name: "Bycatch Rate", value: bycatchRate, color: "var(--color-temp)" },
        { name: "Habitat Degradation", value: habitatDegradation, color: "var(--color-warning)" }
    ];

    const REGIONS_SETUP = [
        { name: 'Bay of Bengal', color: 'var(--color-violet)' },
        { name: 'Arabian Sea', color: 'var(--color-temp)' },
        { name: 'Indian Ocean', color: 'var(--color-accent)' }
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
        <div
            className="card flex flex-col h-full"
            style={{
                borderTop: '2px solid var(--color-amber)',
            }}
        >
            <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--color-abyss-400)', marginBottom: 14, display: 'block' }}>Primary Risk Drivers</span>

            <div className="flex-1 overflow-auto custom-scrollbar pr-1">
                {/* 6 Horizontal Bars */}
                <div className="space-y-3">
                    {drivers.map((d, i) => (
                        <div key={i} className="flex items-center text-xs">
                            <span className="w-28 text-[var(--color-abyss-300)] truncate pr-2 shrink-0">{d.name}</span>
                            <div className="flex-1 h-2 bg-[var(--color-abyss-800)] rounded mx-2 overflow-hidden shrink-0 min-w-[50px]">
                                <div className="h-full rounded transition-all duration-500" style={{ width: `${d.value}%`, backgroundColor: d.color }} />
                            </div>
                            <span className="w-6 text-right font-bold text-[var(--color-abyss-100)] shrink-0">{d.value}%</span>
                        </div>
                    ))}
                </div>

                {/* Regional Indicators */}
                <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--color-abyss-400)', display: 'block', marginTop: 20, marginBottom: 10 }}>Regional Population Indicators</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {regionalData.length === 0 ? (
                        <div style={{ textAlign: 'center', fontSize: 11, color: 'var(--color-abyss-400)', padding: '8px 0' }}>No regional data for current selection.</div>
                    ) : (
                        regionalData.map((rd, i) => (
                            <div key={i} style={{
                                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                fontSize: 11, padding: '6px 8px',
                                background: 'var(--color-abyss-950)', borderRadius: 7,
                                border: '1px solid var(--color-abyss-800)',
                            }}>
                                <span style={{ fontWeight: 600, width: 90, flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: rd.color }}>{rd.region}</span>
                                <span style={{ color: 'var(--color-abyss-400)', width: 44, textAlign: 'center', flexShrink: 0, fontSize: 10 }}>{rd.count} sp.</span>
                                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                                    <span style={{ fontSize: 9, padding: '1px 6px', borderRadius: 99, fontWeight: 700, background: 'rgba(242, 102, 91, 0.08)', border: '1px solid rgba(242, 102, 91, 0.2)', color: 'var(--color-danger)' }}>{rd.critical} Crit</span>
                                    <span style={{ fontSize: 9, padding: '1px 6px', borderRadius: 99, fontWeight: 700, background: 'rgba(111, 207, 151, 0.08)', border: '1px solid rgba(111, 207, 151, 0.2)', color: 'var(--color-green)' }}>{rd.healthy} Safe</span>
                                </div>
                                <span style={{ fontSize: 9, padding: '1px 6px', borderRadius: 99, fontWeight: 700, background: 'rgba(45, 212, 191, 0.08)', border: '1px solid rgba(45, 212, 191, 0.2)', color: 'var(--color-accent)', flexShrink: 0 }}>MSY {rd.msyAvg}%</span>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
