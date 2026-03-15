import React, { useMemo, memo } from 'react';
import {
    ComposedChart, Line, Area, XAxis, YAxis, CartesianGrid,
    Tooltip, ResponsiveContainer, ReferenceLine, ReferenceArea
} from 'recharts';
import { computeStats, computeMovingAverage, isAnomaly, zScore, classifyAnomaly } from '../utils/anomaly';

// ─── Historical chart configuration — distinct colors per parameter ──────────
const HIST_PARAMS = [
    { key: 'WTMP', label: 'Water Temperature', unit: '°C', color: '#f97316', areaFill: '#f9731610' },
    { key: 'WSPD', label: 'Wind Speed', unit: 'm/s', color: '#22d3ee', areaFill: '#22d3ee08' },
    { key: 'WVHT', label: 'Wave Height', unit: 'm', color: '#4ade80', areaFill: '#4ade8008' },
    { key: 'PRES', label: 'Air Pressure', unit: 'hPa', color: '#a78bfa', areaFill: '#a78bfa08' },
];

export { HIST_PARAMS };

// Stable axis / grid style objects — defined once, not recreated per render
const GRID_STYLE = { strokeDasharray: '3 3', stroke: 'rgba(36,144,204,0.1)', vertical: false };
const XAXIS_STYLE = { fill: '#4db8e8', fontSize: 9 };
const XAXIS_LINE = { stroke: 'rgba(36,144,204,0.2)' };
const YAXIS_STYLE = { fill: '#4db8e8', fontSize: 10 };
const ACTIVE_DOT = { r: 5, stroke: '#fff', strokeWidth: 1 };

// ─── Enhanced Tooltip ────────────────────────────────────────────────────────
function HistTooltip({ active, payload, label, unit }) {
    if (!active || !payload?.length) return null;
    return (
        <div style={{
            background: '#0a1628',
            border: '1px solid #22d3ee',
            borderRadius: '8px',
            padding: '10px 14px',
            fontSize: '0.78rem',
            backdropFilter: 'blur(12px)',
            minWidth: 200,
        }}>
            <div style={{ color: '#94a3b8', fontWeight: 600, marginBottom: 6, fontSize: '0.68rem' }}>{label}</div>
            {payload.map((entry) => {
                let name = entry.name;
                if (entry.dataKey?.includes('_rama-23003')) name = 'RAMA 23003';
                else if (entry.dataKey?.includes('_north-indian')) name = 'N. Indian Ocean';
                else if (entry.dataKey?.includes('_bay-of-bengal')) name = 'Bay of Bengal';

                const isMA = entry.dataKey?.endsWith('_ma');
                const isCompare = entry.dataKey?.startsWith('compare_');

                return (
                    <div
                        key={entry.dataKey}
                        style={{ display: 'flex', justifyContent: 'space-between', gap: 12, color: entry.color, marginBottom: 3 }}
                    >
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            {name}
                            {isMA && (
                                <span style={{
                                    background: 'rgba(0,212,255,0.1)', border: '1px solid rgba(0,212,255,0.25)',
                                    borderRadius: 4, padding: '0 4px', fontSize: '0.58rem', color: '#22d3ee',
                                }}>24h trend</span>
                            )}
                            {isCompare && (
                                <span style={{
                                    background: 'rgba(168,85,247,0.1)', border: '1px solid rgba(168,85,247,0.25)',
                                    borderRadius: 4, padding: '0 4px', fontSize: '0.58rem', color: '#a855f7',
                                }}>compare</span>
                            )}
                        </span>
                        <span style={{ fontWeight: 700, fontSize: '1rem', color: entry.color === 'rgba(255,255,255,0.4)' ? '#e2e8f0' : entry.color }}>
                            {entry.value != null ? `${Number(entry.value).toFixed(2)} ${unit}` : '—'}
                        </span>
                    </div>
                );
            })}
            {payload.some(e => e.payload?._isAnomaly?.[e.dataKey]) && (
                <div style={{
                    background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)',
                    borderRadius: 4, padding: '2px 6px', marginTop: 6,
                    fontSize: '0.65rem', color: '#f87171', fontWeight: 700, textAlign: 'center',
                }}>
                    ⚠ Extreme Anomaly
                </div>
            )}
        </div>
    );
}

