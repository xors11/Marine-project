import React from 'react';

export default function FisheriesImpactPanel({ totalRisk }) {
    if (totalRisk > 60) {
        return (
            <div className="card" style={{ borderLeft: '4px solid var(--color-danger)' }}>
                <div className="flex items-center gap-2 mb-3">
                    <span className="text-lg">🔴</span>
                    <span className="text-[var(--color-danger)] text-sm font-bold uppercase tracking-wider">High Disruption</span>
                </div>
                <div className="text-[var(--color-abyss-300)] text-sm mb-2">Severe conditions. Fishing operations suspended.</div>
                <div className="flex flex-wrap gap-2">
                    {['Bluefin Tuna', 'Sailfish', 'Oceanic Shark', 'Marlin'].map(s => (
                        <span key={s} className="bg-[rgba(242,102,91,0.08)] text-[var(--color-danger)] text-xs px-2 py-1 rounded-full border border-[rgba(242,102,91,0.2)]">{s}</span>
                    ))}
                </div>
                <div className="mt-3 bg-[rgba(242,102,91,0.08)] border border-[rgba(242,102,91,0.2)] rounded-lg p-2 text-center text-[var(--color-danger)] text-xs font-semibold">
                    🚨 Seek Safe Harbor — Severe Seas Likely
                </div>
            </div>
        );
    }

    if (totalRisk >= 40) {
        return (
            <div className="card" style={{ borderLeft: '4px solid var(--color-amber)' }}>
                <div className="flex items-center gap-2 mb-3">
                    <span className="text-lg">🟠</span>
                    <span className="text-[var(--color-amber)] text-sm font-bold uppercase tracking-wider">Moderate Disruption</span>
                </div>
                <div className="text-[var(--color-abyss-300)] text-sm mb-2">Rough seas. Coastal fishing restricted.</div>
                <div className="flex flex-wrap gap-2">
                    {['Coastal species', 'Reef fish'].map(s => (
                        <span key={s} className="bg-[rgba(240,169,78,0.08)] text-[var(--color-amber)] text-xs px-2 py-1 rounded-full border border-[rgba(240,169,78,0.2)]">{s}</span>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="card" style={{ borderLeft: '4px solid var(--color-green)' }}>
            <div className="flex items-center gap-2 mb-3">
                <span className="text-lg">🟢</span>
                <span className="text-[var(--color-green)] text-sm font-bold uppercase tracking-wider">Low Impact</span>
            </div>
            <div className="text-[var(--color-abyss-300)] text-sm">Normal vessel operations. No disruption expected.</div>
        </div>
    );
}
