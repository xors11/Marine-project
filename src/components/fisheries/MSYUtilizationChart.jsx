import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

export default function MSYUtilizationChart({ species }) {
    const chartData = [...species].sort((a, b) => b.utilization - a.utilization).slice(0, 10);

    return (
        <div className="glass-card p-6 h-[400px] flex flex-col">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-blue-400 mb-6">Top MSY Utilization by Species</h3>

            <div className="flex-1 w-full" style={{ minHeight: 0, minWidth: 0 }}>
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                        <XAxis
                            type="number"
                            domain={[0, 100]}
                            tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.4)' }}
                            axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                        />
                        <YAxis
                            dataKey="species"
                            type="category"
                            tick={{ fontSize: 9, fill: 'rgba(255,255,255,0.6)' }}
                            width={80}
                            axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                        />
                        <Tooltip
                            contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: '11px' }}
                            itemStyle={{ fontSize: '11px', fontWeight: 'bold' }}
                            cursor={{ fill: 'rgba(255,255,255,0.02)' }}
                        />
                        <Bar dataKey="utilization" radius={[0, 4, 4, 0]} barSize={20} isAnimationActive={false}>
                            {chartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.riskColor} fillOpacity={0.8} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
