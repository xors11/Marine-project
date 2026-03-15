const fs = require('fs');
const path = require('path');

const __dirname = path.resolve();
const dataPath = path.join(__dirname, 'data');

function loadTracksData() {
    try {
        const p = path.join(dataPath, 'cyclone_tracks_NI.json');
        return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf-8')) : null;
    } catch { return null; }
}

module.exports = function handler(req, res) {
    const cache = loadTracksData();
    if (!cache) return res.status(500).json({ error: 'Cyclone tracks not loaded' });
    res.json(cache);
}
