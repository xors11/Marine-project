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

    const isSimulation = req.query.simulate === 'sst_increase';

    const total_storms = cycloneSummaryCache.length || 1;
    const strong_storms = cycloneSummaryCache.filter(s => s.max_wind_kmh >= 118).length;
    let severe_storms = cycloneSummaryCache.filter(s => s.max_wind_kmh >= 177).length;

    if (isSimulation) {
        severe_storms = Math.round(severe_storms * 1.12);
    }

    const StrongStormFrequency = (strong_storms / total_storms) * 100;
    const SevereStormFrequency = (severe_storms / total_storms) * 100;
    const Recent10YearTrend = 65;
    const IntensityGrowthFactor = isSimulation ? 80 : 50;

    let RiskScore =
        (StrongStormFrequency * 0.4) +
        (SevereStormFrequency * 0.3) +
        (Recent10YearTrend * 0.2) +
        (IntensityGrowthFactor * 0.1);

    RiskScore = Math.min(100, Math.round(RiskScore));

    let risk_level = "LOW";
    if (RiskScore >= 70) risk_level = "HIGH";
    else if (RiskScore >= 45) risk_level = "MODERATE";

    res.json({
        risk_index: RiskScore,
        risk_level,
        trend: isSimulation ? "Rapidly Increasing" : "Increasing",
        hotspot_lat: 17.5,
        hotspot_lon: 88.3
    });
};
