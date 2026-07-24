import React, { useMemo, memo } from 'react';
import {
    ComposedChart, Line, Area, XAxis, YAxis, CartesianGrid,
    Tooltip, ResponsiveContainer, ReferenceLine, ReferenceArea
} from 'recharts';
import { computeStats, computeMovingAverage, isAnomaly, zScore, classifyAnomaly } from '../utils/anomaly';

const HIST_PARAMS = [
    { key: 'WTMP', label: 'Water Temperature', unit: '°C' },
    { key: 'WSPD', label: 'Wind Speed', unit: 'm/s' },
    { key: 'WVHT', label: 'Wave Height', unit: 'm' },
    { key: 'PRES', label: 'Air Pressure', unit: 'hPa' },
];

export { HIST_PARAMS };

const getParamThemeColor = (key) => {
    switch (key) {
        case 'WTMP':
            return 'var(--color-temp)';
        case 'WSPD':
            return 'var(--color-accent)';
        case 'WVHT':
            return 'var(--color-green)';
        case 'PRES':
            return 'var(--color-violet)';
        default:
            return 'var(--color-accent)';
    }
};

const GRID_STYLE = { strokeDasharray: '3 3', stroke: 'var(--color-abyss-800)', vertical: false };
const XAXIS_STYLE = { fill: 'var(--color-abyss-300)', fontSize: 9 };
const XAXIS_LINE = { stroke: 'var(--color-abyss-800)' };
const YAXIS_STYLE = { fill: 'var(--color-abyss-300)', fontSize: 10 };
const ACTIVE_DOT = { r: 5, stroke: '#fff', strokeWidth: 1 };

function HistTooltip({ active, payload, label, unit }) {
    if (!active || !payload?.length) return null;
    return (
        <div style={{
            background: 'var(--color-card)',
            border: '1px solid var(--color-accent)',
            borderRadius: '12px',
            padding: 'var(--space-3) var(--space-4)',
            fontSize: '0.85rem',
            backdropFilter: 'blur(12px)',
            minWidth: 220,
            boxShadow: '0 8px 32px rgba(0,0,0,0.4)'
        }}>
            <div style={{ color: 'var(--color-abyss-300)', fontWeight: 600, marginBottom: 8, fontSize: '0.75rem' }}>{label}</div>
            {payload.map((entry, idx) => {
                let name = entry.name;
                if (entry.dataKey?.includes('_rama-23003')) name = 'RAMA 23003';
                else if (entry.dataKey?.includes('_north-indian')) name = 'N. Indian Ocean';
                else if (entry.dataKey?.includes('_bay-of-bengal')) name = 'Bay of Bengal';

                const isMA = entry.dataKey?.endsWith('_ma');
                const isCompare = entry.dataKey?.startsWith('compare_');
                const cleanKey = entry.dataKey?.replace('_rama-23003', '').replace('_north-indian', '').replace('_bay-of-bengal', '').replace('_ma', '').replace('compare_', '');
                const themeColor = getParamThemeColor(cleanKey);

                return (
                    <div
                        key={`${entry.dataKey}_${idx}`}
                        style={{ display: 'flex', justifyContent: 'space-between', gap: 12, color: themeColor, marginBottom: 3 }}
                    >
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            {name}
                            {isMA && (
                                <span style={{
                                    background: 'rgba(45,212,191,0.08)', border: '1px solid rgba(45,212,191,0.2)',
                                    borderRadius: 4, padding: '0 4px', fontSize: '0.58rem', color: 'var(--color-accent)',
                                }}>24h trend</span>
                            )}
                            {isCompare && (
                                <span style={{
                                    background: 'rgba(157,140,245,0.08)', border: '1px solid rgba(157,140,245,0.2)',
                                    borderRadius: 4, padding: '0 4px', fontSize: '0.58rem', color: 'var(--color-violet)',
                                }}>compare</span>
                            )}
                        </span>
                        <span className="data-value" style={{ fontWeight: 700, fontSize: '1rem', color: entry.color === 'rgba(255,255,255,0.4)' ? 'var(--color-abyss-300)' : themeColor }}>
                            {entry.value != null ? `${Number(entry.value).toFixed(2)} ${unit}` : '—'}
                        </span>
                    </div>
                );
            })}
            {payload.some(e => e.payload?._isAnomaly?.[e.dataKey]) && (
                <div style={{
                    background: 'rgba(242, 102, 91, 0.08)', border: '1px solid rgba(242, 102, 91, 0.2)',
                    borderRadius: 4, padding: '2px 6px', marginTop: 6,
                    fontSize: '0.65rem', color: 'var(--color-danger)', fontWeight: 700, textAlign: 'center',
                }}>
                    ⚠ Extreme Anomaly
                </div>
            )}
        </div>
    );
}

