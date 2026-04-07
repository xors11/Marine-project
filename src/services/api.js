/**
 * services/api.js
 * All API calls go through this module. Components never fetch directly.
 */

const API_BASE = "";

/**
 * Fetch buoy data for a given location directly from Open-Meteo
 * avoiding backend (Vercel) IP blocks.
 */
export async function fetchBuoyData(lat, lon) {
    const marineUrl = `https://marine-api.open-meteo.com/v1/marine?latitude=${lat}&longitude=${lon}&hourly=wave_height,sea_surface_temperature&past_days=2&forecast_days=3&timezone=auto`;
    const weatherUrl = `https://historical-forecast-api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=wind_speed_10m,surface_pressure&past_days=2&forecast_days=3&timezone=auto`;

    const [marineRes, weatherRes] = await Promise.all([
        fetch(marineUrl),
        fetch(weatherUrl)
    ]);

    if (!marineRes.ok || !weatherRes.ok) {
        throw new Error("Failed to fetch live forecast data from Open-Meteo");
    }

    const marine = await marineRes.json();
    const weather = await weatherRes.json();

    const times = weather.hourly?.time ?? [];
    return times.map((t, i) => ({
        timestamp: t,
        sea_surface_temp: marine.hourly?.sea_surface_temperature?.[i] ?? null,
        wind_speed: weather.hourly?.wind_speed_10m?.[i] ?? null,
        air_pressure: weather.hourly?.surface_pressure?.[i] ?? null,
        wave_height: marine.hourly?.wave_height?.[i] ?? null,
    }));
}

/**
 * Compute the live cyclone risk purely on the client-side
 * avoiding backend (Vercel) IP blocks.
 */
export async function fetchCycloneRisk(lat = 15, lon = 85, cycloneSummaryData = []) {
    const marineUrl = `https://marine-api.open-meteo.com/v1/marine?latitude=${lat}&longitude=${lon}&hourly=wave_height,sea_surface_temperature&past_days=1&forecast_days=2&timezone=auto`;
    const weatherUrl = `https://historical-forecast-api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=wind_speed_10m,surface_pressure&past_days=1&forecast_days=2&timezone=auto`;

    const [marineRes, weatherRes] = await Promise.all([
        fetch(marineUrl),
        fetch(weatherUrl)
    ]);

    if (!marineRes.ok || !weatherRes.ok) throw new Error("Failed to fetch data for cyclone risk");

    const marine = await marineRes.json();
    const weather = await weatherRes.json();
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
    let risk_level = "STABLE";
    if (risk_index >= 70) risk_level = "CYCLONE FORMATION LIKELY";
    else if (risk_index >= 50) risk_level = "WARNING";
    else if (risk_index >= 30) risk_level = "WATCH";

    const absDrop = Math.abs(Math.min(0, pressure_drop));
    let pressure_interpretation = "Normal";
    if (absDrop >= 10) pressure_interpretation = "Cyclone formation likely";
    else if (absDrop >= 6) pressure_interpretation = "Storm development";
    else if (absDrop >= 3) pressure_interpretation = "Instability";

    let historical_analog = null;
    if (cycloneSummaryData.length > 0) {
        let bestMatch = null, bestDiff = Infinity;
        cycloneSummaryData.forEach(storm => {
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
                category: bestMatch.max_wind_kmh >= 177 ? "Severe Cyclone" : (bestMatch.max_wind_kmh >= 118 ? "Cyclone" : "Storm")
            };
        }
    }

    return {
        risk_index, risk_level, formation_probability: Math.min(100, Math.round(risk_index * 1.1)),
        pressure_drop: Math.round(pressure_drop * 10) / 10, pressure_interpretation,
        sst: Math.round(sst * 10) / 10, wind_speed: Math.round(wind_speed), wave_height: Math.round(wave_height * 10) / 10,
        sst_factor: Math.round(sst_factor), wind_factor: Math.round(wind_factor),
        pressure_factor: Math.round(pressure_drop_factor), wave_factor: Math.round(wave_height_factor),
        historical_analog, lat, lon, timestamp: new Date().toISOString()
    };
}

/**
 * Fetch all historical buoy data from the local Express server.
 * Returns raw rows as-is; parsing is done in the hook.
 */
export async function fetchHistoricalBuoyData() {
    const url = `${API_BASE}/api/buoy-historical`;
    const res = await fetch(url);

    if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Server error ${res.status}`);
    }

    const json = await res.json();

    if (json && Array.isArray(json.data)) return json.data;
    if (Array.isArray(json)) return json;

    throw new Error('Unexpected response from /api/buoy-historical');
}
