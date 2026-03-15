import fs from 'fs';
import path from 'path';

const dataPath = path.join(path.dirname(new URL(import.meta.url).pathname), '..', '..', 'data');

function loadTracksData() {
    try {
        const p = path.join(dataPath, 'cyclone_tracks_NI.json');
        return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf-8')) : null;
    } catch { return null; }
}

export default function handler(req, res) {
    const cache = loadTracksData();
    if (!cache) return res.status(500).json({ error: 'Cyclone tracks not loaded' });
    res.json(cache);
}