function AnomalyDot(props) {
    const { cx, cy, payload, dataKey, fieldMean, fieldStd } = props;
    if (!payload || payload[dataKey] == null) return null;
    if (!isAnomaly(payload[dataKey], fieldMean, fieldStd)) return null;
    const z = zScore(payload[dataKey], fieldMean, fieldStd);
    const cls = classifyAnomaly(z);

    // Adjusted sizes
    const outerR = cls === 'extreme' ? 3 : 2.5;
    const innerR = cls === 'extreme' ? 1.5 : 1.2;
    const color = cls === 'extreme' ? 'var(--color-danger)' : 'var(--color-amber)';

    return (
        <g>
            <circle cx={cx} cy={cy} r={outerR} fill="none" stroke={color} strokeWidth={1} opacity={0.8} />
            <circle cx={cx} cy={cy} r={innerR} fill={color} opacity={0.9} />
        </g>
    );
}

// ─── Anomaly badge for chart header ──────────────────────────────────────────
function AnomalyBadge({ s }) {
    if (!s || s.anomalyCount === 0) return null;
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
            <div style={{
                display: 'flex', alignItems: 'center', gap: 5,
                background: 'rgba(242, 102, 91, 0.08)', border: '1px solid rgba(242, 102, 91, 0.2)',
                borderRadius: 99, padding: '0.2rem 0.6rem',
                fontSize: '0.68rem', color: 'var(--color-danger)', fontWeight: 700,
            }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--color-danger)', display: 'inline-block' }} />
                {s.anomalyCount} anomal{s.anomalyCount === 1 ? 'y' : 'ies'}
            </div>
            {s.moderateCount > 0 && (
                <div style={{
                    background: 'rgba(240, 169, 78, 0.08)', border: '1px solid rgba(240, 169, 78, 0.2)',
                    borderRadius: 99, padding: '0.2rem 0.5rem',
                    fontSize: '0.65rem', color: 'var(--color-amber)', fontWeight: 700,
                }}>{s.moderateCount} mod</div>
            )}
            {s.extremeCount > 0 && (
                <div style={{
                    background: 'rgba(242, 102, 91, 0.08)', border: '1px solid rgba(242, 102, 91, 0.2)',
                    borderRadius: 99, padding: '0.2rem 0.5rem',
                    fontSize: '0.65rem', color: 'var(--color-danger)', fontWeight: 700,
                }}>{s.extremeCount} extreme</div>
            )}
        </div>
    );
}

