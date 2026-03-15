const fs = require('fs');
const path = require('path');

const __dirname = path.resolve();
const dataPath = path.join(__dirname, 'data');

function loadCycloneData() {
    try {
        const p = path.join(dataPath, 'cyclone_summary_NI.json');
        return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf-8')) : null;
    } catch { return null; }
}

module.exports = function handler(req, res) {
    const cache = loadCycloneData();
    if (!cache) return res.status(500).json({ error: 'Cyclone data not loaded' });

    const isSimulation = req.query.simulate === 'sst_increase';
    const total_storms = cache.length || 1;
    const strong_storms = cache.filter(s => s.max_wind_kmh >= 118).length;
    let severe_storms = cache.filter(s => s.max_wind_kmh >= 177).length;
    if (isSimulation) severe_storms = Math.round(severe_storms * 1.12);

    const StrongFreq = (strong_storms / total_storms) * 100;
    const SevereFreq = (severe_storms / total_storms) * 100;
    const TrendFactor = 65;
    const IntensityFactor = isSimulation ? 80 : 50;

    const RiskScore = Math.min(100, Math.round(
        (StrongFreq * 0.4) + (SevereFreq * 0.3) + (TrendFactor * 0.2) + (IntensityFactor * 0.1)
    ));

    let risk_level = 'LOW';
    if (RiskScore >= 70) risk_level = 'HIGH';
    else if (RiskScore >= 45) risk_level = 'MODERATE';

    res.json({ risk_index: RiskScore, risk_level, trend: isSimulation ? 'Rapidly Increasing' : 'Increasing', hotspot_lat: 17.5, hotspot_lon: 88.3 });
}
