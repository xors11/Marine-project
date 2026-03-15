const fs = require("fs");
const path = require("path");
module.exports = function handler(req, res) {
    try {
        const p = path.join(process.cwd(), "data", "cyclone_summary_NI.json");
        if (!fs.existsSync(p)) return res.status(500).json({ error: "File not found" });
        const data = JSON.parse(fs.readFileSync(p, "utf-8"));
        const isSimulation = req.query.simulate === "sst_increase";
        const total_storms = data.length || 1;
        const strong_storms = data.filter(s => s.max_wind_kmh >= 118).length;
        let severe_storms = data.filter(s => s.max_wind_kmh >= 177).length;
        if (isSimulation) severe_storms = Math.round(severe_storms * 1.12);
        let RiskScore = Math.min(100, Math.round(
            ((strong_storms / total_storms) * 100 * 0.4) +
            ((severe_storms / total_storms) * 100 * 0.3) +
            (65 * 0.2) + ((isSimulation ? 80 : 50) * 0.1)
        ));
        res.json({ risk_index: RiskScore, risk_level: RiskScore >= 70 ? "HIGH" : RiskScore >= 45 ? "MODERATE" : "LOW", trend: isSimulation ? "Rapidly Increasing" : "Increasing", hotspot_lat: 17.5, hotspot_lon: 88.3 });
    } catch (err) { res.status(500).json({ error: err.message }); }
};
