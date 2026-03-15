import React from 'react';

export default function KPIStrip({ sustainabilityIndex, collapseRisk, atRiskCount, totalSpecies, sixMonthProjection, alertCount, criticalAlertCount }) {
    const riskPercent = totalSpecies > 0 ? (atRiskCount / totalSpecies * 100) : 0;
    const alertPercent = alertCount > 0 ? (criticalAlertCount / alertCount * 100) : 0;

    // Deterministic styles per STEP 7 rules
    const getSustainProps = (idx) => {
        if (idx < 50) return { color: '#f87171', sub: 'Critical — action needed' };
        if (idx < 65) return { color: '#fb923c', sub: 'High risk' };
        if (idx < 75) return { color: '#facc15', sub: 'Moderate' };
        return { color: '#4ade80', sub: 'Healthy' };
    };

    const getCollapseProps = (risk) => {
        if (risk > 75) return { color: '#f87171', sub: 'Very high probability' };
        if (risk > 50) return { color: '#fb923c', sub: 'Elevated risk' };
        return { color: '#4ade80', sub: 'Manageable' };
    };

    const sProps = getSustainProps(sustainabilityIndex);
    const cProps = getCollapseProps(collapseRisk);
    const decScore = Math.round(sustainabilityIndex - sixMonthProjection);

    return (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-4">
            {/* Card 1 */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-3" style={{ borderTop: `3px solid ${sProps.color}` }}>
                <div className="flex justify-between items-start mb-1">
                    <div className="text-xs text-slate-500 uppercase tracking-widest">Sustainability Index</div>
                    <div className="text-[9px] text-slate-500 text-right leading-tight max-w-[80px]">Derived from 3 regional buoys</div>
                </div>
                <div className="text-2xl font-bold" style={{ color: sProps.color }}>{sustainabilityIndex || 0}</div>
                <div className="text-[10px] mt-0.5" style={{ color: sProps.color }}>{sProps.sub}</div>
                <div className="h-0.5 bg-slate-800 rounded-full mt-2 w-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-700" style={{ width: `${sustainabilityIndex}%`, background: sProps.color }} />
                </div>
            </div>

            {/* Card 2 */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-3" style={{ borderTop: '3px solid #fb923c' }}>
                <div className="text-xs text-slate-500 uppercase tracking-widest mb-1">Collapse Risk</div>
                <div className="text-2xl font-bold" style={{ color: '#e2e8f0' }}>{Math.round(collapseRisk)}%</div>
                <div className="text-[10px] mt-0.5" style={{ color: cProps.color }}>{cProps.sub}</div>
                <div className="h-0.5 bg-slate-800 rounded-full mt-2 w-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-700" style={{ width: `${Math.round(collapseRisk)}%`, background: '#fb923c' }} />
                </div>
            </div>

            {/* Card 3 */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-3" style={{ borderTop: '3px solid #facc15' }}>
                <div className="text-xs text-slate-500 uppercase tracking-widest mb-1">Species at Risk</div>
                <div className="text-2xl font-bold" style={{ color: '#e2e8f0' }}>{atRiskCount}/{totalSpecies}</div>
                <div className="text-[10px] mt-0.5" style={{ color: '#4a6a8a' }}>{Math.round(riskPercent)}% of monitored</div>
                <div className="h-0.5 bg-slate-800 rounded-full mt-2 w-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-700" style={{ width: `${riskPercent}%`, background: '#facc15' }} />
                </div>
            </div>

            {/* Card 4 */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-3" style={{ borderTop: '3px solid #a78bfa' }}>
                <div className="text-xs text-slate-500 uppercase tracking-widest mb-1">6-Mo Projection</div>
                <div className="text-2xl font-bold" style={{ color: '#e2e8f0' }}>{Math.round(sixMonthProjection)} ↓</div>
                <div className="text-[10px] mt-0.5" style={{ color: '#4a6a8a' }}>Declining — −{decScore} pts</div>
                <div className="h-0.5 bg-slate-800 rounded-full mt-2 w-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-700" style={{ width: `${sixMonthProjection}%`, background: '#a78bfa' }} />
                </div>
            </div>

            {/* Card 5 */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-3" style={{ borderTop: '3px solid #22d3ee' }}>
                <div className="text-xs text-slate-500 uppercase tracking-widest mb-1">Active Alerts</div>
                <div className="text-2xl font-bold" style={{ color: '#e2e8f0' }}>{alertCount}</div>
                <div className="text-[10px] mt-0.5" style={{ color: criticalAlertCount > 0 ? '#f87171' : '#4ade80' }}>
                    {criticalAlertCount > 0 ? `${criticalAlertCount} critical unresolved` : `No critical alerts`}
                </div>
                <div className="h-0.5 bg-slate-800 rounded-full mt-2 w-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-700" style={{ width: `${alertPercent}%`, background: '#f87171' }} />
                </div>
            </div>
        </div>
    );
}
