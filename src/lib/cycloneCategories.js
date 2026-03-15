/**
 * Cyclone category classification based on max wind speed in km/h
 * Uses Saffir-Simpson-inspired scale for North Indian Ocean
 */
export function categorizeCyclone(max_wind_kmh) {
    if (max_wind_kmh >= 252) return { category: 5, label: "Category 5", color: "#7f1d1d" };
    if (max_wind_kmh >= 209) return { category: 4, label: "Category 4", color: "#dc2626" };
    if (max_wind_kmh >= 178) return { category: 3, label: "Category 3", color: "#ea580c" };
    if (max_wind_kmh >= 154) return { category: 2, label: "Category 2", color: "#f97316" };
    if (max_wind_kmh >= 119) return { category: 1, label: "Category 1", color: "#facc15" };
    return { category: 0, label: "Tropical Storm", color: "#3b82f6" };
}
