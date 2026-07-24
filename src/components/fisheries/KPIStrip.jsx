import React from 'react';

export default function KPIStrip({ sustainabilityIndex, collapseRisk, atRiskCount, totalSpecies, sixMonthProjection, alertCount, criticalAlertCount }) {
    const riskPercent = totalSpecies > 0 ? (atRiskCount / totalSpecies * 100) : 0;
    const alertPercent = alertCount > 0 ? (criticalAlertCount / alertCount * 100) : 0;

    // Deterministic styles per STEP 7 rules
    const getSustainProps = (idx) => {
        if (idx < 50) return { color: 'var(--color-danger)', sub: 'Critical — action needed' };
        if (idx < 65) return { color: 'var(--color-amber)', sub: 'High risk' };
        if (idx < 75) return { color: 'var(--color-warning)', sub: 'Moderate' };
        return { color: 'var(--color-green)', sub: 'Healthy' };
    };

    const getCollapseProps = (risk) => {
        if (risk > 75) return { color: 'var(--color-danger)', sub: 'Very high probability' };
        if (risk > 50) return { color: 'var(--color-amber)', sub: 'Elevated risk' };
        return { color: 'var(--color-green)', sub: 'Manageable' };
    };

    const sProps = getSustainProps(sustainabilityIndex);
    const cProps = getCollapseProps(collapseRisk);
    const decScore = Math.round(sustainabilityIndex - sixMonthProjection);

    return (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-4 mb-[var(--space-4)]">
            {/* Card 1 */}
            <div className="card" style={{ borderTop: `3px solid ${sProps.color}` }}>
                <div className="flex justify-between items-start mb-1">
                    <div className="text-xs text-[var(--color-abyss-400)] uppercase tracking-widest">Sustainability Index</div>
                    <div className="text-[9px] text-[var(--color-abyss-400)] text-right leading-tight max-w-[80px]">Derived from 3 regional buoys</div>
                </div>
                <div className="text-2xl font-bold data-value" style={{ color: sProps.color }}>{sustainabilityIndex || 0}</div>
                <div className="text-[10px] mt-0.5" style={{ color: sProps.color }}>{sProps.sub}</div>
                <div className="h-0.5 bg-[var(--color-abyss-800)] rounded-full mt-2 w-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-700" style={{ width: `${sustainabilityIndex}%`, background: sProps.color }} />
                </div>
            </div>

            {/* Card 2 */}
            <div className="card" style={{ borderTop: '3px solid var(--color-amber)' }}>
                <div className="text-xs text-[var(--color-abyss-400)] uppercase tracking-widest mb-1">Collapse Risk</div>
                <div className="text-2xl font-bold text-[var(--color-abyss-100)] data-value">{Math.round(collapseRisk)}%</div>
                <div className="text-[10px] mt-0.5" style={{ color: cProps.color }}>{cProps.sub}</div>
                <div className="h-0.5 bg-[var(--color-abyss-800)] rounded-full mt-2 w-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-700" style={{ width: `${Math.round(collapseRisk)}%`, background: 'var(--color-amber)' }} />
                </div>
            </div>

            {/* Card 3 */}
            <div className="card" style={{ borderTop: '3px solid var(--color-warning)' }}>
                <div className="text-xs text-[var(--color-abyss-400)] uppercase tracking-widest mb-1">Species at Risk</div>
                <div className="text-2xl font-bold text-[var(--color-abyss-100)] data-value">{atRiskCount}/{totalSpecies}</div>
                <div className="text-[10px] mt-0.5" style={{ color: 'var(--color-abyss-400)' }}>{Math.round(riskPercent)}% of monitored</div>
                <div className="h-0.5 bg-[var(--color-abyss-800)] rounded-full mt-2 w-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-700" style={{ width: `${riskPercent}%`, background: 'var(--color-warning)' }} />
                </div>
            </div>

            {/* Card 4 */}
            <div className="card" style={{ borderTop: '3px solid var(--color-violet)' }}>
                <div className="text-xs text-[var(--color-abyss-400)] uppercase tracking-widest mb-1">6-Mo Projection</div>
                <div className="text-2xl font-bold text-[var(--color-abyss-100)] data-value">{Math.round(sixMonthProjection)} ↓</div>
                <div className="text-[10px] mt-0.5" style={{ color: 'var(--color-abyss-400)' }}>Declining — −{decScore} pts</div>
                <div className="h-0.5 bg-[var(--color-abyss-800)] rounded-full mt-2 w-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-700" style={{ width: `${sixMonthProjection}%`, background: 'var(--color-violet)' }} />
                </div>
            </div>

            {/* Card 5 */}
            <div className="card" style={{ borderTop: '3px solid var(--color-accent)' }}>
                <div className="text-xs text-[var(--color-abyss-400)] uppercase tracking-widest mb-1">Active Alerts</div>
                <div className="text-2xl font-bold text-[var(--color-abyss-100)] data-value">{alertCount}</div>
                <div className="text-[10px] mt-0.5" style={{ color: criticalAlertCount > 0 ? 'var(--color-danger)' : 'var(--color-green)' }}>
                    {criticalAlertCount > 0 ? `${criticalAlertCount} critical unresolved` : `No critical alerts`}
                </div>
                <div className="h-0.5 bg-[var(--color-abyss-800)] rounded-full mt-2 w-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-700" style={{ width: `${alertPercent}%`, background: 'var(--color-danger)' }} />
                </div>
            </div>
        </div>
    );
}
