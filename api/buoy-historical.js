import fs from 'fs';
import path from 'path';
import csv from 'csv-parser';

// Keep cache outside handler for serverless container reuse
let historicalDataCache = null;
let isParsing = false;
const parsePromises = [];

function getHistoricalData() {
    if (historicalDataCache) return Promise.resolve(historicalDataCache);
    return new Promise((resolve, reject) => {
        parsePromises.push({ resolve, reject });
        if (isParsing) return;
        isParsing = true;

        const filePath = path.join(process.cwd(), 'data', '46042_master_2012_2023.csv');
        if (!fs.existsSync(filePath)) {
            isParsing = false;
            const err = new Error("Historical CSV not found");
            while (parsePromises.length) parsePromises.shift().reject(err);
            return;
        }

        const results = [];
        fs.createReadStream(filePath)
            .pipe(csv())
            .on("data", (row) => {
                const timestamp = row.timestamp || row.TIMESTAMP || row.time || row.DATE || row.date || null;
                let year = null;
                if (timestamp) {
                    year = parseInt(timestamp.substring(0, 4));
                }
                results.push({
                    timestamp,
                    year,
                    WSPD: parseFloat(row.WSPD),
                    WTMP: parseFloat(row.WTMP),
                    ATMP: parseFloat(row.ATMP),
                    PRES: parseFloat(row.PRES),
                    WVHT: parseFloat(row.WVHT)
                });
            })
            .on("end", () => {
                historicalDataCache = results;
                isParsing = false;
                while (parsePromises.length) parsePromises.shift().resolve(historicalDataCache);
            })
            .on("error", (err) => {
                isParsing = false;
                while (parsePromises.length) parsePromises.shift().reject(err);
            });
    });
}

export default async function handler(req, res) {
    try {
        const data = await getHistoricalData();
        const yearQuery = req.query.year ? parseInt(req.query.year) : null;

        if (yearQuery) {
            const filtered = data.filter((r) => r.year === yearQuery);
            return res.status(200).json({
                count: filtered.length,
                year: yearQuery,
                data: filtered
            });
        }

        console.warn("[API] buoy-historical (serverless) requested without a year query parameter.");
        res.status(200).json({
            count: data.length,
            data: data
        });
    } catch (err) {
        console.error("Historical API error:", err.message);
        res.status(500).json({ error: err.message || "Failed to retrieve historical data" });
    }
}
