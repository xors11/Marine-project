const fs = require("fs");
const path = require("path");
module.exports = function handler(req, res) {
    try {
        const p = path.join(process.cwd(), "data", "cyclone_tracks_NI.json");
        if (!fs.existsSync(p)) return res.status(500).json({ error: "File not found" });
        res.json(JSON.parse(fs.readFileSync(p, "utf-8")));
    } catch (err) { res.status(500).json({ error: err.message }); }
};
