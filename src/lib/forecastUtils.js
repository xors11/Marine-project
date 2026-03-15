/**
 * forecastUtils.js
 * Linear extrapolation forecast for ocean parameters.
 */

// Value caps per parameter to prevent unrealistic projections
const VALUE_CAPS = {
    sea_surface_temp: { min: 20, max: 35 },
    wind_speed: { min: 0, max: 30 },
    air_pressure: { min: 990, max: 1030 },
    wave_height: { min: 0, max: 8 },
};

/**
 * Generate forecast points using linear regression on the last N data points
 * @param {Array<{timestamp: string, [key]: number}>} data — sorted ascending
 * @param {string} paramKey — the data field to forecast
 * @param {number} steps — number of future points (default 12)
 * @param {number} intervalMs — ms between forecast points (default 3600000=1h)
 * @returns {Array<{timestamp: string, [key]: number, isForecast: boolean, label: string}>}
 */
export function linearForecast(data, paramKey, steps = 12, intervalMs = 3600000) {
    if (!data || data.length < 2) return [];

    // Take last 6 real data points (or fewer if not available)
    const tail = data.slice(-6);
    const values = tail.map(d => d[paramKey]).filter(v => v != null && !isNaN(v));
    if (values.length < 2) return [];

    // Simple linear regression: y = slope * x + intercept
    const n = values.length;
    const xMean = (n - 1) / 2;
    const yMean = values.reduce((a, b) => a + b, 0) / n;
    let num = 0, den = 0;
    for (let i = 0; i < n; i++) {
        num += (i - xMean) * (values[i] - yMean);
        den += (i - xMean) ** 2;
    }
    const slope = den !== 0 ? num / den : 0;
    const lastValue = values[values.length - 1];
    const lastRow = data[data.length - 1];
    const lastTs = new Date(lastRow.timestamp).getTime();

    const caps = VALUE_CAPS[paramKey] || { min: -Infinity, max: Infinity };
    const result = [];

    for (let i = 1; i <= steps; i++) {
        const ts = lastTs + i * intervalMs;
        let val = lastValue + slope * i;
        val = Math.max(caps.min, Math.min(caps.max, val));
        const d = new Date(ts);
        result.push({
            timestamp: d.toISOString(),
            [paramKey]: parseFloat(val.toFixed(3)),
            isForecast: true,
            label: d.toLocaleString('en-GB', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
        });
    }

    return result;
}
