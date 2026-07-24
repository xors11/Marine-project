import React, { useMemo, memo } from 'react';
import {
    ComposedChart, Line, Area, XAxis, YAxis, CartesianGrid,
    Tooltip, ResponsiveContainer, ReferenceLine, ReferenceArea,
} from 'recharts';
import { PARAMETERS } from '../data/constants';
import { computeStats, isAnomaly, zScore, classifyAnomaly, computeMovingAverage } from '../utils/anomaly';
import { linearForecast } from '../lib/forecastUtils';

// ─── Static style objects ─────────────────────────────────────────────────────
const CHART_MARGIN = { top: 10, right: 16, left: 0, bottom: 0 };
const GRID_STYLE = { strokeDasharray: '3 3', stroke: 'var(--color-abyss-800)', vertical: false };
const XAXIS_TICK = { fill: 'var(--color-abyss-300)', fontSize: 9 };
const XAXIS_LINE = { stroke: 'var(--color-abyss-800)' };
const YAXIS_TICK = { fill: 'var(--color-abyss-300)', fontSize: 10 };
const Y_DOMAIN = ['auto', 'auto'];

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

// Area fills — using CSS theme variables (opacity controlled via fillOpacity)
const AREA_FILLS = {
    sea_surface_temp: 'var(--color-temp)',
    wind_speed: 'var(--color-accent)',
    air_pressure: 'var(--color-violet)',
    wave_height: 'var(--color-green)',
};

// Normal range band colors — using CSS theme variables (opacity controlled via fillOpacity)
const BAND_FILLS = {
    sea_surface_temp: 'var(--color-temp)',
    wind_speed: 'var(--color-accent)',
    air_pressure: 'var(--color-violet)',
    wave_height: 'var(--color-green)',
};

// ─── Enhanced Custom Tooltip ─────────────────────────────────────────────────
function CustomTooltip({ active, payload, label }) {
    if (!active || !payload?.length) return null;

    const hasForecast = payload.some(e => e.payload?.isForecast);
    const hasAnomaly = payload.some(e => {
        const p = e.payload;
        if (!p || e.dataKey?.endsWith('_ma') || e.dataKey?.endsWith('_fc')) return false;
        return p._anomalyFlags?.[e.dataKey];
    });

    return (
        <div style={{
            background: 'var(--color-card)', border: '1px solid var(--color-accent)',
            borderRadius: '12px', padding: 'var(--space-3) var(--space-4)',
            fontSize: '0.85rem', backdropFilter: 'blur(12px)', minWidth: 220,
            boxShadow: '0 8px 32px rgba(0,0,0,0.4)'
        }}>
            <div style={{ color: 'var(--color-abyss-300)', fontWeight: 600, marginBottom: 8, fontSize: '0.75rem' }}>
                {label}
            </div>
            {payload.filter(e => !e.dataKey?.endsWith('_fc')).map((entry, idx) => {
                const isMA = entry.dataKey?.endsWith('_ma');
                const themeColor = getParamThemeColor(entry.dataKey?.replace('_ma', ''));
                return (
                    <div key={`${entry.dataKey}_${idx}`} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, color: themeColor, marginBottom: 3 }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            {entry.name}
                            {isMA && (
                                <span style={{ background: 'rgba(45,212,191,0.08)', border: '1px solid rgba(45,212,191,0.2)', borderRadius: 4, padding: '0 4px', fontSize: '0.58rem', color: 'var(--color-accent)' }}>
                                    24h trend
                                </span>
                            )}
                        </span>
                        <span className="data-value" style={{ fontWeight: 700, fontSize: '1rem', color: themeColor }}>
                            {entry.value != null ? Number(entry.value).toFixed(2) : '—'}
                        </span>
                    </div>
                );
            })}
            {hasForecast && (
                <div style={{ background: 'rgba(45, 212, 191, 0.08)', color: 'var(--color-accent)', border: '1px solid rgba(45, 212, 191, 0.2)' }} className="text-xs px-2 py-0.5 rounded font-semibold mt-2 text-center">
                    📈 Forecast projection
                </div>
            )}
            {hasAnomaly && (
                <div style={{ background: 'rgba(242, 102, 91, 0.08)', color: 'var(--color-danger)', border: '1px solid rgba(242, 102, 91, 0.2)' }} className="text-xs px-2 py-0.5 rounded font-semibold mt-2 text-center">
                    ⚠ Anomaly Detected
                </div>
            )}
        </div>
    );
}

