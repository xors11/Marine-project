import React, { useMemo, memo } from 'react';
import { computeStats } from '../utils/anomaly';

export const LIVE_ANALYTICS_PARAMS = [
    { key: 'sea_surface_temp', label: 'Sea Surface Temperature', unit: '°C', color: '#00d4ff' },
    { key: 'wind_speed', label: 'Wind Speed', unit: 'm/s', color: '#4db8e8' },
    { key: 'wave_height', label: 'Wave Height', unit: 'm', color: '#38bdf8' },
    { key: 'air_pressure', label: 'Air Pressure', unit: 'hPa', color: '#fbbf24' },
];

export const HIST_ANALYTICS_PARAMS = [
    { key: 'WTMP', label: 'Sea Surface Temperature', unit: '°C', color: '#00d4ff' },
    { key: 'WSPD', label: 'Wind Speed', unit: 'm/s', color: '#4db8e8' },
    { key: 'WVHT', label: 'Wave Height', unit: 'm', color: '#38bdf8' },
    { key: 'PRES', label: 'Air Pressure', unit: 'hPa', color: '#fbbf24' },
];

function TrendBadge({ trend }) {
    const map = {
        Increasing: { icon: '▲', bg: 'rgba(20,83,45,.25)', color: '#4ade80', label: 'Increasing' },
        Decreasing: { icon: '▼', bg: 'rgba(127,29,29,.2)', color: '#f87171', label: 'Decreasing' },
        Stable: { icon: '━', bg: 'rgba(51,65,85,.32)', color: '#64748b', label: 'Stable' },
    };
    const t = map[trend] || map.Stable;
    return (
        <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            background: t.bg, color: t.color,
            borderRadius: 99, padding: '0.18rem 0.55rem',
            fontSize: '0.68rem', fontWeight: 700,
            letterSpacing: '0.03em',
        }}>
            {t.icon} {t.label}
        </span>
    );
}

function StatPill({ label, value, unit, color }) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <span style={{ fontSize: '10px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {label}
            </span>
            <span style={{ fontSize: '18px', fontWeight: 900, color }}>
                {value !== null && value !== undefined ? Number(value).toFixed(2) : '—'}
                <span style={{ fontSize: '11px', fontWeight: 600, color, opacity: 0.5, marginLeft: 2 }}>{unit}</span>
            </span>
        </div>
    );
}

const AnalyticsCard = memo(function AnalyticsCard({ param, stats }) {
    const s = stats[param.key];
    if (!s) return null;

    const hasAnomalies = s.anomalyCount > 0;

    return (
        <div style={{
            background: 'rgba(6,13,28,.95)',
            border: '1px solid rgba(51,65,85,.5)',
            borderRadius: 14,
            padding: '18px 20px',
            position: 'relative',
            overflow: 'hidden'
        }}>
            {/* Background glow */}
            <div style={{
                position: 'absolute', top: -24, right: -24,
                width: 90, height: 90, borderRadius: '50%',
                background: `radial-gradient(circle, ${param.color}22, transparent 70%)`,
                pointerEvents: 'none',
            }} />

            {/* Card header */}
            <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                borderBottom: '1px solid rgba(51,65,85,.22)', paddingBottom: 9, marginBottom: 11,
                flexWrap: 'wrap', gap: '0.4rem'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: param.color, flexShrink: 0 }} />
                    <span style={{ fontWeight: 700, fontSize: '0.875rem', color: param.color }}>
                        {param.label}
                    </span>
                </div>
                <TrendBadge trend={s.trend} />
            </div>

            {/* Stat pills */}
            <div style={{
                display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 12
            }}>
                <StatPill label="Mean" value={s.mean} unit={param.unit} color={param.color} />
                <StatPill label="Min" value={s.min} unit={param.unit} color="#4db8e8" />
                <StatPill label="Max" value={s.max} unit={param.unit} color="#00d4ff" />
            </div>

            {/* Std Dev */}
            <div style={{ fontSize: '12px', marginBottom: hasAnomalies ? '11px' : 0 }}>
                <span style={{ color: '#334155' }}>Std Dev: </span>
                <span style={{ color: param.color, fontWeight: 700 }}>
                    {s.std !== null && s.std !== undefined ? Number(s.std).toFixed(2) : '—'}
                    <span style={{ fontSize: '9px', opacity: 0.4, marginLeft: 2 }}>{param.unit}</span>
                </span>
            </div>

            {/* Anomaly summary */}
            {hasAnomalies && (
                <div style={{
                    display: 'flex', gap: 4, flexWrap: 'wrap',
                    paddingTop: '0.75rem', borderTop: '1px solid rgba(51,65,85,.22)'
                }}>
                    <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 4,
                        background: 'rgba(255,77,109,0.10)', border: '1px solid rgba(255,77,109,0.28)',
                        borderRadius: 99, padding: '2px 6px',
                        fontSize: '8px', color: '#ff4d6d', fontWeight: 700,
                    }}>
                        <span style={{ width: 4, height: 4, borderRadius: '50%', background: '#ff4d6d', display: 'inline-block' }} />
                        {s.anomalyCount} anomal{s.anomalyCount === 1 ? 'y' : 'ies'}
                    </span>

                    {s.moderateCount > 0 && (
                        <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: 3,
                            background: 'rgba(251,146,60,0.10)', border: '1px solid rgba(251,146,60,0.28)',
                            borderRadius: 99, padding: '2px 6px',
                            fontSize: '8px', color: '#fb923c', fontWeight: 700,
                        }}>
                            {s.moderateCount} moderate
                        </span>
                    )}

                    {s.extremeCount > 0 && (
                        <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: 3,
                            background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.28)',
                            borderRadius: 99, padding: '2px 6px',
                            fontSize: '8px', color: '#ef4444', fontWeight: 700,
                        }}>
                            {s.extremeCount} extreme
                        </span>
                    )}
                </div>
            )}
        </div>
    );
});

const OceanAnalyticsSummary = memo(function OceanAnalyticsSummary({ data, params }) {
    const stats = useMemo(() => {
        if (!data || !data.length) return {};
        return Object.fromEntries(params.map((p) => [p.key, computeStats(data, p.key)]));
    }, [data, params]);

    if (!data || !data.length) return null;

    return (
        <div>
            {/* Section header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: '0.75rem' }}>
                <div style={{ width: 2, height: 11, background: 'rgba(0,212,255,.35)' }} />
                <div style={{
                    fontSize: '9px', fontWeight: 700,
                    color: '#155e75', textTransform: 'uppercase',
                }}>
                    OCEAN ANALYTICS SUMMARY
                </div>
            </div>

            {/* Grid of cards */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: window.innerWidth < 768 ? '1fr' : 'repeat(3, 1fr)',
                gap: '12px',
            }}>
                {params.map((param) => (
                    <AnalyticsCard key={param.key} param={param} stats={stats} />
                ))}
            </div>
        </div>
    );
});

export default OceanAnalyticsSummary;
