import React from 'react';
import { computeRisk } from '../../services/cycloneRiskEngine';

export default function RiskBreakdownPanel({ sst, windSpeed, pressure }) {
    const { totalRisk, sstContribution, windShearScore, pressureAnomaly } = computeRisk({ sst, windSpeed, pressure });

    return (
        <div className="bg-slate-900 border border-slate-700 rounded-xl p-4">
            <div className="text-cyan-400 text-xs font-bold uppercase tracking-wider mb-4">Risk Factor Breakdown</div>

            {/* Total Risk */}
            <div className="text-center mb-4">
                <div className="text-4xl font-extrabold text-white">{totalRisk}</div>
                <div className="text-slate-400 text-xs mt-1">Total Risk Score</div>
            </div>

            {/* SST Bar */}
            <ProgressBar label="SST Contribution" value={sstContribution} max={40} color="bg-cyan-400" />
            {/* Wind Bar */}
            <ProgressBar label="Wind Shear" value={windShearScore} max={30} color="bg-amber-400" />
            {/* Pressure Bar */}
            <ProgressBar label="Pressure Anomaly" value={pressureAnomaly} max={30} color="bg-red-400" />
        </div>
    );
}

function ProgressBar({ label, value, max, color }) {
    const pct = Math.min(100, (value / max) * 100);
    return (
        <div className="mb-3">
            <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-400">{label}</span>
                <span className="text-white font-semibold">{Math.round(value)}/{max}</span>
            </div>
            <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${color} transition-all duration-500`} style={{ width: `${pct}%` }} />
            </div>
        </div>
    );
}