// ─── Custom Dot: anomaly ring + forecast transparency ─────────────────────────
function SmartDot(props) {
    const { cx, cy, payload, dataKey, fieldMean, fieldStd } = props;
    if (!payload || payload[dataKey] == null || cx == null || cy == null) return null;

    // Forecast points: tiny dot
    if (payload.isForecast) {
        return null; // no dots on forecast line
    }

    // Anomaly detection
    if (isAnomaly(payload[dataKey], fieldMean, fieldStd)) {
        return (
            <g>
                <circle cx={cx} cy={cy} r={5} fill="var(--color-danger)" opacity={0.9} />
                <circle cx={cx} cy={cy} r={2.5} fill="var(--color-card)" />
            </g>
        );
    }

    return null; // No dot for normal points
}

// ─── Anomaly badge for chart header ──────────────────────────────────────────
function AnomalyBadge({ s }) {
    if (!s || s.anomalyCount === 0) return null;
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
            <div style={{ background: 'rgba(242, 102, 91, 0.08)', color: 'var(--color-danger)', border: '1px solid rgba(242, 102, 91, 0.2)' }} className="text-xs px-2 py-0.5 rounded font-semibold flex items-center gap-1">
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--color-danger)', display: 'inline-block' }} />
                {s.anomalyCount} anomal{s.anomalyCount === 1 ? 'y' : 'ies'}
            </div>
            {s.extremeCount > 0 && (
                <div style={{ background: 'rgba(242, 102, 91, 0.05)', color: 'var(--color-danger)', border: '1px solid rgba(242, 102, 91, 0.15)', opacity: 0.8 }} className="text-xs px-2 py-0.5 rounded font-semibold">
                    {s.extremeCount} extreme
                </div>
            )}
        </div>
    );
}

// ─── Chart Legend Row ─────────────────────────────────────────────────────────
function ChartLegend({ param }) {
    const themeColor = getParamThemeColor(param.key);
    return (
        <div className="flex gap-[var(--space-3)] mb-[var(--space-2)] text-xs text-[var(--color-abyss-400)] flex-wrap">
            <span className="flex items-center gap-1">
                <span style={{ width: 14, height: 2, background: themeColor, display: 'inline-block', borderRadius: 1 }} />
                Live reading
            </span>
            <span className="flex items-center gap-1">
                <span style={{ width: 14, height: 2, background: themeColor, opacity: 0.5, display: 'inline-block', borderRadius: 1, borderTop: '1px dashed' }} />
                12h forecast
            </span>
            <span className="flex items-center gap-1">
                <span style={{ width: 10, height: 8, background: themeColor, opacity: 0.1, display: 'inline-block', borderRadius: 2 }} />
                Normal range
            </span>
            <span className="flex items-center gap-1">
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--color-danger)', display: 'inline-block' }} />
                Anomaly point
            </span>
        </div>
    );
}

