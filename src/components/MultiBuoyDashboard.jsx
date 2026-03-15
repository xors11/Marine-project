import React from 'react';
import { ComposedChart, Line, XAxis, YAxis, ResponsiveContainer } from 'recharts';

const BUOY_COLORS = {
    'rama-23003': '#22d3ee', // cyan
    'north-indian': '#f97316', // orange
    'bay-of-bengal': '#a78bfa' // violet
};

export default function MultiBuoyDashboard({ buoyData, buoys, timeWindow }) {
    // 1. Array of current latest data metrics 
    const currentData = buoys.map(b => {
        const hist = buoyData[b.id]?.history || [];
        const last = hist.length > 0 ? hist[hist.length - 1] : {};
        return { ...b, sst: last.sea_surface_temp, wind: last.wind_speed, pressure: last.air_pressure };
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
        <div className="flex flex-col gap-4">
            {/* Anomaly Banners */}
            {currentData.length > 1 && sstDiff > 2 && (
                <div className="bg-amber-950 text-amber-400 border border-amber-800 p-3 rounded-lg text-sm font-semibold">
                    SST gradient detected: {hottestBuoy?.name} is {sstDiff.toFixed(1)}°C warmer than {coolestBuoy?.name}
                </div>
            )}
            {currentData.length > 1 && pressDiff > 5 && (
                <div className="bg-red-950 text-red-400 border border-red-800 p-3 rounded-lg text-sm font-semibold">
                    Pressure gradient: {pressDiff.toFixed(1)} hPa across region. Elevated circulation risk.
                </div>
            )}
            {currentData.length > 0 && maxWind > 15 && (
                <div className="bg-orange-950 text-orange-400 border border-orange-800 p-3 rounded-lg text-sm font-semibold">
                    Strong winds at {windiest?.name}: {maxWind.toFixed(1)} m/s
                </div>
            )}

            {/* 3-Column Dashboard */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {buoys.map(b => {
                    const rowData = currentData.find(d => d.id === b.id) || {};
                    const hist = filterHistoryByTimeWindow(buoyData[b.id]?.history, timeWindow);
                    const color = BUOY_COLORS[b.id] || '#4db8e8';

                    return (
                        <div key={b.id} className="bg-slate-900 border border-slate-700 rounded-xl p-4" style={{ borderTop: `4px solid ${color}` }}>
                            {/* Column Header */}
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <div className="font-bold text-slate-200">{b.name}</div>
                                    <div className="text-[10px] text-slate-400 border border-slate-700 bg-slate-800/50 px-2 py-0.5 rounded mt-1 inline-block">
                                        {b.region}
                                    </div>
                                </div>
                            </div>

                            {/* Mini Stats */}
                            <div className="grid grid-cols-3 gap-2 mb-6">
                                <div className="text-center">
                                    <div className="text-[10px] text-slate-500">SST</div>
                                    <div className="text-sm font-bold" style={{ color: rowData.sst > 28 ? '#f97316' : color }}>
                                        {rowData.sst ? `${rowData.sst.toFixed(1)}°C` : '—'}
                                    </div>
                                </div>
                                <div className="text-center border-l border-slate-800">
                                    <div className="text-[10px] text-slate-500">WIND</div>
                                    <div className="text-sm font-bold" style={{ color: rowData.wind > 15 ? '#f97316' : color }}>
                                        {rowData.wind ? `${rowData.wind.toFixed(1)} m/s` : '—'}
                                    </div>
                                </div>
                                <div className="text-center border-l border-slate-800">
                                    <div className="text-[10px] text-slate-500">PRES</div>
                                    <div className="text-sm font-bold" style={{ color: rowData.pressure < 1005 ? '#ef4444' : color }}>
                                        {rowData.pressure ? `${rowData.pressure.toFixed(0)} hPa` : '—'}
                                    </div>
                                </div>
                            </div>

                            {/* Mini Charts */}
                            <div className="space-y-4">
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
            <div className="text-[10px] text-slate-500 uppercase tracking-widest mb-1">{title}</div>
            <div className="h-20 w-full bg-slate-800/30 rounded p-1 border border-slate-700/50" style={{ minWidth: 0, minHeight: 0 }}>
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
