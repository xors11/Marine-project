const express = require("express");
const axios = require("axios");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const csv = require("csv-parser");

const app = express();
app.use(cors());

// ─── /api/buoy (Live forecast via Open-Meteo Marine API) ────────────────────
app.get("/api/buoy", async (req, res) => {
    const lat = parseFloat(req.query.lat);
    const lon = parseFloat(req.query.lon);

    if (isNaN(lat) || isNaN(lon)) {
        return res.status(400).json({ error: "lat and lon query params are required" });
    }

    try {
        const url = "https://marine-api.open-meteo.com/v1/marine";
        const params = {
            latitude: lat,
            longitude: lon,
            hourly: [
                "wave_height",
                "wind_wave_height",
                "swell_wave_height",
                "sea_surface_temperature",
            ].join(","),
            current: [
                "wave_height",
                "wave_direction",
                "wave_period",
            ].join(","),
            past_days: 2,
            forecast_days: 3,
            timezone: "auto",
        };

        const marineRes = await axios.get(url, { params, timeout: 10000 });
        const marine = marineRes.data;

        const weatherUrl = "https://api.open-meteo.com/v1/forecast";
        const weatherParams = {
            latitude: lat,
            longitude: lon,
            hourly: [
                "temperature_2m",
                "wind_speed_10m",
                "surface_pressure",
                "sea_surface_temperature",
            ].join(","),
            past_days: 2,
            forecast_days: 3,
            timezone: "auto",
        };
        const weatherRes = await axios.get(weatherUrl, { params: weatherParams, timeout: 10000 });
        const weather = weatherRes.data;

        const times = weather.hourly?.time ?? [];
        const rows = times.map((t, i) => ({
            timestamp: t,
            sea_surface_temp: marine.hourly?.sea_surface_temperature?.[i] ?? weather.hourly?.sea_surface_temperature?.[i] ?? null,
            wind_speed: weather.hourly.wind_speed_10m?.[i] ?? null,
            air_pressure: weather.hourly.surface_pressure?.[i] ?? null,
            wave_height: marine.hourly?.wave_height?.[i] ?? null,
        }));

        res.json({ lat, lon, data: rows });
    } catch (err) {
        console.error("Open-Meteo error:", err.message);
        res.status(502).json({ error: "Failed to fetch live data: " + err.message });
    }
});

// ─── /api/buoy-historical (CSV) ─────────────────────────────────────────────
app.get("/api/buoy-historical", (req, res) => {
    const filePath = path.join(__dirname, "..", "data", "46042_master_2012_2023.csv");
    const results = [];

    if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: "Historical data file not found" });
    }

    fs.createReadStream(filePath)
        .pipe(csv())
        .on("data", (data) => results.push(data))
        .on("end", () => {
            res.json(results);
        })
        .on("error", (err) => {
            console.error("CSV error:", err);
            res.status(500).json({ error: "Failed to read CSV" });
        });
});

