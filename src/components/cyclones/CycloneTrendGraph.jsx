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
        <div className="glass-panel" style={{ padding: '1.5rem', height: 350 }}>
            <h3 style={{ color: '#4db8e8', marginBottom: '1rem', fontSize: '1.1rem', fontWeight: 600 }}>Climate Trend: Avg Max Wind (km/h)</h3>
            <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="year" stroke="#4db8e8" fontSize={12} minTickGap={20} />
                    <YAxis stroke="#4db8e8" fontSize={12} domain={['auto', 'auto']} />
                    <Tooltip
                        contentStyle={{ backgroundColor: '#071e2b', borderColor: '#4db8e8', borderRadius: '8px' }}
                        itemStyle={{ color: '#fff' }}
                        labelStyle={{ color: '#4db8e8', fontWeight: 'bold' }}
                    />
                    <Line type="monotone" dataKey="avgWind" name="Avg Max Wind" stroke="#ff4d6d" strokeWidth={3} dot={{ r: 4, fill: '#0a192f', stroke: '#ff4d6d', strokeWidth: 2 }} activeDot={{ r: 6, fill: '#ff4d6d' }} />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
}
