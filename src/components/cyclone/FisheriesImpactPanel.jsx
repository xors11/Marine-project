import React from 'react';

export default function FisheriesImpactPanel({ totalRisk }) {
    if (totalRisk > 60) {
        return (
            <div className="bg-slate-900 border border-red-500/30 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                    <span className="text-lg">🔴</span>
                    <span className="text-red-400 text-sm font-bold uppercase tracking-wider">High Disruption</span>
                </div>
                <div className="text-slate-300 text-sm mb-2">Severe conditions. Fishing operations suspended.</div>
                <div className="flex flex-wrap gap-2">
                    {['Bluefin Tuna', 'Sailfish', 'Oceanic Shark', 'Marlin'].map(s => (
                        <span key={s} className="bg-red-500/10 text-red-300 text-xs px-2 py-1 rounded-full border border-red-500/20">{s}</span>
                    ))}
                </div>
                <div className="mt-3 bg-red-500/10 border border-red-500/20 rounded-lg p-2 text-center text-red-400 text-xs font-semibold">
                    🚨 Seek Safe Harbor — Severe Seas Likely
                </div>
            </div>
        );
    }

    if (totalRisk >= 40) {
        return (
            <div className="bg-slate-900 border border-amber-500/30 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                    <span className="text-lg">🟠</span>
                    <span className="text-amber-400 text-sm font-bold uppercase tracking-wider">Moderate Disruption</span>
                </div>
                <div className="text-slate-300 text-sm mb-2">Rough seas. Coastal fishing restricted.</div>
                <div className="flex flex-wrap gap-2">
                    {['Coastal species', 'Reef fish'].map(s => (
                        <span key={s} className="bg-amber-500/10 text-amber-300 text-xs px-2 py-1 rounded-full border border-amber-500/20">{s}</span>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="bg-slate-900 border border-green-500/30 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
                <span className="text-lg">🟢</span>
                <span className="text-green-400 text-sm font-bold uppercase tracking-wider">Low Impact</span>
            </div>
            <div className="text-slate-300 text-sm">Normal vessel operations. No disruption expected.</div>
        </div>
    );
}
