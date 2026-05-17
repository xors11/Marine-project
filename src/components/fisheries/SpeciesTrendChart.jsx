import React, { useState } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    ReferenceLine, ResponsiveContainer, Cell, Legend,
} from 'recharts';

const getHealthColor = (h) => {
    if (h < 50) return '#f87171';
    if (h < 65) return '#fb923c';
    if (h < 75) return '#facc15';
    return '#4ade80';
};

const getMsyColor = (m) => {
    if (m > 95) return '#f87171';
    if (m > 80) return '#fb923c';
    return '#22d3ee';
};

// ─── Custom tooltip ────────────────────────────────────────────────────────────
function CustomTooltip({ active, payload, label }) {
    if (!active || !payload || !payload.length) return null;
    const sp = payload[0]?.payload;
    if (!sp) return null;

    return (
        <div style={{
            background: '#040d1a', border: '0.5px solid #0d2135',
            borderRadius: 9, padding: '10px 14px', fontSize: 11,
            color: '#d4eef9', boxShadow: '0 4px 24px rgba(0,0,0,0.5)',
            minWidth: 180,
        }}>
            <div style={{ fontWeight: 800, color: '#22d3ee', marginBottom: 6, fontSize: 12 }}>{sp.species}</div>
            <div style={{ color: '#2a4a62', fontSize: 9, fontStyle: 'italic', marginBottom: 8 }}>{sp.scientific_name}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
                    <span style={{ color: '#0f2d44', fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Stock Health</span>
                    <span style={{ fontWeight: 700, color: getHealthColor(sp.health) }}>{sp.health.toFixed(1)}%</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
                    <span style={{ color: '#0f2d44', fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.08em' }}>MSY Utilization</span>
                    <span style={{ fontWeight: 700, color: getMsyColor(sp.msy) }}>{sp.msy.toFixed(0)}%</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
                    <span style={{ color: '#0f2d44', fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Current Catch</span>
                    <span style={{ fontWeight: 600, color: '#d4eef9' }}>{sp.catch_t?.toLocaleString()} t</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
                    <span style={{ color: '#0f2d44', fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.08em' }}>MSY Ceiling</span>
                    <span style={{ fontWeight: 600, color: '#d4eef9' }}>{sp.msy_t?.toLocaleString()} t</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
                    <span style={{ color: '#0f2d44', fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Trend</span>
                    <span style={{ fontWeight: 600, color: sp.trendColor }}>{sp.trend}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
                    <span style={{ color: '#0f2d44', fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Region</span>
                    <span style={{ fontWeight: 600, color: '#4db8e8' }}>{sp.region}</span>
                </div>
            </div>
        </div>
    );
}

// ─── Custom X-axis tick ────────────────────────────────────────────────────────
function CustomXTick({ x, y, payload }) {
    const name = payload.value || '';
    // Truncate to first word for brevity on narrow axis
    const short = name.length > 12 ? name.slice(0, 12) + '…' : name;
    return (
        <g transform={`translate(${x},${y})`}>
            <text
                x={0} y={0} dy={10}
                textAnchor="end"
                transform="rotate(-38)"
                fill="#2a4a62"
                fontSize={9}
                fontFamily="Inter, sans-serif"
            >
                {short}
            </text>
        </g>
    );
}

// ─── Legend renderer ───────────────────────────────────────────────────────────
function CustomLegend() {
    return (
        <div style={{ display: 'flex', gap: 16, justifyContent: 'flex-end', paddingRight: 8, paddingBottom: 4 }}>
            {[
                { color: '#4ade80', label: 'Stock Health %' },
                { color: '#22d3ee', label: 'MSY Utilization %' },
            ].map(l => (
                <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <div style={{ width: 10, height: 10, borderRadius: 2, background: l.color, flexShrink: 0 }} />
                    <span style={{ fontSize: 9, color: '#0f2d44', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{l.label}</span>
                </div>
            ))}
        </div>
    );
}

// ─── Main component ────────────────────────────────────────────────────────────
export default function SpeciesTrendChart({ species, msyUtilizationFn }) {
    const [showTop, setShowTop] = useState(10);

    if (!species || species.length === 0) return null;

    // Always take worst N species by health
    const worstN = [...species]
        .sort((a, b) => a.stock_health_percent - b.stock_health_percent)
        .slice(0, showTop);

    const chartData = worstN.map(s => {
        const msy = msyUtilizationFn(s);
        const trendColor = s.trend === 'Declining' || s.trend === 'Critical'
            ? '#f87171' : s.trend === 'Increasing' ? '#4ade80' : '#facc15';
        return {
            name: s.species,
            species: s.species,
            scientific_name: s.scientific_name,
            health: Math.round(s.stock_health_percent * 10) / 10,
            msy,
            catch_t: s.current_catch_tonnes,
            msy_t: s.msy_tonnes,
            trend: s.trend || 'Stable',
            trendColor,
            region: s.region,
        };
    });

    const OPTIONS = [5, 10, 15, 20];

    return (
        <div style={{
            background: '#040d1a',
            border: '0.5px solid #0d2135',
            borderRadius: 9,
            borderTop: '1.5px solid #a78bfa',
            padding: '14px',
        }}>
            {/* ── Header ── */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
                <div>
                    <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#0f2d44' }}>
                        Species Health vs. MSY Utilization
                    </div>
                    <div style={{ fontSize: 10, color: '#2a4a62', marginTop: 2 }}>
                        Bottom {showTop} at-risk species · grouped bars · hover for full detail
                    </div>
                </div>

                {/* Top N selector */}
                <div style={{ display: 'flex', gap: 4 }}>
                    {OPTIONS.map(n => (
                        <button
                            key={n}
                            onClick={() => setShowTop(n)}
                            style={{
                                padding: '3px 9px', borderRadius: 99, fontSize: 10, cursor: 'pointer',
                                border: showTop === n ? '0.5px solid rgba(167,139,250,0.5)' : '0.5px solid #0d2135',
                                background: showTop === n ? 'rgba(167,139,250,0.12)' : '#040f1f',
                                color: showTop === n ? '#a78bfa' : '#2a4a62',
                                fontWeight: showTop === n ? 700 : 400,
                                transition: 'all 0.15s',
                                fontFamily: 'inherit',
                            }}
                        >
                            Top {n}
                        </button>
                    ))}
                </div>
            </div>

            {/* ── Reference line legend + chart legend ── */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4, flexWrap: 'wrap', gap: 6 }}>
                <div style={{ display: 'flex', gap: 12 }}>
                    <span style={{ fontSize: 9, color: '#f87171', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ display: 'inline-block', width: 16, height: 1, background: '#f87171', opacity: 0.6, borderTop: '1px dashed #f87171' }} />
                        50% critical
                    </span>
                    <span style={{ fontSize: 9, color: '#4ade80', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ display: 'inline-block', width: 16, height: 1, background: '#4ade80', opacity: 0.6, borderTop: '1px dashed #4ade80' }} />
                        75% safe
                    </span>
                    <span style={{ fontSize: 9, color: '#fb923c', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ display: 'inline-block', width: 16, height: 1, background: '#fb923c', opacity: 0.6, borderTop: '1px dashed #fb923c' }} />
                        90% MSY warn
                    </span>
                </div>
                <CustomLegend />
            </div>

            {/* ── Chart ── */}
            <div style={{ height: 260 }}>
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                        data={chartData}
                        margin={{ top: 4, right: 8, left: -12, bottom: 60 }}
                        barCategoryGap="28%"
                        barGap={2}
                    >
                        <CartesianGrid
                            strokeDasharray="3 3"
                            stroke="rgba(13,33,53,0.8)"
                            vertical={false}
                        />
                        <XAxis
                            dataKey="name"
                            tick={<CustomXTick />}
                            tickLine={false}
                            axisLine={{ stroke: '#0d2135' }}
                            interval={0}
                        />
                        <YAxis
                            domain={[0, 115]}
                            tickLine={false}
                            axisLine={false}
                            tick={{ fill: '#0f2d44', fontSize: 9 }}
                            tickFormatter={v => `${v}%`}
                        />
                        <Tooltip
                            content={<CustomTooltip />}
                            cursor={{ fill: 'rgba(34,211,238,0.04)' }}
                        />

                        {/* Reference lines */}
                        <ReferenceLine y={50} stroke="#f87171" strokeDasharray="4 3" strokeOpacity={0.5} />
                        <ReferenceLine y={75} stroke="#4ade80" strokeDasharray="4 3" strokeOpacity={0.4} />
                        <ReferenceLine y={90} stroke="#fb923c" strokeDasharray="4 3" strokeOpacity={0.4} />

                        {/* Health bar — color per threshold */}
                        <Bar dataKey="health" name="Stock Health %" radius={[3, 3, 0, 0]} maxBarSize={22} isAnimationActive={false}>
                            {chartData.map((entry, i) => (
                                <Cell key={i} fill={getHealthColor(entry.health)} fillOpacity={0.85} />
                            ))}
                        </Bar>

                        {/* MSY bar — color per threshold */}
                        <Bar dataKey="msy" name="MSY Utilization %" radius={[3, 3, 0, 0]} maxBarSize={22} isAnimationActive={false}>
                            {chartData.map((entry, i) => (
                                <Cell key={i} fill={getMsyColor(entry.msy)} fillOpacity={0.75} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>

            {/* ── Footer summary ── */}
            <div style={{
                display: 'flex', gap: 16, flexWrap: 'wrap',
                borderTop: '0.5px solid #0d2135', paddingTop: 10, marginTop: 8,
            }}>
                {[
                    { label: 'Avg Health', value: `${Math.round(chartData.reduce((s, d) => s + d.health, 0) / chartData.length)}%`, color: getHealthColor(chartData.reduce((s, d) => s + d.health, 0) / chartData.length) },
                    { label: 'Avg MSY%', value: `${Math.round(chartData.reduce((s, d) => s + d.msy, 0) / chartData.length)}%`, color: getMsyColor(chartData.reduce((s, d) => s + d.msy, 0) / chartData.length) },
                    { label: 'Critical (<50%)', value: `${chartData.filter(d => d.health < 50).length} species`, color: '#f87171' },
                    { label: 'Over MSY 90%', value: `${chartData.filter(d => d.msy > 90).length} species`, color: '#fb923c' },
                    { label: 'Declining', value: `${chartData.filter(d => d.trend === 'Declining' || d.trend === 'Critical').length} species`, color: '#facc15' },
                ].map(m => (
                    <div key={m.label} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <span style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#0f2d44' }}>{m.label}</span>
                        <span style={{ fontSize: 12, fontWeight: 800, color: m.color }}>{m.value}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}
