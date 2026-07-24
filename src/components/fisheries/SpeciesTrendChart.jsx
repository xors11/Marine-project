import React, { useState } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    ReferenceLine, ResponsiveContainer, Cell, Legend,
} from 'recharts';

const getHealthColor = (h) => {
    if (h < 50) return 'var(--color-danger)';
    if (h < 65) return 'var(--color-amber)';
    if (h < 75) return 'var(--color-warning)';
    return 'var(--color-green)';
};

const getMsyColor = (m) => {
    if (m > 95) return 'var(--color-danger)';
    if (m > 80) return 'var(--color-amber)';
    return 'var(--color-accent)';
};

// ─── Custom tooltip ────────────────────────────────────────────────────────────
function CustomTooltip({ active, payload, label }) {
    if (!active || !payload || !payload.length) return null;
    const sp = payload[0]?.payload;
    if (!sp) return null;

    return (
        <div style={{
            background: 'rgba(2, 13, 24, 0.95)', border: '1px solid var(--color-abyss-800)',
            borderRadius: 9, padding: '10px 14px', fontSize: 11,
            color: 'var(--color-abyss-100)', boxShadow: '0 4px 24px rgba(0,0,0,0.5)',
            minWidth: 180,
        }}>
            <div style={{ fontWeight: 800, color: 'var(--color-accent)', marginBottom: 6, fontSize: 12 }}>{sp.species}</div>
            <div style={{ color: 'var(--color-abyss-400)', fontSize: 9, fontStyle: 'italic', marginBottom: 8 }}>{sp.scientific_name}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
                    <span style={{ color: 'var(--color-abyss-400)', fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Stock Health</span>
                    <span style={{ fontWeight: 700, color: getHealthColor(sp.health) }}>{sp.health.toFixed(1)}%</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
                    <span style={{ color: 'var(--color-abyss-400)', fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.08em' }}>MSY Utilization</span>
                    <span style={{ fontWeight: 700, color: getMsyColor(sp.msy) }}>{sp.msy.toFixed(0)}%</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
                    <span style={{ color: 'var(--color-abyss-400)', fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Current Catch</span>
                    <span style={{ fontWeight: 600, color: 'var(--color-abyss-100)' }}>{sp.catch_t?.toLocaleString()} t</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
                    <span style={{ color: 'var(--color-abyss-400)', fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.08em' }}>MSY Ceiling</span>
                    <span style={{ fontWeight: 600, color: 'var(--color-abyss-100)' }}>{sp.msy_t?.toLocaleString()} t</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
                    <span style={{ color: 'var(--color-abyss-400)', fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Trend</span>
                    <span style={{ fontWeight: 600, color: sp.trendColor }}>{sp.trend}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
                    <span style={{ color: 'var(--color-abyss-400)', fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Region</span>
                    <span style={{ fontWeight: 600, color: 'var(--color-accent)' }}>{sp.region}</span>
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
                fill="var(--color-abyss-400)"
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
                { color: 'var(--color-green)', label: 'Stock Health %' },
                { color: 'var(--color-accent)', label: 'MSY Utilization %' },
            ].map(l => (
                <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <div style={{ width: 10, height: 10, borderRadius: 2, background: l.color, flexShrink: 0 }} />
                    <span style={{ fontSize: 9, color: 'var(--color-abyss-400)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{l.label}</span>
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
        <div
            className="card"
            style={{
                borderTop: '2px solid var(--color-violet)',
            }}
        >
            {/* ── Header ── */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
                <div>
                    <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--color-abyss-400)' }}>
                        Species Health vs. MSY Utilization
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--color-abyss-400)', marginTop: 2 }}>
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
                                border: showTop === n ? '1px solid rgba(157, 140, 245, 0.5)' : '1px solid var(--color-abyss-800)',
                                background: showTop === n ? 'rgba(157, 140, 245, 0.12)' : 'var(--color-abyss-950)',
                                color: showTop === n ? 'var(--color-violet)' : 'var(--color-abyss-400)',
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
                    <span style={{ fontSize: 9, color: 'var(--color-danger)', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ display: 'inline-block', width: 16, height: 1, background: 'var(--color-danger)', opacity: 0.6, borderTop: '1px dashed var(--color-danger)' }} />
                        50% critical
                    </span>
                    <span style={{ fontSize: 9, color: 'var(--color-green)', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ display: 'inline-block', width: 16, height: 1, background: 'var(--color-green)', opacity: 0.6, borderTop: '1px dashed var(--color-green)' }} />
                        75% safe
                    </span>
                    <span style={{ fontSize: 9, color: 'var(--color-amber)', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ display: 'inline-block', width: 16, height: 1, background: 'var(--color-amber)', opacity: 0.6, borderTop: '1px dashed var(--color-amber)' }} />
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
                            stroke="var(--color-abyss-800)"
                            vertical={false}
                        />
                        <XAxis
                            dataKey="name"
                            tick={<CustomXTick />}
                            tickLine={false}
                            axisLine={{ stroke: 'var(--color-abyss-800)' }}
                            interval={0}
                        />
                        <YAxis
                            domain={[0, 115]}
                            tickLine={false}
                            axisLine={false}
                            tick={{ fill: 'var(--color-abyss-400)', fontSize: 9 }}
                            tickFormatter={v => `${v}%`}
                        />
                        <Tooltip
                            content={<CustomTooltip />}
                            cursor={{ fill: 'rgba(34,211,238,0.04)' }}
                        />

                        {/* Reference lines */}
                        <ReferenceLine y={50} stroke="var(--color-danger)" strokeDasharray="4 3" strokeOpacity={0.5} />
                        <ReferenceLine y={75} stroke="var(--color-green)" strokeDasharray="4 3" strokeOpacity={0.4} />
                        <ReferenceLine y={90} stroke="var(--color-amber)" strokeDasharray="4 3" strokeOpacity={0.4} />

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
                borderTop: '1px solid var(--color-abyss-800)', paddingTop: 10, marginTop: 8,
            }}>
                {[
                    { label: 'Avg Health', value: `${Math.round(chartData.reduce((s, d) => s + d.health, 0) / chartData.length)}%`, color: getHealthColor(chartData.reduce((s, d) => s + d.health, 0) / chartData.length) },
                    { label: 'Avg MSY%', value: `${Math.round(chartData.reduce((s, d) => s + d.msy, 0) / chartData.length)}%`, color: getMsyColor(chartData.reduce((s, d) => s + d.msy, 0) / chartData.length) },
                    { label: 'Critical (<50%)', value: `${chartData.filter(d => d.health < 50).length} species`, color: 'var(--color-danger)' },
                    { label: 'Over MSY 90%', value: `${chartData.filter(d => d.msy > 90).length} species`, color: 'var(--color-amber)' },
                    { label: 'Declining', value: `${chartData.filter(d => d.trend === 'Declining' || d.trend === 'Critical').length} species`, color: 'var(--color-warning)' },
                ].map(m => (
                    <div key={m.label} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <span style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--color-abyss-400)' }}>{m.label}</span>
                        <span className="data-value" style={{ fontSize: 12, fontWeight: 800, color: m.color }}>{m.value}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}
