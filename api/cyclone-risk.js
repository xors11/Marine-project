const axios = require('axios');
const fs = require('fs');
const path = require('path');

const __dirname = path.resolve();

function loadSummary() {
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

module.exports = async function handler(req, res) {
    const lat = parseFloat(req.query.lat) || 15;
    const lon = parseFloat(req.query.lon) || 85;

    const cycloneSummaryCache = loadSummary();

    try {
        const marineUrl = "https://marine-api.open-meteo.com/v1/marine";
        const weatherUrl = "https://api.open-meteo.com/v1/forecast";

        const [marineRes, weatherRes] = await Promise.all([
            axios.get(marineUrl, {
                params: {
                    latitude: lat, longitude: lon,
                    hourly: "wave_height,sea_surface_temperature",
                    past_days: 1, forecast_days: 2, timezone: "auto"
                },
                timeout: 10000,
                headers: { "User-Agent": "Mozilla/5.0" }
            }),
            axios.get(weatherUrl, {
                params: {
                    latitude: lat, longitude: lon,
                    hourly: "wind_speed_10m,surface_pressure",
                    past_days: 1, forecast_days: 2, timezone: "auto"
                },
                timeout: 10000,
                headers: { "User-Agent": "Mozilla/5.0" }
            })
        ]);

        const marine = marineRes.data;
        const weather = weatherRes.data;
        const times = weather.hourly?.time ?? [];

        // Get most recent valid readings
        const len = times.length;
        const latestIdx = Math.max(0, len - 1);
        const sixHrAgoIdx = Math.max(0, latestIdx - 6);

        const sst = marine.hourly?.sea_surface_temperature?.[latestIdx] ?? 27;
        const wind_speed = weather.hourly?.wind_speed_10m?.[latestIdx] ?? 20;
        const pressure_now = weather.hourly?.surface_pressure?.[latestIdx] ?? 1013;
        const pressure_6hr = weather.hourly?.surface_pressure?.[sixHrAgoIdx] ?? 1013;
        const wave_height = marine.hourly?.wave_height?.[latestIdx] ?? 1.5;

        const pressure_drop = pressure_now - pressure_6hr;

        // Normalize factors to 0–100
        // SST: 26°C = 0, 32°C = 100
        const sst_factor = Math.max(0, Math.min(100, ((sst - 26) / 6) * 100));
        // Pressure drop: 0 mb = 0, -12 mb = 100
        const pressure_drop_factor = Math.max(0, Math.min(100, (Math.abs(Math.min(0, pressure_drop)) / 12) * 100));
        // Wind: 0 km/h = 0, 120 km/h = 100
        const wind_factor = Math.max(0, Math.min(100, (wind_speed / 120) * 100));
        // Wave height: 0 m = 0, 12 m = 100
        const wave_height_factor = Math.max(0, Math.min(100, (wave_height / 12) * 100));

        const risk_index = Math.round(
            (sst_factor * 0.35) +
            (pressure_drop_factor * 0.30) +
            (wind_factor * 0.20) +
            (wave_height_factor * 0.15)
        );

        let risk_level = "STABLE";
        if (risk_index >= 70) risk_level = "CYCLONE FORMATION LIKELY";
        else if (risk_index >= 50) risk_level = "WARNING";
        else if (risk_index >= 30) risk_level = "WATCH";

        const formation_probability = Math.min(100, Math.round(risk_index * 1.1));

        // Pressure drop interpretation
        let pressure_interpretation = "Normal";
        const absDrop = Math.abs(Math.min(0, pressure_drop));
        if (absDrop >= 10) pressure_interpretation = "Cyclone formation likely";
        else if (absDrop >= 6) pressure_interpretation = "Storm development";
        else if (absDrop >= 3) pressure_interpretation = "Instability";

        // Historical analog matching
        let historical_analog = null;
        if (cycloneSummaryCache && cycloneSummaryCache.length > 0) {
            let bestMatch = null;
            let bestDiff = Infinity;
            cycloneSummaryCache.forEach(storm => {
                const diff = Math.abs((storm.max_wind_kmh || 0) - wind_speed) + Math.abs((storm.season || 2000) - 2024) * 0.5;
                if (diff < bestDiff && storm.name !== "UNNAMED") {
                    bestDiff = diff;
                    bestMatch = storm;
                }
            });
            if (bestMatch) {
                historical_analog = {
                    name: bestMatch.name,
                    year: Math.floor(bestMatch.season),
                    max_wind: Math.round(bestMatch.max_wind_kmh),
                    category: bestMatch.max_wind_kmh >= 177 ? "Severe Cyclone" : bestMatch.max_wind_kmh >= 118 ? "Cyclone" : "Storm"
                };
            }
        }

        res.json({
            risk_index,
            risk_level,
            formation_probability,
            pressure_drop: Math.round(pressure_drop * 10) / 10,
            pressure_interpretation,
            sst: Math.round(sst * 10) / 10,
            wind_speed: Math.round(wind_speed),
            wave_height: Math.round(wave_height * 10) / 10,
            sst_factor: Math.round(sst_factor),
            wind_factor: Math.round(wind_factor),
            pressure_factor: Math.round(pressure_drop_factor),
            wave_factor: Math.round(wave_height_factor),
            historical_analog,
            lat, lon,
            timestamp: new Date().toISOString()
        });

    } catch (err) {
        console.error("Cyclone-Risk API error:", err.message);
        res.status(502).json({ error: "Failed to compute cyclone risk" });
    }
};
