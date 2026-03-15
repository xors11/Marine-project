import fs from 'fs';
import path from 'path';

const __filename = new URL(import.meta.url).pathname;
const __dirname = path.dirname(__filename);
const dataPath = path.join(__dirname, '..', '..', 'data');

function loadCycloneData() {
    try {
        const summaryPath = path.join(dataPath, 'cyclone_summary_NI.json');
        return fs.existsSync(summaryPath)
            ? JSON.parse(fs.readFileSync(summaryPath, 'utf-8'))
            : null;
    } catch { return null; }
}

export default function handler(req, res) {
    const cache = loadCycloneData();
    if (!cache) return res.status(500).json({ error: 'Cyclone data not loaded' });

    const total_storms = cache.length;
    const strong_storms = cache.filter(s => s.max_wind_kmh >= 118).length;
    const severe_storms = cache.filter(s => s.max_wind_kmh >= 177).length;

    const yearCounts = {};
    let totalWind = 0;
    let maxYear = 0;

    cache.forEach(s => {
        const year = Math.floor(s.season);
        yearCounts[year] = (yearCounts[year] || 0) + 1;
        totalWind += s.max_wind_kmh;
        if (year > maxYear) maxYear = year;
    });

    const latestStorms = cache.filter(s => Math.floor(s.season) === maxYear);
    let latestStorm = null;
    if (latestStorms.length > 0) {
        const storm = latestStorms.reduce((p, c) => p.max_wind_kmh > c.max_wind_kmh ? p : c);
        latestStorm = {
            name: storm.name !== 'UNNAMED' ? storm.name : `Storm of ${maxYear}`,
            year: maxYear,
            max_wind: Math.round(storm.max_wind_kmh)
        };
    }

    let most_active_year = 0, maxCount = 0;
    for (const [y, count] of Object.entries(yearCounts)) {
        if (count > maxCount) { maxCount = count; most_active_year = Number(y); }
    }

    const avg_max_wind = total_storms > 0 ? Math.round(totalWind / total_storms) : 0;
    res.json({ total_storms, strong_storms, severe_storms, most_active_year, avg_max_wind, latest_storm: latestStorm });
}
