import React from 'react';

export default function SustainabilityGaugeAdvanced({
    sustainabilityIndex,
    sixMonthProjection,
    modelConfidence,
    displaySpecies,
    msyUtilization
}) {
    const sIndex = sustainabilityIndex || 0;
    const sProj = sixMonthProjection || 0;
    const previousIndex = Math.min(100, sIndex + 4);

    // Triple Gauge Calculations
    const getDash = (val, r) => {
        const circum = 2 * Math.PI * r;
        const fillLength = (val / 100) * circum;
        return `${fillLength} ${Math.max(0, circum - fillLength)}`;
    };

    const getHealthColor = (health) => {
        if (health < 50) return '#f87171'; // red
        if (health < 65) return '#fb923c'; // orange
        if (health < 75) return '#facc15'; // yellow
        return '#4ade80'; // green
    };

    const getStatusText = (health) => {
        if (health < 50) return 'CRITICAL';
        if (health < 65) return 'HIGH';
        if (health < 75) return 'MODERATE';
        return 'HEALTHY';
    };

    const outerColor = getHealthColor(sIndex);
    const midColor = getHealthColor(sProj);
    const statusText = getStatusText(sIndex);

    // Compute Mini metrics based on real CSV logic
    const stabilityRisk = displaySpecies ? displaySpecies.filter(s => s.stock_health_percent < 40).length : 0;
    const overfishedCount = displaySpecies ? displaySpecies.filter(s => msyUtilization(s) > 100).length : 0;

    // MSY pressure = average MSY utilization
    const avgMsy = displaySpecies && displaySpecies.length
        ? Math.round(displaySpecies.reduce((acc, s) => acc + msyUtilization(s), 0) / displaySpecies.length)
        : 0;

    // Climate Stress = hardcoded or derived
    const climateStress = 45; // Placeholder since no clear mapping was provided for "Climate Stress" in the CSV

    return (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col items-center shadow-lg h-full">

            {/* SVG GAUGE (Phase 4 / STEP 8) */}
            <div className="relative w-40 h-40 mt-2">
                <svg className="w-full h-full" viewBox="0 0 160 160">
                    <g transform="rotate(-90 80 80)">
                        {/* Ring 3 (Inner - Baseline 60) */}
                        <circle cx="80" cy="80" r="34" fill="none" stroke="#1a3a55" strokeWidth="3" />
                        <circle cx="80" cy="80" r="34" fill="none" stroke="#facc15" strokeWidth="3" strokeOpacity="0.35" strokeDasharray={getDash(60, 34)} />

                        {/* Ring 2 (Middle - 6-Mo Projection) */}
                        <circle cx="80" cy="80" r="48" fill="none" stroke="#1a3a55" strokeWidth="6" strokeLinecap="round" />
                        <circle cx="80" cy="80" r="48" fill="none" stroke={midColor} strokeWidth="6" strokeOpacity="0.5" strokeDasharray={getDash(sProj, 48)} strokeLinecap="round" />

                        {/* Ring 1 (Outer - Current Index) */}
                        <circle cx="80" cy="80" r="64" fill="none" stroke="#1a3a55" strokeWidth="14" strokeLinecap="round" />
                        <circle cx="80" cy="80" r="64" fill="none" stroke={outerColor} strokeWidth="14" strokeDasharray={getDash(sIndex, 64)} strokeLinecap="round" />
                    </g>
                </svg>

                {/* Center Text */}
                <div className="absolute inset-0 flex flex-col items-center justify-center transform translate-y-[-4px]">
                    <span className="text-[30px] font-black leading-none" style={{ color: outerColor }}>{Math.round(sIndex)}</span>
                    <span className="text-[9px] mt-[1px]" style={{ color: '#4a6a8a' }}>INDEX</span>
                    <span className="text-[10px] font-bold leading-none mt-[2px]" style={{ color: outerColor }}>{statusText}</span>
                </div>

                {/* Bottom Text */}
                <div className="absolute -bottom-2 w-full flex justify-center text-[8px] whitespace-nowrap" style={{ color: '#3a6a8a' }}>
                    6mo: {Math.round(sProj)} ↓  |  prev: {Math.round(previousIndex)}
                </div>
            </div>

            {/* Confidence Bar */}
            <div className="bg-green-950 border border-green-900 rounded text-xs text-green-400 text-center py-1 px-2 mt-4 w-full font-medium">
                Model confidence: {modelConfidence}% — {modelConfidence >= 85 ? 'High' : 'Moderate'} reliability
            </div>

            {/* 2x2 Mini Metrics */}
            <div className="grid grid-cols-2 gap-2 w-full mt-3">
                <div className="bg-[#060f1e] rounded-[6px] p-[7px] text-center border border-slate-800 flex flex-col justify-center h-full">
                    <div className="text-[10px] text-slate-400 mb-[2px]">Stability Risk</div>
                    <div className="text-sm font-bold" style={{ color: stabilityRisk > 0 ? '#f87171' : '#fb923c' }}>{stabilityRisk} species</div>
                </div>
                <div className="bg-[#060f1e] rounded-[6px] p-[7px] text-center border border-slate-800 flex flex-col justify-center h-full">
                    <div className="text-[10px] text-slate-400 mb-[2px]">Growth Pressure</div>
                    <div className="text-xs font-bold leading-tight" style={{ color: overfishedCount > 0 ? '#f87171' : '#4ade80' }}>
                        {overfishedCount > 0 ? `${overfishedCount} overfished` : 'Sustainable'}
                    </div>
                </div>
                <div className="bg-[#060f1e] rounded-[6px] p-[7px] text-center border border-slate-800">
                    <div className="text-[10px] text-slate-400 mb-[2px]">MSY Pressure</div>
                    <div className="text-sm font-bold" style={{ color: avgMsy > 80 ? '#f87171' : '#facc15' }}>{avgMsy}%</div>
                </div>
                <div className="bg-[#060f1e] rounded-[6px] p-[7px] text-center border border-slate-800">
                    <div className="text-[10px] text-slate-400 mb-[2px]">Climate Stress</div>
                    <div className="text-sm font-bold" style={{ color: '#a78bfa' }}>{climateStress}</div>
                </div>
            </div>

        </div>
    );
}