// ─── Anomaly Dot (red circle at anomaly points) ──────────────────────────────
function AnomalyDot(props) {
    const { cx, cy, payload, dataKey, fieldMean, fieldStd } = props;
    if (!payload || payload[dataKey] == null) return null;
    if (!isAnomaly(payload[dataKey], fieldMean, fieldStd)) return null;
    const z = zScore(payload[dataKey], fieldMean, fieldStd);
    const cls = classifyAnomaly(z);
    const color = cls === 'extreme' ? '#f87171' : '#fb923c';
    return (
        <g>
            <circle cx={cx} cy={cy} r={6} fill="none" stroke={color} strokeWidth={2} opacity={0.8} />
            <circle cx={cx} cy={cy} r={3} fill={color} opacity={0.9} />
        </g>
    );
}

// ─── Anomaly badge ────────────────────────────────────────────────────────────
function AnomalyBadge({ s }) {
    if (!s || s.anomalyCount === 0) return null;
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
            <div style={{
                display: 'flex', alignItems: 'center', gap: 5,
                background: 'rgba(255,77,109,0.12)', border: '1px solid rgba(255,77,109,0.3)',
                borderRadius: 99, padding: '0.2rem 0.6rem',
                fontSize: '0.68rem', color: '#ff4d6d', fontWeight: 700,
            }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#ff4d6d', display: 'inline-block' }} />
                {s.anomalyCount} anomal{s.anomalyCount === 1 ? 'y' : 'ies'}
            </div>
            {s.moderateCount > 0 && (
                <div style={{
                    background: 'rgba(251,146,60,0.10)', border: '1px solid rgba(251,146,60,0.28)',
                    borderRadius: 99, padding: '0.2rem 0.5rem',
                    fontSize: '0.65rem', color: '#fb923c', fontWeight: 700,
                }}>{s.moderateCount} mod</div>
            )}
            {s.extremeCount > 0 && (
                <div style={{
                    background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.28)',
                    borderRadius: 99, padding: '0.2rem 0.5rem',
                    fontSize: '0.65rem', color: '#ef4444', fontWeight: 700,
                }}>{s.extremeCount} extreme</div>
            )}
        </div>
    );
}