// ─── /api/fisheries (Unified Risk Framework) ───────────────────────────────
app.get("/api/fisheries", async (req, res) => {
    const filePath = path.join(__dirname, "..", "data", "fisheries_indian_region_2023.csv");
    const regionQuery = req.query.region?.toLowerCase();
    const results = [];

    // 1. Fetch live SST for Climate Stress Score
    let climateStressData = { sst_avg: 28.5 };
    try {
        const sstRes = await axios.get(`https://marine-api.open-meteo.com/v1/marine?latitude=-2&longitude=81&hourly=sea_surface_temperature&past_days=1&forecast_days=1`);
        const sstData = sstRes.data.hourly?.sea_surface_temperature || [];
        const validSst = sstData.filter(v => v !== null);
        if (validSst.length > 0) {
            climateStressData.sst_avg = validSst.reduce((a, b) => a + b, 0) / validSst.length;
        }
        // Simulation: Make Indian Ocean warmer for demo consistency
        if (regionQuery === 'indian ocean') climateStressData.sst_avg += 2.5;
    } catch (err) {
        console.error("SST Fetch fail:", err.message);
    }

    if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: "Data file not found" });
    }

    fs.createReadStream(filePath)
        .pipe(csv())
        .on("data", (row) => {
            const record = {
                id: Number(row.id),
                region: row.region,
                species: row.species,
                stock_health_percent: Number(row.stock_health_percent),
                trend: row.trend,
                msy_tonnes: Number(row.msy_tonnes),
                current_catch_tonnes: Number(row.current_catch_tonnes),
                protected: row.protected === "true"
            };
            if (!regionQuery || record.region.toLowerCase() === regionQuery) {
                results.push(record);
            }
        })
        .on("end", () => {
            if (results.length === 0) return res.json({ count: 0 });

            const sst = climateStressData.sst_avg;

            const avgStockHealth = results.reduce((sum, s) => sum + s.stock_health_percent, 0) / results.length;
            const avgMSY = results.reduce((sum, s) => sum + ((s.current_catch_tonnes / s.msy_tonnes) * 100), 0) / results.length;
            const msyPressureScore = Math.min(avgMSY, 120);
            const decliningCount = results.filter(s => s.trend === "Declining" || s.trend === "Critical").length;
            const decliningPercent = (decliningCount / results.length) * 100;

            let climateScore = 20;
            if (sst > 30) climateScore = 90;
            else if (sst > 28) climateScore = 60;
            else if (sst > 26) climateScore = 40;

            const sustainabilityIndex = (avgStockHealth * 0.5) + ((100 - msyPressureScore) * 0.25) + ((100 - decliningPercent) * 0.15) + ((100 - climateScore) * 0.10);
            const finalIndex = Math.max(0, Math.min(100, Math.round(sustainabilityIndex)));
            const collapseRisk = (msyPressureScore * 0.35) + (decliningPercent * 0.25) + ((100 - avgStockHealth) * 0.25) + (climateScore * 0.15);
            const finalCollapseRisk = Math.max(0, Math.min(100, Math.round(collapseRisk)));
            const projectedIndex = finalIndex - (finalCollapseRisk * 0.05);

            let sustLevel = "Caution";
            if (finalIndex >= 70) sustLevel = "Sustainable";
            else if (finalIndex < 50) sustLevel = "Critical";

            let riskLevel = "Moderate";
            if (finalCollapseRisk < 30) riskLevel = "Low";
            else if (finalCollapseRisk > 60) riskLevel = "High";

            res.json({
                region: regionQuery || "All Regions",
                sustainability_index: finalIndex,
                sustainability_level: sustLevel,
                collapse_risk: { score: finalCollapseRisk, level: riskLevel },
                climate_stress: { sst: parseFloat(sst.toFixed(1)), score: climateScore },
                projection: { index_6_month: Math.max(0, Math.round(projectedIndex)), change: Math.round(projectedIndex - finalIndex) },
                stats: {
                    count: results.length,
                    avg_stock_health: Math.round(avgStockHealth),
                    msy_utilization: Math.round(avgMSY),
                    declining_percent: Math.round(decliningPercent),
                    critical_species_count: results.filter(r => r.stock_health_percent < 40).length
                },
                data: results
            });
        });
});

// ─── /api/cyclones/* (Historical Cyclone Intelligence) ───────────────────────
let cycloneSummaryCache = null;
let cycloneTracksCache = null;

try {
    const summaryPath = path.join(__dirname, "..", "data", "cyclone_summary_NI.json");
    if (fs.existsSync(summaryPath)) {
        cycloneSummaryCache = JSON.parse(fs.readFileSync(summaryPath, "utf-8"));
    }
    const tracksPath = path.join(__dirname, "..", "data", "cyclone_tracks_NI.json");
    if (fs.existsSync(tracksPath)) {
        cycloneTracksCache = JSON.parse(fs.readFileSync(tracksPath, "utf-8"));
    }
} catch (err) {
    console.error("Error loading Cyclone JSON files:", err);
}

app.get("/api/cyclones/summary", (req, res) => {
    if (!cycloneSummaryCache) return res.status(500).json({ error: "Cyclone data not loaded" });

    const total_storms = cycloneSummaryCache.length;
    const strong_storms = cycloneSummaryCache.filter(s => s.max_wind_kmh >= 118).length;
    const severe_storms = cycloneSummaryCache.filter(s => s.max_wind_kmh >= 177).length;

    const yearCounts = {};
    let totalWind = 0;
    let maxYear = 0;

    cycloneSummaryCache.forEach(s => {
        const year = Math.floor(s.season);
        yearCounts[year] = (yearCounts[year] || 0) + 1;
        totalWind += s.max_wind_kmh;
        if (year > maxYear) maxYear = year;
    });

    const latestStorms = cycloneSummaryCache.filter(s => Math.floor(s.season) === maxYear);
    let latestStorm = null;
    if (latestStorms.length > 0) {
        const storm = latestStorms.reduce((prev, curr) => (prev.max_wind_kmh > curr.max_wind_kmh) ? prev : curr);
        latestStorm = {
            name: storm.name !== "UNNAMED" ? storm.name : `Storm of ${maxYear}`,
            year: maxYear,
            max_wind: Math.round(storm.max_wind_kmh)
        };
    }

    let most_active_year = 0;
    let maxCount = 0;
    for (const [y, count] of Object.entries(yearCounts)) {
        if (count > maxCount) { maxCount = count; most_active_year = Number(y); }
    }

    const avg_max_wind = total_storms > 0 ? Math.round(totalWind / total_storms) : 0;

    res.json({ total_storms, strong_storms, severe_storms, most_active_year, avg_max_wind, latest_storm: latestStorm });
});

