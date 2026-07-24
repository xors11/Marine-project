import React, { useMemo, memo } from 'react';
import { computeStats } from '../utils/anomaly';

export const LIVE_ANALYTICS_PARAMS = [
    { key: 'sea_surface_temp', label: 'Sea Surface Temperature', unit: '°C' },
    { key: 'wind_speed', label: 'Wind Speed', unit: 'm/s' },
    { key: 'wave_height', label: 'Wave Height', unit: 'm' },
    { key: 'air_pressure', label: 'Air Pressure', unit: 'hPa' },
];

export const HIST_ANALYTICS_PARAMS = [
    { key: 'WTMP', label: 'Sea Surface Temperature', unit: '°C' },
    { key: 'WSPD', label: 'Wind Speed', unit: 'm/s' },
    { key: 'WVHT', label: 'Wave Height', unit: 'm' },
    { key: 'PRES', label: 'Air Pressure', unit: 'hPa' },
];

const getParamThemeColor = (key) => {
    switch (key) {
        case 'sea_surface_temp':
        case 'WTMP':
            return 'var(--color-temp)';
        case 'wind_speed':
        case 'WSPD':
            return 'var(--color-accent)';
        case 'air_pressure':
        case 'PRES':
            return 'var(--color-violet)';
        case 'wave_height':
        case 'WVHT':
            return 'var(--color-green)';
        default:
            return 'var(--color-accent)';
    }
};

function TrendBadge({ trend }) {
    const map = {
        Increasing: { icon: '▲', bg: 'rgba(111, 207, 151, 0.08)', color: 'var(--color-green)', label: 'Increasing' },
        Decreasing: { icon: '▼', bg: 'rgba(242, 102, 91, 0.08)', color: 'var(--color-danger)', label: 'Decreasing' },
        Stable: { icon: '━', bg: 'rgba(36, 144, 204, 0.08)', color: 'var(--color-abyss-400)', label: 'Stable' },
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
            <span style={{ fontSize: '10px', fontWeight: 800, color: 'var(--color-abyss-400)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {label}
            </span>
            <span className="data-value" style={{ fontSize: '18px', fontWeight: 900, color }}>
                {value !== null && value !== undefined ? Number(value).toFixed(2) : '—'}
                <span style={{ fontSize: '11px', fontWeight: 600, color, opacity: 0.5, marginLeft: 2 }}>{unit}</span>
            </span>
        </div>
    );
}

const AnalyticsCard = memo(function AnalyticsCard({ param, stats }) {
    const s = stats[param.key];
    if (!s) return null;

    const themeColor = getParamThemeColor(param.key);
    const hasAnomalies = s.anomalyCount > 0;

    return (
        <div className="card relative overflow-hidden">
            {/* Background glow */}
            <div style={{
                position: 'absolute', top: -24, right: -24,
                width: 90, height: 90, borderRadius: '50%',
                background: themeColor,
                opacity: 0.06,
                pointerEvents: 'none',
            }} />

            {/* Card header */}
            <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                borderBottom: '1px solid var(--color-abyss-800)', paddingBottom: 9, marginBottom: 11,
                flexWrap: 'wrap', gap: '0.4rem'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: themeColor, flexShrink: 0 }} />
                    <span style={{ fontWeight: 700, fontSize: '0.875rem', color: themeColor }}>
                        {param.label}
                    </span>
                </div>
                <TrendBadge trend={s.trend} />
            </div>

            {/* Stat pills */}
            <div style={{
                display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 12
            }}>
                <StatPill label="Mean" value={s.mean} unit={param.unit} color={themeColor} />
                <StatPill label="Min" value={s.min} unit={param.unit} color="var(--color-abyss-300)" />
                <StatPill label="Max" value={s.max} unit={param.unit} color="var(--color-accent)" />
            </div>

            {/* Std Dev */}
            <div style={{ fontSize: '12px', marginBottom: hasAnomalies ? '11px' : 0 }}>
                <span style={{ color: 'var(--color-abyss-400)' }}>Std Dev: </span>
                <span style={{ color: themeColor, fontWeight: 700 }}>
                    {s.std !== null && s.std !== undefined ? Number(s.std).toFixed(2) : '—'}
                    <span style={{ fontSize: '9px', opacity: 0.4, marginLeft: 2 }}>{param.unit}</span>
                </span>
            </div>

            {/* Anomaly summary */}
            {hasAnomalies && (
                <div style={{
                    display: 'flex', gap: 4, flexWrap: 'wrap',
                    paddingTop: '0.75rem', borderTop: '1px solid var(--color-abyss-800)'
                }}>
                    <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 4,
                        background: 'rgba(242, 102, 91, 0.08)', border: '1px solid rgba(242, 102, 91, 0.2)',
                        borderRadius: 99, padding: '2px 6px',
                        fontSize: '8px', color: 'var(--color-danger)', fontWeight: 700,
                    }}>
                        <span style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--color-danger)', display: 'inline-block' }} />
                        {s.anomalyCount} anomal{s.anomalyCount === 1 ? 'y' : 'ies'}
                    </span>

                    {s.moderateCount > 0 && (
                        <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: 3,
                            background: 'rgba(240, 169, 78, 0.08)', border: '1px solid rgba(240, 169, 78, 0.2)',
                            borderRadius: 99, padding: '2px 6px',
                            fontSize: '8px', color: 'var(--color-amber)', fontWeight: 700,
                        }}>
                            {s.moderateCount} moderate
                        </span>
                    )}

                    {s.extremeCount > 0 && (
                        <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: 3,
                            background: 'rgba(242, 102, 91, 0.08)', border: '1px solid rgba(242, 102, 91, 0.2)',
                            borderRadius: 99, padding: '2px 6px',
                            fontSize: '8px', color: 'var(--color-danger)', fontWeight: 700,
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
                <div style={{ width: 2, height: 11, background: 'var(--color-accent)' }} />
                <div style={{
                    fontSize: '9px', fontWeight: 700,
                    color: 'var(--color-abyss-300)', textTransform: 'uppercase',
                }}>
                    OCEAN ANALYTICS SUMMARY
                </div>
            </div>

            {/* Grid of cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
                {params.map((param) => (
                    <AnalyticsCard key={param.key} param={param} stats={stats} />
                ))}
            </div>
        </div>
    );
});

export default OceanAnalyticsSummary;
