import fs from 'fs';
import path from 'path';

const dataPath = path.join(path.dirname(new URL(import.meta.url).pathname), '..', '..', 'data');

function loadCycloneData() {
    try {
        const p = path.join(dataPath, 'cyclone_summary_NI.json');
        return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf-8')) : null;
    } catch { return null; }
}

export default function handler(req, res) {
    const cache = loadCycloneData();
    if (!cache) return res.status(500).json({ error: 'Cyclone summary not loaded' });
    res.json(cache);
}