app.get("/api/cyclones/summary-raw", (req, res) => {
    if (!cycloneSummaryCache) return res.status(500).json({ error: "Cyclone summary not loaded" });
    res.json(cycloneSummaryCache);
});

app.get("/api/cyclones/risk", (req, res) => {
    if (!cycloneSummaryCache) return res.status(500).json({ error: "Cyclone data not loaded" });

    const isSimulation = req.query.simulate === "sst_increase";
    const total_storms = cycloneSummaryCache.length || 1;
    const strong_storms = cycloneSummaryCache.filter(s => s.max_wind_kmh >= 118).length;
    let severe_storms = cycloneSummaryCache.filter(s => s.max_wind_kmh >= 177).length;

    if (isSimulation) severe_storms = Math.round(severe_storms * 1.12);

    const StrongStormFrequency = (strong_storms / total_storms) * 100;
    const SevereStormFrequency = (severe_storms / total_storms) * 100;
    const Recent10YearTrend = 65;
    const IntensityGrowthFactor = isSimulation ? 80 : 50;

    let RiskScore = Math.min(100, Math.round(
        (StrongStormFrequency * 0.4) +
        (SevereStormFrequency * 0.3) +
        (Recent10YearTrend * 0.2) +
        (IntensityGrowthFactor * 0.1)
    ));

    let risk_level = "LOW";
    if (RiskScore >= 70) risk_level = "HIGH";
    else if (RiskScore >= 45) risk_level = "MODERATE";

    res.json({ risk_index: RiskScore, risk_level, trend: isSimulation ? "Rapidly Increasing" : "Increasing", hotspot_lat: 17.5, hotspot_lon: 88.3 });
});

app.get("/api/cyclones/tracks", (req, res) => {
    if (!cycloneTracksCache) return res.status(500).json({ error: "Cyclone tracks not loaded" });
    res.json(cycloneTracksCache);
});

// ─── /api/cyclone-risk (Live Cyclone Formation Index) ───────────────────────
app.get("/api/cyclone-risk", async (req, res) => {
    const lat = parseFloat(req.query.lat) || 15;
    const lon = parseFloat(req.query.lon) || 85;

    try {
        const [marineRes, weatherRes] = await Promise.all([
            axios.get("https://marine-api.open-meteo.com/v1/marine", {
                params: { latitude: lat, longitude: lon, hourly: "wave_height,sea_surface_temperature", past_days: 1, forecast_days: 2, timezone: "auto" },
                timeout: 10000, headers: { "User-Agent": "Mozilla/5.0" }
            }),
            axios.get("https://api.open-meteo.com/v1/forecast", {
                params: { latitude: lat, longitude: lon, hourly: "wind_speed_10m,surface_pressure", past_days: 1, forecast_days: 2, timezone: "auto" },
                timeout: 10000, headers: { "User-Agent": "Mozilla/5.0" }
            })
        ]);

        const marine = marineRes.data;
        const weather = weatherRes.data;
        const times = weather.hourly?.time ?? [];
        const len = times.length;
        const latestIdx = Math.max(0, len - 1);
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

        let risk_level = "STABLE";
        if (risk_index >= 70) risk_level = "CYCLONE FORMATION LIKELY";
        else if (risk_index >= 50) risk_level = "WARNING";
        else if (risk_index >= 30) risk_level = "WATCH";

        const formation_probability = Math.min(100, Math.round(risk_index * 1.1));
        const absDrop = Math.abs(Math.min(0, pressure_drop));
        let pressure_interpretation = "Normal";
        if (absDrop >= 10) pressure_interpretation = "Cyclone formation likely";
        else if (absDrop >= 6) pressure_interpretation = "Storm development";
        else if (absDrop >= 3) pressure_interpretation = "Instability";

        let historical_analog = null;
        if (cycloneSummaryCache && cycloneSummaryCache.length > 0) {
            let bestMatch = null, bestDiff = Infinity;
            cycloneSummaryCache.forEach(storm => {
                const diff = Math.abs((storm.max_wind_kmh || 0) - wind_speed) + Math.abs((storm.season || 2000) - 2024) * 0.5;
                if (diff < bestDiff && storm.name !== "UNNAMED") { bestDiff = diff; bestMatch = storm; }
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

        res.json({ risk_index, risk_level, formation_probability, pressure_drop: Math.round(pressure_drop * 10) / 10, pressure_interpretation, sst: Math.round(sst * 10) / 10, wind_speed: Math.round(wind_speed), wave_height: Math.round(wave_height * 10) / 10, sst_factor: Math.round(sst_factor), wind_factor: Math.round(wind_factor), pressure_factor: Math.round(pressure_drop_factor), wave_factor: Math.round(wave_height_factor), historical_analog, lat, lon, timestamp: new Date().toISOString() });
    } catch (err) {
        console.error("Cyclone-Risk API error:", err.message);
        res.status(502).json({ error: "Failed to compute cyclone risk" });
    }
});

module.exports = app;
