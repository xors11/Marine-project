const fs = require('fs');
const path = require('path');

const __dirname = path.resolve();

function loadCycloneData() {
    try {
        const summaryPath = path.join(__dirname, "data", "cyclone_summary_NI.json");
        if (fs.existsSync(summaryPath)) {
            return JSON.parse(fs.readFileSync(summaryPath, "utf-8"));
        }
    } catch (err) {
        console.error("Error loading Cyclone JSON files:", err);
    }
    return null;
}

module.exports = function handler(req, res) {
    const cycloneSummaryCache = loadCycloneData();

    if (!cycloneSummaryCache) return res.status(500).json({ error: "Cyclone data not loaded" });

    const total_storms = cycloneSummaryCache.length;
    // strong >= 64 knots (~118 km/h)
    const strong_storms = cycloneSummaryCache.filter(s => s.max_wind_kmh >= 118).length;
    // severe >= 96 knots (~177 km/h)
    const severe_storms = cycloneSummaryCache.filter(s => s.max_wind_kmh >= 177).length;

    const yearCounts = {};
    let totalWind = 0;
    let maxYear = 0;

    cycloneSummaryCache.forEach(s => {
        const year = Math.floor(s.season);
        yearCounts[year] = (yearCounts[year] || 0) + 1;
        totalWind += s.max_wind_kmh;
        if (year > maxYear) maxYear = year;
    });

    const latestStorms = cycloneSummaryCache.filter(s => Math.floor(s.season) === maxYear);
    let latestStorm = null;
    if (latestStorms.length > 0) {
        const storm = latestStorms.reduce((prev, curr) => (prev.max_wind_kmh > curr.max_wind_kmh) ? prev : curr);
        latestStorm = {
            name: storm.name !== "UNNAMED" ? storm.name : `Storm of ${maxYear}`,
            year: maxYear,
            max_wind: Math.round(storm.max_wind_kmh)
        };
    }

    let most_active_year = 0;
    let maxCount = 0;
    for (const [y, count] of Object.entries(yearCounts)) {
        if (count > maxCount) {
            maxCount = count;
            most_active_year = Number(y);
        }
    }

    const avg_max_wind = total_storms > 0 ? Math.round(totalWind / total_storms) : 0;

    res.json({
        total_storms,
        strong_storms,
        severe_storms,
        most_active_year,
        avg_max_wind,
        latest_storm: latestStorm
    });
};
