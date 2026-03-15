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
    if (!cache) return res.status(500).json({ error: 'Cyclone summary not loaded' });
    res.json(cache);
}