const HistParamChart = memo(function HistParamChart({ param, chartData, stats, showMovingAverage, compareData, compareYear, locationId = 'rama-23003' }) {
    const s = stats[param.key];
    const themeColor = getParamThemeColor(param.key);
    const ALL_BUOYS = ['rama-23003', 'north-indian', 'bay-of-bengal'];
    const OTHER_BUOYS = ALL_BUOYS.filter(id => id !== locationId);

    const validCount = useMemo(
        () => chartData.filter(r => !isNaN(r[`${param.key}_${locationId}`])).length,
        [chartData, param.key, locationId]
    );

    const activeDot = useMemo(
        () => ({ ...ACTIVE_DOT, fill: themeColor }),
        [themeColor]
    );

    const primaryKey = `${param.key}_${locationId}`;
    const maKey = `${primaryKey}_ma`;
    const compareKey = `compare_${param.key}`;

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
            .slice(0, 10);
    }, [chartData, primaryKey, s]);

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

        if (inAnomaly && chartData.length > 0) {
            regions.push({ start: startX, end: chartData[chartData.length - 1].label });
        }
        return regions;
    }, [chartData, param.key, s]);

    return (
        <div className="card overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <span style={{
                        width: 7, height: 7, borderRadius: '50%',
                        background: themeColor, display: 'inline-block', flexShrink: 0,
                    }} />
                    <div style={{ width: 3, height: 18, borderRadius: 2, background: themeColor }} />
                    <span style={{ fontWeight: 700, fontSize: '0.9rem', color: themeColor }}>
                        {param.label}
                    </span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--color-abyss-300)', opacity: 0.7 }}>({param.unit})</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <AnomalyBadge s={s} />
                    <span style={{
                        background: 'rgba(36,144,204,0.08)',
                        border: '1px solid rgba(36,144,204,0.15)',
                        borderRadius: 99, padding: '0.2rem 0.6rem',
                        fontSize: '0.68rem', color: 'var(--color-abyss-300)',
                    }}>
                        {validCount} pts
                    </span>
                </div>
            </div>

            {/* Compare legend */}
            {compareYear && (
                <div className="flex flex-col md:flex-row" style={{ gap: 12, marginBottom: 8, fontSize: '0.7rem' }}>
                    <span className="w-full md:w-auto" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ width: 16, height: 2, background: themeColor, display: 'inline-block' }} />
                        <span style={{ color: 'var(--color-abyss-300)' }}>Selected year</span>
                    </span>
                    <span className="w-full md:w-auto" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ width: 16, height: 2, background: themeColor, opacity: 0.4, display: 'inline-block', borderTop: '1px dashed' }} />
                        <span style={{ color: 'var(--color-abyss-300)' }}>Compare ({compareYear})</span>
                    </span>
                </div>
            )}

            <ResponsiveContainer width="100%" height={window.innerWidth < 768 ? 200 : 240}>
                <ComposedChart data={chartData} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
                    <CartesianGrid {...GRID_STYLE} />
                    <XAxis
                        dataKey="label"
                        tick={{ ...XAXIS_STYLE, fontSize: window.innerWidth < 768 ? 10 : 9 }}
                        axisLine={XAXIS_LINE}
                        tickLine={false}
                        interval="preserveStartEnd"
                    />
                    <YAxis
                        domain={['auto', 'auto']}
                        tick={{ ...YAXIS_STYLE, fontSize: window.innerWidth < 768 ? 11 : 10 }}
                        axisLine={false}
                        tickLine={false}
                        width={window.innerWidth < 768 ? 40 : 50}
                    />
                    <Tooltip content={<HistTooltip unit={param.unit} />} />

                    {extremeXPositions.map((x, i) => (
                        <ReferenceLine
                            key={`ref-${i}`}
                            x={x}
                            stroke="var(--color-danger)"
                            strokeWidth={1}
                            strokeDasharray="3 2"
                            strokeOpacity={0.6}
                        />
                    ))}

                    {crossAnomalyRegions.map((r, i) => (
                        <ReferenceArea
                            key={`cross-${i}`}
                            x1={r.start}
                            x2={r.end}
                            fill="var(--color-danger)"
                            fillOpacity={0.15}
                        />
                    ))}

                    {OTHER_BUOYS.map(bId => (
                        <Line
                            key={bId}
                            type="monotone"
                            dataKey={`${param.key}_${bId}`}
                            stroke="var(--color-abyss-600)"
                            strokeWidth={1}
                            strokeDasharray="5 5"
                            dot={false}
                            isAnimationActive={false}
                        />
                    ))}

                    <Area
                        type="monotone"
                        dataKey={primaryKey}
                        fill={themeColor}
                        fillOpacity={0.12}
                        stroke="none"
                        isAnimationActive={false}
                    />

                    <Line
                        type="monotone"
                        dataKey={primaryKey}
                        name={param.label}
                        stroke={themeColor}
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
                        connectNulls={true}
                        isAnimationActive={false}
                    />

                    {compareYear && (
                        <Line
                            type="monotone"
                            dataKey={compareKey}
                            name={`${param.label} (${compareYear})`}
                            stroke={themeColor}
                            strokeWidth={1.5}
                            strokeOpacity={0.4}
                            strokeDasharray="6 3"
                            dot={false}
                            activeDot={false}
                            connectNulls
                            isAnimationActive={false}
                        />
                    )}

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

            if (compareData && compareData[idx]) {
                HIST_PARAMS.forEach(p => {
                    formatted[`compare_${p.key}`] = compareData[idx][p.key];
                });
            }

            return formatted;
        });

        if (showMovingAverage) {
            HIST_PARAMS.forEach((p) => {
                const primaryKey = `${p.key}_${locationId}`;
                const maValues = computeMovingAverage(data, primaryKey, 24);
                maValues.forEach((v, i) => { rows[i][`${primaryKey}_ma`] = v; });
            });
        }

        // Downsample for mobile performance
        if (typeof window !== 'undefined' && window.innerWidth < 768 && rows.length > 50) {
            return rows.filter((_, i) => i % 2 === 0);
        }

        return rows;
    }, [data, showMovingAverage, compareData, compareYear, locationId]);

    const stats = useMemo(
        () => Object.fromEntries(HIST_PARAMS.map((p) => [p.key, computeStats(data, p.key)])),
        [data]
    );

    if (!data.length) {
        return (
            <div className="card flex items-center justify-center" style={{ height: 300, color: 'var(--color-abyss-300)' }}>
                No historical data for this year — try another year.
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-3 overflow-hidden w-full">
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