// ─── Single parameter chart — memoized ────────────────────────────────────────
const HistParamChart = memo(function HistParamChart({ param, chartData, stats, showMovingAverage, compareData, compareYear, locationId = 'rama-23003' }) {
    const s = stats[param.key];
    const ALL_BUOYS = ['rama-23003', 'north-indian', 'bay-of-bengal'];
    const OTHER_BUOYS = ALL_BUOYS.filter(id => id !== locationId);

    const validCount = useMemo(
        () => chartData.filter(r => !isNaN(r[`${param.key}_${locationId}`])).length,
        [chartData, param.key, locationId]
    );

    const activeDot = useMemo(
        () => ({ ...ACTIVE_DOT, fill: param.color }),
        [param.color]
    );

    const primaryKey = `${param.key}_${locationId}`;
    const maKey = `${primaryKey}_ma`;
    const compareKey = `compare_${param.key}`;

    // Find extreme anomaly x-positions for vertical reference lines
    const extremeXPositions = useMemo(() => {
        if (!s) return [];
        return chartData
            .filter(row => {
                const val = row[primaryKey];
                if (val == null || isNaN(val) || !s.mean || !s.std) return false;
                const z = zScore(val, s.mean, s.std);
                return classifyAnomaly(z) === 'extreme';
            })
            .map(row => row.label)
            .slice(0, 10); // limit to 10 for readability
    }, [chartData, primaryKey, s]);

    // Cross-buoy anomaly detection (ReferenceArea generation)
    const crossAnomalyRegions = useMemo(() => {
        if (!s || !s.mean || !s.std) return [];
        const regions = [];
        let inAnomaly = false;
        let startX = null;

        chartData.forEach((row, i) => {
            const v1 = row[`${param.key}_rama-23003`];
            const v2 = row[`${param.key}_north-indian`];
            const v3 = row[`${param.key}_bay-of-bengal`];

            if (v1 != null && v2 != null && v3 != null) {
                const z1 = zScore(v1, s.mean, s.std);
                const z2 = zScore(v2, s.mean, s.std);
                const z3 = zScore(v3, s.mean, s.std);

                const c1 = classifyAnomaly(z1);
                const c2 = classifyAnomaly(z2);
                const c3 = classifyAnomaly(z3);

                // Assuming "anomaly" means anything not 'normal'
                const isAllAnomaly = (c1 !== 'normal') && (c2 !== 'normal') && (c3 !== 'normal');

                if (isAllAnomaly && !inAnomaly) {
                    inAnomaly = true;
                    startX = row.label;
                } else if (!isAllAnomaly && inAnomaly) {
                    inAnomaly = false;
                    regions.push({ start: startX, end: row.label });
                }
            }
        });

        // Close trailing region
        if (inAnomaly && chartData.length > 0) {
            regions.push({ start: startX, end: chartData[chartData.length - 1].label });
        }
        return regions;
    }, [chartData, param.key, s]);

    return (
        <div className="bg-slate-900 border border-slate-700 rounded-xl p-5">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <span style={{
                        width: 8, height: 8, borderRadius: '50%',
                        background: param.color, display: 'inline-block', flexShrink: 0,
                    }} />
                    <div style={{ width: 3, height: 18, borderRadius: 2, background: param.color }} />
                    <span style={{ fontWeight: 700, fontSize: '0.9rem', color: param.color }}>
                        {param.label}
                    </span>
                    <span style={{ fontSize: '0.7rem', color: '#4db8e8', opacity: 0.7 }}>({param.unit})</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <AnomalyBadge s={s} />
                    <span style={{
                        background: 'rgba(36,144,204,0.10)',
                        border: '1px solid rgba(36,144,204,0.2)',
                        borderRadius: 99, padding: '0.2rem 0.6rem',
                        fontSize: '0.68rem', color: '#4db8e8',
                    }}>
                        {validCount} pts
                    </span>
                </div>
            </div>

            {/* Compare legend */}
            {compareYear && (
                <div style={{ display: 'flex', gap: 12, marginBottom: 8, fontSize: '0.7rem' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ width: 16, height: 2, background: param.color, display: 'inline-block' }} />
                        <span style={{ color: '#94a3b8' }}>Selected year</span>
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ width: 16, height: 2, background: param.color, opacity: 0.4, display: 'inline-block', borderTop: '1px dashed' }} />
                        <span style={{ color: '#94a3b8' }}>Compare ({compareYear})</span>
                    </span>
                </div>
            )}

            <ResponsiveContainer width="100%" height={240}>
                <ComposedChart data={chartData} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
                    <CartesianGrid {...GRID_STYLE} />
                    <XAxis
                        dataKey="label"
                        tick={XAXIS_STYLE}
                        axisLine={XAXIS_LINE}
                        tickLine={false}
                        interval="preserveStartEnd"
                    />
                    <YAxis
                        domain={['auto', 'auto']}
                        tick={YAXIS_STYLE}
                        axisLine={false}
                        tickLine={false}
                        width={50}
                    />
                    <Tooltip content={<HistTooltip unit={param.unit} />} />

                    {/* Extreme anomaly reference lines */}
                    {extremeXPositions.map((x, i) => (
                        <ReferenceLine
                            key={`ref-${i}`}
                            x={x}
                            stroke="#f87171"
                            strokeWidth={1}
                            strokeDasharray="3 2"
                            strokeOpacity={0.6}
                        />
                    ))}

                    {/* Cross-Buoy Anomaly Bands */}
                    {crossAnomalyRegions.map((r, i) => (
                        <ReferenceArea
                            key={`cross-${i}`}
                            x1={r.start}
                            x2={r.end}
                            fill="#f87171"
                            fillOpacity={0.15}
                        />
                    ))}

                    {/* Secondary buoys lines */}
                    {OTHER_BUOYS.filter(bId => bId !== locationId).map(bId => (
                        <Line
                            key={bId}
                            type="monotone"
                            dataKey={`${param.key}_${bId}`}
                            stroke="rgba(255,255,255,0.4)"
                            strokeWidth={1}
                            strokeDasharray="5 5"
                            dot={false}
                            isAnimationActive={false}
                        />
                    ))}

                    {/* Area fill for primary */}
                    <Area
                        type="monotone"
                        dataKey={primaryKey}
                        fill={param.areaFill}
                        stroke="none"
                        isAnimationActive={false}
                    />

                    {/* Main data line */}
                    <Line
                        type="monotone"
                        dataKey={primaryKey}
                        name={param.label}
                        stroke={param.color}
                        strokeWidth={2}
                        dot={(dotProps) => (
                            <AnomalyDot
                                key={dotProps.index}
                                {...dotProps}
                                dataKey={primaryKey}
                                fieldMean={s?.mean}
                                fieldStd={s?.std}
                            />
                        )}
                        activeDot={activeDot}
                        connectNulls={false}
                        isAnimationActive={false}
                    />

                    {/* Compare year overlay */}
                    {compareYear && (
                        <Line
                            type="monotone"
                            dataKey={compareKey}
                            name={`${param.label} (${compareYear})`}
                            stroke={param.color}
                            strokeWidth={1.5}
                            strokeOpacity={0.4}
                            strokeDasharray="6 3"
                            dot={false}
                            activeDot={false}
                            connectNulls
                            isAnimationActive={false}
                        />
                    )}

                    {/* 24-period moving average overlay */}
                    {showMovingAverage && (
                        <Line
                            type="monotone"
                            dataKey={maKey}
                            name="24h MA"
                            stroke={param.color}
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

// ─── Main export ─────────────────────────────────────────────────────────────
const HistoricalChart = memo(function HistoricalChart({ data, showMovingAverage = false, compareData, compareYear, locationId = 'rama-23003' }) {
    const chartData = useMemo(() => {
        const rows = data.map((row, idx) => {
            const formatted = {
                ...row,
                label: (() => {
                    if (row.timestamp instanceof Date && !isNaN(row.timestamp)) {
                        return row.timestamp.toLocaleDateString('en-GB', { month: 'short', day: 'numeric' });
                    }
                    return '—';
                })(),
            };

            // Inject compare data if available (aligned by index)
            if (compareData && compareData[idx]) {
                HIST_PARAMS.forEach(p => {
                    formatted[`compare_${p.key}`] = compareData[idx][p.key];
                });
            }

            return formatted;
        });

        // Inject MA columns when toggled on
        if (showMovingAverage) {
            HIST_PARAMS.forEach((p) => {
                const primaryKey = `${p.key}_${locationId}`;
                const maValues = computeMovingAverage(data, primaryKey, 24);
                maValues.forEach((v, i) => { rows[i][`${primaryKey}_ma`] = v; });
            });
        }

        return rows;
    }, [data, showMovingAverage, compareData, compareYear, locationId]);

    // Compute stats for anomaly badges — memoized
    const stats = useMemo(
        () => Object.fromEntries(HIST_PARAMS.map((p) => [p.key, computeStats(data, p.key)])),
        [data]
    );

    if (!data.length) {
        return (
            <div className="glass-card flex items-center justify-center" style={{ height: 300, color: '#4db8e8' }}>
                No historical data for this year — try another year.
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-6">
            {HIST_PARAMS.map((param) => (
                <HistParamChart
                    key={param.key}
                    param={param}
                    chartData={chartData}
                    stats={stats}
                    showMovingAverage={showMovingAverage}
                    compareData={compareData}
                    compareYear={compareYear}
                    locationId={locationId}
                />
            ))}
        </div>
    );
});

export default HistoricalChart;
