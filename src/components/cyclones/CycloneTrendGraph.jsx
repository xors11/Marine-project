import React, { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function CycloneTrendGraph({ tracksData }) {
    const data = useMemo(() => {
        if (!tracksData) return [];
        const yearMap = {};

        Object.values(tracksData).forEach(points => {
            if (!points || !points.length) return;
            const yearStr = points[0].ISO_TIME.substring(0, 4);
            const year = parseInt(yearStr, 10);
            if (isNaN(year)) return;

            const maxWind = Math.max(...points.map(p => p.WIND_KMH || 0));
            if (!yearMap[year]) yearMap[year] = { year, totalWind: 0, count: 0 };

            yearMap[year].totalWind += maxWind;
            yearMap[year].count += 1;
        });

        return Object.values(yearMap)
            .sort((a, b) => a.year - b.year)
            .map(d => ({
                year: d.year.toString(),
                avgWind: Math.round(d.totalWind / d.count)
            }));
    }, [tracksData]);

    return (
        <div className="card flex flex-col" style={{ height: 350 }}>
            <h3 style={{ color: 'var(--color-accent)', marginBottom: '1rem', fontSize: '1.1rem', fontWeight: 600 }}>Climate Trend: Avg Max Wind (km/h)</h3>
            <div style={{ flex: 1, minHeight: 0, minWidth: 0 }}>
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-abyss-800)" />
                        <XAxis dataKey="year" stroke="var(--color-abyss-400)" fontSize={12} minTickGap={20} />
                        <YAxis stroke="var(--color-abyss-400)" fontSize={12} domain={['auto', 'auto']} />
                        <Tooltip
                            contentStyle={{ backgroundColor: 'rgba(2, 13, 24, 0.95)', borderColor: 'var(--color-abyss-800)', borderRadius: '8px' }}
                            itemStyle={{ color: 'var(--color-abyss-100)' }}
                            labelStyle={{ color: 'var(--color-accent)', fontWeight: 'bold' }}
                        />
                        <Line type="monotone" dataKey="avgWind" name="Avg Max Wind" stroke="var(--color-danger)" strokeWidth={3} dot={{ r: 4, fill: '#0a192f', stroke: 'var(--color-danger)', strokeWidth: 2 }} activeDot={{ r: 6, fill: 'var(--color-danger)' }} />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
