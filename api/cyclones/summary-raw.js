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
    if (!cycloneSummaryCache) return res.status(500).json({ error: "Cyclone summary not loaded" });
    res.json(cycloneSummaryCache);
};
