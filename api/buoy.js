const axios = require('axios');

module.exports = async function handler(req, res) {
    const lat = parseFloat(req.query.lat);
    const lon = parseFloat(req.query.lon);

    if (isNaN(lat) || isNaN(lon)) {
        return res.status(400).json({ error: "lat and lon query params are required" });
    }

    try {
        console.log(`[LIVE ${new Date().toISOString()}] Fetching buoy lat:${lat} lon:${lon}`);

        const marineUrl = "https://marine-api.open-meteo.com/v1/marine";
        const weatherUrl = "https://historical-forecast-api.open-meteo.com/v1/forecast";

        const marineRes = await axios.get(marineUrl, {
            params: {
                latitude: lat,
                longitude: lon,
                hourly: "wave_height,sea_surface_temperature",
                past_days: 2,
                forecast_days: 3,
                timezone: "auto",
            },
            timeout: 10000,
            headers: { "User-Agent": "Mozilla/5.0" }
        });

        const weatherRes = await axios.get(weatherUrl, {
            params: {
                latitude: lat,
                longitude: lon,
                hourly: "wind_speed_10m,surface_pressure",
                past_days: 2,
                forecast_days: 3,
                timezone: "auto",
            },
            timeout: 10000,
            headers: { "User-Agent": "Mozilla/5.0" }
        });

        const marine = marineRes.data;
        const weather = weatherRes.data;

        const times = weather.hourly?.time ?? [];

        const rows = times.map((t, i) => ({
            timestamp: t,
            sea_surface_temp: marine.hourly?.sea_surface_temperature?.[i] ?? null,
            wind_speed: weather.hourly?.wind_speed_10m?.[i] ?? null,
            air_pressure: weather.hourly?.surface_pressure?.[i] ?? null,
            wave_height: marine.hourly?.wave_height?.[i] ?? null,
        }));

        res.json({ lat, lon, data: rows });

        console.log(`[LIVE] Got ${rows.length} pts · latest: ${rows[rows.length - 1]?.timestamp} · SST: ${rows[rows.length - 1]?.sea_surface_temp}°C`);

    } catch (err) {
        console.error(`[${new Date().toISOString()}] Live API error:`, err.message);
        res.status(502).json({
            error: "Live data temporarily unavailable",
            timestamp: new Date().toISOString(),
            retry_after: 30
        });
    }
};
