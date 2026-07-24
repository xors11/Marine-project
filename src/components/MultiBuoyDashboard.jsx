import React from 'react';
import { ComposedChart, Line, XAxis, YAxis, ResponsiveContainer } from 'recharts';

const BUOY_COLORS = {
    'rama-23003': 'var(--color-accent)', // cyan/teal
    'north-indian': 'var(--color-temp)', // warm orange
    'bay-of-bengal': 'var(--color-violet)' // violet
};

export default function MultiBuoyDashboard({ buoyData, buoys, timeWindow }) {
    // 1. Array of current latest data metrics 
    const currentData = buoys.map(b => {
        const bd = buoyData[b.id] || {};
        return { ...b, sst: bd.sst, wind: bd.wind, pressure: bd.pressure };
    }).filter(d => d.sst != null && d.wind != null && d.pressure != null);

    let maxSST = -Infinity, minSST = Infinity;
    let hottestBuoy = null, coolestBuoy = null;
    let maxWind = -Infinity, windiest = null;
    let maxPressure = -Infinity, minPressure = Infinity;

    currentData.forEach(d => {
        if (d.sst > maxSST) { maxSST = d.sst; hottestBuoy = d; }
        if (d.sst < minSST) { minSST = d.sst; coolestBuoy = d; }
        if (d.wind > maxWind) { maxWind = d.wind; windiest = d; }
        if (d.pressure > maxPressure) { maxPressure = d.pressure; }
        if (d.pressure < minPressure) { minPressure = d.pressure; }
    });

    const sstDiff = maxSST - minSST;
    const pressDiff = maxPressure - minPressure;

    // 2. Format history data for mini charts based on timeWindow
    const filterHistoryByTimeWindow = (hist, tw) => {
        if (!hist || hist.length === 0) return [];
        const nowMs = new Date().getTime();
        let hours = 24 * 5; // default 5D
        if (tw === '6H') hours = 6;
        else if (tw === '12H') hours = 12;
        else if (tw === '24H') hours = 24;
        else if (tw === '48H') hours = 48;

        const cutoff = nowMs - (hours * 60 * 60 * 1000);
        return hist.filter(d => new Date(d.timestamp || d.measured_at).getTime() >= cutoff);
    };

    return (
        <div className="flex flex-col gap-[var(--space-4)]">
            {/* Anomaly Banners */}
            {currentData.length > 1 && sstDiff > 2 && (
                <div style={{ background: 'rgba(240, 169, 78, 0.08)', border: '1px solid rgba(240, 169, 78, 0.2)', color: 'var(--color-amber)' }} className="p-3 rounded-lg text-sm font-semibold">
                    SST gradient detected: {hottestBuoy?.name} is {sstDiff.toFixed(1)}°C warmer than {coolestBuoy?.name}
                </div>
            )}
            {currentData.length > 1 && pressDiff > 5 && (
                <div style={{ background: 'rgba(242, 102, 91, 0.08)', border: '1px solid rgba(242, 102, 91, 0.2)', color: 'var(--color-danger)' }} className="p-3 rounded-lg text-sm font-semibold">
                    Pressure gradient: {pressDiff.toFixed(1)} hPa across region. Elevated circulation risk.
                </div>
            )}
            {currentData.length > 0 && maxWind > 15 && (
                <div style={{ background: 'rgba(232, 147, 90, 0.08)', border: '1px solid rgba(232, 147, 90, 0.2)', color: 'var(--color-temp)' }} className="p-3 rounded-lg text-sm font-semibold">
                    Strong winds at {windiest?.name}: {maxWind.toFixed(1)} m/s
                </div>
            )}

            {/* 3-Column Dashboard */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
                {buoys.map(b => {
                    const rowData = currentData.find(d => d.id === b.id) || {};
                    const hist = filterHistoryByTimeWindow(buoyData[b.id]?.history, timeWindow);
                    const color = BUOY_COLORS[b.id] || 'var(--color-accent)';

                    return (
                        <div key={b.id} className="card" style={{ borderTop: `4px solid ${color}` }}>
                            {/* Column Header */}
                            <div className="flex justify-between items-start mb-[var(--space-4)]">
                                <div>
                                    <div className="font-bold text-[var(--color-abyss-100)]">{b.name}</div>
                                    <div style={{ background: 'rgba(36, 144, 204, 0.08)', border: '1px solid rgba(36, 144, 204, 0.15)', color: 'var(--color-abyss-300)' }} className="text-[10px] px-2 py-0.5 rounded mt-1 inline-block">
                                        {b.region}
                                    </div>
                                </div>
                            </div>

                            {/* Mini Stats */}
                            <div className="grid grid-cols-3 gap-[var(--space-2)] mb-[var(--space-6)]">
                                <div className="text-center">
                                    <div className="text-[10px] text-[var(--color-abyss-400)]">SST</div>
                                    <div className="text-sm font-bold data-value" style={{ color: rowData.sst > 28 ? 'var(--color-temp)' : color }}>
                                        {rowData.sst ? `${rowData.sst.toFixed(1)}°C` : '—'}
                                    </div>
                                </div>
                                <div className="text-center border-l border-[var(--color-abyss-800)]">
                                    <div className="text-[10px] text-[var(--color-abyss-400)]">WIND</div>
                                    <div className="text-sm font-bold data-value" style={{ color: rowData.wind > 15 ? 'var(--color-temp)' : color }}>
                                        {rowData.wind ? `${rowData.wind.toFixed(1)} m/s` : '—'}
                                    </div>
                                </div>
                                <div className="text-center border-l border-[var(--color-abyss-800)]">
                                    <div className="text-[10px] text-[var(--color-abyss-400)]">PRES</div>
                                    <div className="text-sm font-bold data-value" style={{ color: rowData.pressure < 1005 ? 'var(--color-danger)' : color }}>
                                        {rowData.pressure ? `${rowData.pressure.toFixed(0)} hPa` : '—'}
                                    </div>
                                </div>
                            </div>

                            {/* Mini Charts */}
                            <div className="space-y-[var(--space-4)]">
                                <MiniChart title="Sea Surface Temp (°C)" data={hist} dataKey="sea_surface_temp" color={color} domain={['dataMin - 0.5', 'dataMax + 0.5']} />
                                <MiniChart title="Wind Speed (m/s)" data={hist} dataKey="wind_speed" color={color} domain={['auto', 'auto']} />
                                <MiniChart title="Air Pressure (hPa)" data={hist} dataKey="air_pressure" color={color} domain={['dataMin - 1', 'dataMax + 1']} />
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

function MiniChart({ title, data, dataKey, color, domain }) {
    if (!data || data.length === 0) return null;
    return (
        <div>
            <div className="text-[10px] text-[var(--color-abyss-400)] uppercase tracking-widest mb-1">{title}</div>
            <div className="h-20 w-full rounded p-1" style={{ background: 'var(--color-abyss-950)', border: '1px solid var(--color-abyss-800)', minWidth: 0, minHeight: 0 }}>
                <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={data}>
                        <XAxis dataKey="label" hide />
                        <YAxis domain={domain} hide />
                        <Line
                            type="monotone"
                            dataKey={dataKey}
                            stroke={color}
                            strokeWidth={2}
                            dot={false}
                            isAnimationActive={false}
                        />
                    </ComposedChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
