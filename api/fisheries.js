const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');

const __dirname = path.resolve();

module.exports = async function handler(req, res) {
    const filePath = path.join(__dirname, 'data', 'fisheries_indian_region_2023.csv');
    const regionFilter = req.query.region ? req.query.region.toLowerCase() : null;

    if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: "Fisheries data file not found" });
    }

    const results = [];
    const stream = fs.createReadStream(filePath).pipe(csv());

    stream.on('data', (row) => {
        if (regionFilter && row.region.toLowerCase() !== regionFilter) {
            return;
        }

        results.push({
            id: Number(row.id),
            region: row.region,
            species: row.species,
            scientific_name: row.scientific_name,
            stock_health_percent: Number(row.stock_health_percent),
            trend: row.trend,
            msy_tonnes: Number(row.msy_tonnes),
            current_catch_tonnes: Number(row.current_catch_tonnes),
            season_open: row.season_open.toLowerCase() === 'true',
            protected: row.protected.toLowerCase() === 'true'
        });
    });

    stream.on('end', () => {
        res.status(200).json({
            count: results.length,
            data: results
        });
    });

    stream.on('error', (err) => {
        console.error("Fisheries CSV error:", err);
        res.status(500).json({ error: "Failed to parse fisheries data" });
    });
}