// ─── Per-parameter sub-chart ──────────────────────────────────────────────────
const ParamChart = memo(function ParamChart({ param, chartData, forecastData, stats, showMovingAverage, activeBuoy }) {
    const s = stats[param.key];
    const themeColor = getParamThemeColor(param.key);

    const activeDot = useMemo(
        () => ({ r: 5, fill: themeColor, stroke: '#fff', strokeWidth: 1 }),
        [themeColor]
    );

    const maKey = `${param.key}_ma`;
    const fcKey = `${param.key}_fc`;
    const areaFill = AREA_FILLS[param.key] || 'var(--color-accent)';
    const bandFill = BAND_FILLS[param.key] || 'var(--color-accent)';

    // Calculate μ±1σ bounds for reference band (Change 5)
    const upperBound = s?.mean != null && s?.std != null ? s.mean + s.std : null;
    const lowerBound = s?.mean != null && s?.std != null ? s.mean - s.std : null;

    // Merge live + forecast data for the chart
    const mergedData = useMemo(() => {
        if (!forecastData?.length) return chartData;
        // Add forecast values as separate key to chart data
        const combined = [...chartData];
        // Mark the boundary point — last live point also gets fc key
        if (combined.length > 0) {
            const last = { ...combined[combined.length - 1] };
            last[fcKey] = last[param.key];
            combined[combined.length - 1] = last;
        }
        // Append forecast rows
        forecastData.forEach(fc => {
            combined.push({
                ...fc,
                [fcKey]: fc[param.key],
                [param.key]: null, // null out the live key so main line stops
            });
        });
        return combined;
    }, [chartData, forecastData, param.key, fcKey]);

    // Find the x-label where forecast begins
    const forecastStartLabel = useMemo(() => {
        if (!forecastData?.length || !chartData.length) return null;
        return chartData[chartData.length - 1]?.label || null;
    }, [chartData, forecastData]);

    return (
        <div className="card mb-[var(--space-4)] overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: themeColor, display: 'inline-block', flexShrink: 0 }} />
                    <div style={{ width: 3, height: 18, borderRadius: 2, background: themeColor }} />
                    <span style={{ fontWeight: 700, fontSize: '0.9rem', color: themeColor }}>
                        {param.label}
                    </span>
                    <span className="md:hidden text-[9px] text-[var(--color-abyss-400)] ml-1">
                        · {activeBuoy?.name || 'RAMA 23003'}
                    </span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--color-abyss-300)', opacity: 0.7 }}>({param.unit})</span>
                </div>
                <div className="flex items-center gap-2">
                    {forecastData?.length > 0 && (
                        <span style={{ background: 'rgba(45, 212, 191, 0.08)', color: 'var(--color-accent)', border: '1px solid rgba(45, 212, 191, 0.2)' }} className="text-xs px-2 py-0.5 rounded font-semibold">
                            +{forecastData.length}h forecast
                        </span>
                    )}
                    <AnomalyBadge s={s} />
                </div>
            </div>

            {/* Legend */}
            <ChartLegend param={param} />

            <ResponsiveContainer width="100%" height={window.innerWidth < 768 ? 200 : 240}>
                <ComposedChart data={mergedData} margin={CHART_MARGIN}>
                    <CartesianGrid {...GRID_STYLE} />
                    <XAxis
                        dataKey="label"
                        tick={{ ...XAXIS_TICK, fontSize: window.innerWidth < 768 ? 10 : 9 }}
                        axisLine={XAXIS_LINE}
                        tickLine={false}
                        interval="preserveStartEnd"
                    />
                    <YAxis
                        domain={Y_DOMAIN}
                        tick={{ ...YAXIS_TICK, fontSize: window.innerWidth < 768 ? 11 : 10 }}
                        axisLine={false}
                        tickLine={false}
                        width={window.innerWidth < 768 ? 40 : 50}
                    />
                    <Tooltip content={<CustomTooltip />} />

                    {/* Normal range band μ±1σ (Change 5) */}
                    {lowerBound != null && upperBound != null && (
                        <ReferenceArea
                            y1={lowerBound}
                            y2={upperBound}
                            fill={bandFill}
                            fillOpacity={0.06}
                            stroke="none"
                        />
                    )}

                    {/* Mean reference line */}
                    {s?.mean != null && (
                        <ReferenceLine
                            y={s.mean}
                            stroke="var(--color-accent)"
                            strokeOpacity={0.35}
                            strokeDasharray="5 3"
                            label={{ value: `μ ${Number(s.mean).toFixed(1)}`, position: 'insideTopRight', fill: 'var(--color-accent)', opacity: 0.6, fontSize: 10 }}
                        />
                    )}

                    {/* Anomaly threshold μ+2σ */}
                    {s?.anomalyThreshold != null && (
                        <ReferenceLine
                            y={s.anomalyThreshold}
                            stroke="var(--color-danger)"
                            strokeOpacity={0.4}
                            strokeDasharray="4 4"
                            label={{ value: 'μ+2σ', position: 'insideTopRight', fill: 'var(--color-danger)', opacity: 0.6, fontSize: 10 }}
                        />
                    )}

                    {/* Forecast divider line (Change 6) */}
                    {forecastStartLabel && (
                        <ReferenceLine
                            x={forecastStartLabel}
                            stroke={themeColor}
                            strokeOpacity={0.4}
                            strokeDasharray="4 3"
                            label={{ value: 'forecast →', position: 'insideTopRight', fill: themeColor, fontSize: 10, opacity: 0.5 }}
                        />
                    )}

                    {/* Area fill under live data (Change 4) */}
                    <Area
                        type="monotone"
                        dataKey={param.key}
                        fill={areaFill}
                        fillOpacity={0.12}
                        stroke="none"
                        isAnimationActive={false}
                    />

                    {/* Main data line with anomaly dots */}
                    <Line
                        type="monotone"
                        dataKey={param.key}
                        name={param.label}
                        stroke={themeColor}
                        strokeWidth={2}
                        dot={(dotProps) => (
                            <SmartDot
                                key={dotProps.index}
                                {...dotProps}
                                dataKey={param.key}
                                fieldMean={s?.mean}
                                fieldStd={s?.std}
                            />
                        )}
                        activeDot={activeDot}
                        connectNulls={false}
                        isAnimationActive={false}
                    />

                    {/* Forecast dashed line (Change 6) */}
                    <Line
                        type="monotone"
                        dataKey={fcKey}
                        name="Forecast"
                        stroke={themeColor}
                        strokeWidth={2}
                        strokeOpacity={0.6}
                        strokeDasharray="5 3"
                        dot={false}
                        activeDot={false}
                        connectNulls
                        isAnimationActive={false}
                    />

                    {/* 24-hour moving average overlay */}
                    {showMovingAverage && (
                        <Line
                            type="monotone"
                            dataKey={maKey}
                            name="24h MA"
                            stroke={themeColor}
                            strokeWidth={1.5}
                            strokeOpacity={0.45}
                            strokeDasharray="6 3"
                            dot={false}
                            activeDot={false}
                            connectNulls
                            isAnimationActive={false}
                        />
                    )}
                </ComposedChart>
            </ResponsiveContainer>
        </div>
    );
});

