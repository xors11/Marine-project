/**
 * Shared constants for the Ocean Blue dashboard.
 * Locations use lat/lon to drive the dynamic backend query.
 */

export const LOCATIONS = [
    { id: 'rama-23003', label: 'RAMA 23003 – 2°S 81°E', lat: -2, lon: 81 },
    { id: 'north-indian', label: 'North Indian Ocean – 12°N 65°E', lat: 12, lon: 65 },
    { id: 'bay-of-bengal', label: 'Bay of Bengal – 10°N 88°E', lat: 10, lon: 88 },
];

export const PARAMETERS = [
    { key: 'sea_surface_temp', label: 'Sea Surface Temp', unit: '°C', color: '#f97316' },
    { key: 'wind_speed', label: 'Wind Speed', unit: 'm/s', color: '#22d3ee' },
    { key: 'air_pressure', label: 'Air Pressure', unit: 'hPa', color: '#a78bfa' },
    { key: 'wave_height', label: 'Wave Height', unit: 'm', color: '#4ade80' },
];

