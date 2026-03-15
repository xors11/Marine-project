const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');

module.exports = function handler(req, res) {
    const filePath = path.join(process.cwd(), "data", "fisheries_indian_region_2023.csv");
    const regionQuery = req.query.region?.toLowerCase();

    if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: "Fisheries CSV not found", path: filePath });
    }

    const results = [];

    fs.createReadStream(filePath)
        .pipe(csv())
        .on("data", (row) => {
            const record = {
                id: Number(row.id),
                region: row.region,
                species: row.species,
                stock_health_percent: Number(row.stock_health_percent) || 0,
                trend: row.trend,
                msy_tonnes: Number(row.msy_tonnes) || 1,
                current_catch_tonnes: Number(row.current_catch_tonnes) || 0,
            };

            if (!regionQuery || record.region?.toLowerCase() === regionQuery) {
                results.push(record);
            }
        })
        .on("end", () => {
            if (results.length === 0) {
                return res.json({
                    region: regionQuery || "All Regions",
                    sustainability_index: 0,
                    sustainability_level: "Critical",
                    collapse_risk: { score: 0, level: "Low" },
                    climate_stress: { sst: 28, score: 20 },
                    future_projection: { index_6_month: 0, change: 0 },
                    model_confidence: 80,
                    risk_attribution: {
                        stock_health: 0,
                        msy_pressure: 0,
                        declining_trend: 0,
                        climate_stress: 0
                    },
                    critical_species_count: 0,
                    overfishedCount: 0,
                    species: [],
                    smartAlerts: [],
                    simulation: { enabled: false }
                });
            }

            const avgStock =
                results.reduce((sum, r) => sum + r.stock_health_percent, 0) / results.length;

            const avgMSY =
                results.reduce((sum, r) =>
                    sum + (r.current_catch_tonnes / r.msy_tonnes) * 100, 0
                ) / results.length;

            const sustainabilityIndex =
                Math.max(0, Math.min(100, Math.round((avgStock * 0.6) + ((100 - avgMSY) * 0.4))));

            res.json({
                region: regionQuery || "All Regions",
                sustainability_index: sustainabilityIndex,
                sustainability_level:
                    sustainabilityIndex >= 70 ? "Sustainable"
                        : sustainabilityIndex >= 50 ? "Caution"
                            : "Critical",
                collapse_risk: {
                    score: Math.round(avgMSY),
                    level: avgMSY > 80 ? "High" : "Moderate"
                },
                climate_stress: { sst: 28.5, score: 40 },
                future_projection: {
                    index_6_month: sustainabilityIndex - 2,
                    change: -2
                },
                model_confidence: 85,
                risk_attribution: {
                    stock_health: Math.round(100 - avgStock),
                    msy_pressure: Math.round(avgMSY),
                    declining_trend: 20,
                    climate_stress: 10
                },
                critical_species_count:
                    results.filter(r => r.stock_health_percent < 40).length,
                overfishedCount:
                    results.filter(r =>
                        (r.current_catch_tonnes / r.msy_tonnes) > 1
                    ).length,
                species: results,
                smartAlerts: [],
                simulation: { enabled: false }
            });
        })
        .on("error", (err) => {
            console.error("Fisheries CSV error:", err.message);
            res.status(500).json({ error: "Failed to read fisheries CSV", details: err.message });
        });
};