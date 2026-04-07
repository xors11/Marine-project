const axios = require("axios");
const fs = require("fs");
const path = require("path");
module.exports = async function handler(req, res) {
    const lat = parseFloat(req.query.lat) || 15;
    const lon = parseFloat(req.query.lon) || 85;
    try {
        const [marineRes, weatherRes] = await Promise.all([
            axios.get("https://marine-api.open-meteo.com/v1/marine", { params: { latitude: lat, longitude: lon, hourly: "wave_height,sea_surface_temperature", past_days: 1, forecast_days: 2, timezone: "auto" }, timeout: 10000 }),
            axios.get("https://historical-forecast-api.open-meteo.com/v1/forecast", { params: { latitude: lat, longitude: lon, hourly: "wind_speed_10m,surface_pressure", past_days: 1, forecast_days: 2, timezone: "auto" }, timeout: 10000 })
        ]);
        const marine = marineRes.data, weather = weatherRes.data;
        const times = weather.hourly?.time ?? [];
        const latestIdx = Math.max(0, times.length - 1);
        const sixHrAgoIdx = Math.max(0, latestIdx - 6);
        const sst = marine.hourly?.sea_surface_temperature?.[latestIdx] ?? 27;
        const wind_speed = weather.hourly?.wind_speed_10m?.[latestIdx] ?? 20;
        const pressure_now = weather.hourly?.surface_pressure?.[latestIdx] ?? 1013;
        const pressure_6hr = weather.hourly?.surface_pressure?.[sixHrAgoIdx] ?? 1013;
        const wave_height = marine.hourly?.wave_height?.[latestIdx] ?? 1.5;
        const pressure_drop = pressure_now - pressure_6hr;
        const sst_factor = Math.max(0, Math.min(100, ((sst - 26) / 6) * 100));
        const pressure_drop_factor = Math.max(0, Math.min(100, (Math.abs(Math.min(0, pressure_drop)) / 12) * 100));
        const wind_factor = Math.max(0, Math.min(100, (wind_speed / 120) * 100));
        const wave_height_factor = Math.max(0, Math.min(100, (wave_height / 12) * 100));
        const risk_index = Math.round((sst_factor * 0.35) + (pressure_drop_factor * 0.30) + (wind_factor * 0.20) + (wave_height_factor * 0.15));
        let risk_level = risk_index >= 70 ? "CYCLONE FORMATION LIKELY" : risk_index >= 50 ? "WARNING" : risk_index >= 30 ? "WATCH" : "STABLE";
        const absDrop = Math.abs(Math.min(0, pressure_drop));
        let historical_analog = null;
        try {
            const sp = path.join(process.cwd(), "data", "cyclone_summary_NI.json");
            if (fs.existsSync(sp)) {
                const cache = JSON.parse(fs.readFileSync(sp, "utf-8"));
                let bestMatch = null, bestDiff = Infinity;
                cache.forEach(storm => {
                    const diff = Math.abs((storm.max_wind_kmh || 0) - wind_speed) + Math.abs((storm.season || 2000) - 2024) * 0.5;
                    if (diff < bestDiff && storm.name !== "UNNAMED") { bestDiff = diff; bestMatch = storm; }
                });
                if (bestMatch) historical_analog = { name: bestMatch.name, year: Math.floor(bestMatch.season), max_wind: Math.round(bestMatch.max_wind_kmh), category: bestMatch.max_wind_kmh >= 177 ? "Severe Cyclone" : "Cyclone" };
            }
        } catch (_) { }
        res.json({ risk_index, risk_level, formation_probability: Math.min(100, Math.round(risk_index * 1.1)), pressure_drop: Math.round(pressure_drop * 10) / 10, pressure_interpretation: absDrop >= 10 ? "Cyclone formation likely" : absDrop >= 6 ? "Storm development" : absDrop >= 3 ? "Instability" : "Normal", sst: Math.round(sst * 10) / 10, wind_speed: Math.round(wind_speed), wave_height: Math.round(wave_height * 10) / 10, sst_factor: Math.round(sst_factor), wind_factor: Math.round(wind_factor), pressure_factor: Math.round(pressure_drop_factor), wave_factor: Math.round(wave_height_factor), historical_analog, lat, lon, timestamp: new Date().toISOString() });
    } catch (err) { res.status(502).json({ error: "Failed to compute cyclone risk", details: err.message }); }
};
