const fs = require('fs');
const path = require('path');

const __dirname = path.resolve();

function loadTracksData() {
    try {
        const tracksPath = path.join(__dirname, "data", "cyclone_tracks_NI.json");
        if (fs.existsSync(tracksPath)) {
            return JSON.parse(fs.readFileSync(tracksPath, "utf-8"));
        }
    } catch (err) {
        console.error("Error loading Cyclone tracks JSON files:", err);
    }
    return null;
}

module.exports = function handler(req, res) {
    const cycloneTracksCache = loadTracksData();
    if (!cycloneTracksCache) return res.status(500).json({ error: "Cyclone tracks not loaded" });
    res.json(cycloneTracksCache);
};
