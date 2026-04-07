/**
 * services/api.js
 * All API calls go through this module. Components never fetch directly.
 */

// ─── Retry helper ─────────────────────────────────────────────────────────────
async function fetchWithRetry(url, retries = 3, delayMs = 800) {
    for (let attempt = 0; attempt < retries; attempt++) {
        try {
            const res = await fetch(url);
            if (res.ok) return res;
            // Don't retry on 4xx client errors
            if (res.status >= 400 && res.status < 500) throw new Error(`Client error ${res.status}`);
        } catch (err) {
            if (attempt === retries - 1) throw err;
            await new Promise(r => setTimeout(r, delayMs * (attempt + 1)));
        }
    }
}

/**
 * Fetch buoy data for a given location directly from Open-Meteo.
 * Uses retry logic and merges marine + weather APIs.
 */
export async function fetchBuoyData(lat, lon) {
    const marineUrl =
        `https://marine-api.open-meteo.com/v1/marine` +
        `?latitude=${lat}&longitude=${lon}` +
        `&hourly=wave_height,sea_surface_temperature` +
        `&past_days=5&forecast_days=3&timezone=UTC`;

    const weatherUrl =
        `https://historical-forecast-api.open-meteo.com/v1/forecast` +
        `?latitude=${lat}&longitude=${lon}` +
        `&hourly=wind_speed_10m,surface_pressure` +
        `&past_days=5&forecast_days=3&timezone=UTC`;

    // Fetch both in parallel with retry
    const [marineRes, weatherRes] = await Promise.all([
        fetchWithRetry(marineUrl),
        fetchWithRetry(weatherUrl),
    ]);

    if (!marineRes || !weatherRes) {
        throw new Error('Open-Meteo API is unreachable. Check your internet connection.');
    }

    const marine = await marineRes.json();
    const weather = await weatherRes.json();

    // Validate response structure
    if (!weather.hourly?.time) {
        throw new Error('Unexpected response format from Open-Meteo weather API.');
    }
    if (!marine.hourly?.sea_surface_temperature) {
        throw new Error('Unexpected response format from Open-Meteo marine API.');
    }

    const times = weather.hourly.time ?? [];
    const rows = times.map((t, i) => ({
        timestamp: t,
        sea_surface_temp: marine.hourly?.sea_surface_temperature?.[i] ?? null,
        wind_speed: weather.hourly?.wind_speed_10m?.[i] ?? null,
        air_pressure: weather.hourly?.surface_pressure?.[i] ?? null,
        wave_height: marine.hourly?.wave_height?.[i] ?? null,
    }));

    // Include 1 hour buffer so current hour is always shown
    const nowMs = Date.now() + 60 * 60 * 1000;
    return rows.filter(r => new Date(r.timestamp).getTime() <= nowMs);
}

/**
 * Fetch cyclone risk data directly from Open-Meteo (no backend needed).
 */