// ─── Main Export ──────────────────────────────────────────────────────────────
const OceanChart = memo(function OceanChart({ data, activeParams, showMovingAverage = false, timeWindow = '5D', activeBuoy }) {
    // Build chart data from full data
    const chartData = useMemo(() => {
        const rows = data.map((row) => ({
            ...row,
            label: (() => {
                try {
                    const d = new Date(row.timestamp);
                    return d.toLocaleString('en-GB', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
                } catch { return row.timestamp; }
            })(),
        }));

        // Inject MA columns
        if (showMovingAverage) {
            PARAMETERS
                .filter((p) => activeParams.includes(p.key))
                .forEach((p) => {
                    const maValues = computeMovingAverage(data, p.key, 24);
                    maValues.forEach((v, i) => { rows[i][`${p.key}_ma`] = v; });
                });
        }

        return rows;
    }, [data, activeParams, showMovingAverage]);

    // Time window filtering (Change 3)
    const filteredChartData = useMemo(() => {
        const windowMs = {
            '6H': 6 * 60 * 60 * 1000,
            '12H': 12 * 60 * 60 * 1000,
            '24H': 24 * 60 * 60 * 1000,
            '48H': 48 * 60 * 60 * 1000,
            '5D': 5 * 24 * 60 * 60 * 1000,
        }[timeWindow] || 5 * 24 * 60 * 60 * 1000;
        const cutoff = Date.now() - windowMs;
        const filtered = chartData.filter(d => {
            try { return new Date(d.timestamp).getTime() >= cutoff; }
            catch { return true; }
        });
        return filtered.length > 0 ? filtered : chartData; // fallback to full data if filter empties
    }, [chartData, timeWindow]);

    // Compute forecast data per param (Change 6) — always from FULL data
    const forecastSteps = timeWindow === '6H' ? 6 : 12;
    const forecastMap = useMemo(() => {
        const map = {};
        PARAMETERS
            .filter((p) => activeParams.includes(p.key))
            .forEach((p) => {
                map[p.key] = linearForecast(data, p.key, forecastSteps, 3600000);
            });
        return map;
    }, [data, activeParams, forecastSteps]);

    const stats = useMemo(
        () => Object.fromEntries(
            PARAMETERS
                .filter((p) => activeParams.includes(p.key))
                .map((p) => [p.key, computeStats(data, p.key)])
        ),
        [data, activeParams]
    );

    const paramsToRender = useMemo(
        () => PARAMETERS.filter(
            (p) => activeParams.includes(p.key) || (typeof window !== 'undefined' && window.innerWidth < 768)
        ),
        [activeParams]
    );

    if (!data.length) {
        return (
            <div className="card flex items-center justify-center" style={{ height: 300, color: 'var(--color-abyss-300)' }}>
                No data available — check your backend connection.
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-2">
            {paramsToRender.map((param) => (
                <ParamChart
                    key={param.key}
                    param={param}
                    chartData={filteredChartData}
                    forecastData={forecastMap[param.key]}
                    stats={stats}
                    showMovingAverage={showMovingAverage}
                    activeBuoy={activeBuoy}
                />
            ))}
        </div>
    );
});

export default OceanChart;

// Expose computeAllStats for App.jsx
OceanChart.computeStats = (data, activeParams) =>
    Object.fromEntries(
        PARAMETERS
            .filter((p) => activeParams.includes(p.key))
            .map((p) => [p.key, computeStats(data, p.key)])
    );