export async function fetchCycloneRisk(lat = 15, lon = 85, cycloneSummaryData = []) {
    const marineUrl =
        `https://marine-api.open-meteo.com/v1/marine` +
        `?latitude=${lat}&longitude=${lon}` +
        `&hourly=wave_height,sea_surface_temperature` +
        `&past_days=1&forecast_days=2&timezone=UTC`;

    const weatherUrl =
        `https://historical-forecast-api.open-meteo.com/v1/forecast` +
        `?latitude=${lat}&longitude=${lon}` +
        `&hourly=wind_speed_10m,surface_pressure` +
        `&past_days=1&forecast_days=2&timezone=UTC`;

    const [marineRes, weatherRes] = await Promise.all([
        fetchWithRetry(marineUrl),
        fetchWithRetry(weatherUrl),
    ]);

    if (!marineRes || !weatherRes) throw new Error('Failed to fetch data for cyclone risk');

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

    let risk_level = 'STABLE';
    if (risk_index >= 70) risk_level = 'CYCLONE FORMATION LIKELY';
    else if (risk_index >= 50) risk_level = 'WARNING';
    else if (risk_index >= 30) risk_level = 'WATCH';

    const absDrop = Math.abs(Math.min(0, pressure_drop));
    let pressure_interpretation = 'Normal';
    if (absDrop >= 10) pressure_interpretation = 'Cyclone formation likely';
    else if (absDrop >= 6) pressure_interpretation = 'Storm development';
    else if (absDrop >= 3) pressure_interpretation = 'Instability';

    let historical_analog = null;
    if (cycloneSummaryData.length > 0) {
        let bestMatch = null, bestDiff = Infinity;
        cycloneSummaryData.forEach(storm => {
            const diff = Math.abs((storm.max_wind_kmh || 0) - wind_speed) + Math.abs((storm.season || 2000) - 2024) * 0.5;
            if (diff < bestDiff && storm.name !== 'UNNAMED') { bestDiff = diff; bestMatch = storm; }
        });
        if (bestMatch) {
            historical_analog = {
                name: bestMatch.name,
                year: Math.floor(bestMatch.season),
                max_wind: Math.round(bestMatch.max_wind_kmh),
                category: bestMatch.max_wind_kmh >= 177 ? 'Severe Cyclone' : (bestMatch.max_wind_kmh >= 118 ? 'Cyclone' : 'Storm')
            };
        }
    }

    return {
        risk_index, risk_level,
        formation_probability: Math.min(100, Math.round(risk_index * 1.1)),
        pressure_drop: Math.round(pressure_drop * 10) / 10,
        pressure_interpretation,
        sst: Math.round(sst * 10) / 10,
        wind_speed: Math.round(wind_speed),
        wave_height: Math.round(wave_height * 10) / 10,
        sst_factor: Math.round(sst_factor),
        wind_factor: Math.round(wind_factor),
        pressure_factor: Math.round(pressure_drop_factor),
        wave_factor: Math.round(wave_height_factor),
        historical_analog, lat, lon,
        timestamp: new Date().toISOString()
    };
}

/**
 * Fetch historical buoy data.
 * Tries a local backend first; if unavailable, fetches directly from
 * Open-Meteo archive API so the app works with NO backend at all.
 */
export async function fetchHistoricalBuoyData(lat = -2, lon = 81) {
    // 1️⃣ Try local backend first (if running)
    try {
        const res = await fetch('/api/buoy-historical', { signal: AbortSignal.timeout(3000) });
        if (res.ok) {
            const json = await res.json();
            if (Array.isArray(json?.data)) return json.data;
            if (Array.isArray(json)) return json;
        }
    } catch {
        // Backend not running — fall through to Open-Meteo archive
        console.info('[api] No local backend found, fetching historical data from Open-Meteo archive…');
    }

    // 2️⃣ Fallback: Open-Meteo archive API (free, no backend needed)
    const startDate = '2012-01-01';
    const endDate = new Date().toISOString().slice(0, 10);

    const archiveUrl =
        `https://archive-api.open-meteo.com/v1/archive` +
        `?latitude=${lat}&longitude=${lon}` +
        `&start_date=${startDate}&end_date=${endDate}` +
        `&hourly=temperature_2m,wind_speed_10m,surface_pressure` +
        `&timezone=UTC`;

    const marineArchiveUrl =
        `https://marine-api.open-meteo.com/v1/marine` +
        `?latitude=${lat}&longitude=${lon}` +
        `&start_date=${startDate}&end_date=${endDate}` +
        `&hourly=wave_height,sea_surface_temperature` +
        `&timezone=UTC`;

    const [archiveRes, marineRes] = await Promise.all([
        fetchWithRetry(archiveUrl, 3, 1000),
        fetchWithRetry(marineArchiveUrl, 3, 1000),
    ]);

    if (!archiveRes || !marineRes) {
        throw new Error('Unable to load historical data. Check your internet connection.');
    }

    const archive = await archiveRes.json();
    const marine = await marineRes.json();

    if (!archive.hourly?.time) {
        throw new Error('Unexpected response from Open-Meteo archive API.');
    }

    return archive.hourly.time.map((t, i) => {
        const date = new Date(t);
        return {
            timestamp: date,
            year: date.getFullYear(),
            WTMP: marine.hourly?.sea_surface_temperature?.[i] ?? null,
            WSPD: archive.hourly?.wind_speed_10m?.[i] ?? null,
            PRES: archive.hourly?.surface_pressure?.[i] ?? null,
            WVHT: marine.hourly?.wave_height?.[i] ?? null,
        };
    });
}