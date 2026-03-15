import React, { useMemo } from 'react';
import { MapContainer, TileLayer, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

function getTrackStyle(windKnots) {
    if (windKnots < 34) {
        return { color: "#5DADE2", weight: 2 }; // Tropical Depression
    } else if (windKnots < 64) {
        return { color: "#00E5FF", weight: 3 }; // Tropical Storm
    } else if (windKnots < 96) {
        return { color: "#FFA500", weight: 4 }; // Cyclone
    } else {
        return { color: "#FF3B3B", weight: 5 }; // Severe Cyclone
    }
}

export default function CycloneMap({ tracksData, selectedYear }) {
    // Map tracksData { SID: [points] } to an array of polyline segments filtered by year
    const lines = useMemo(() => {
        if (!tracksData) return [];
        const result = [];
        Object.entries(tracksData).forEach(([sid, points]) => {
            if (!points || points.length < 2) return;
            // Check if any point in this storm happened in selectedYear
            const inYear = points.some(p => p.ISO_TIME.startsWith(selectedYear.toString()));
            if (!inYear) return;

            // Create segments between each point for intensity-based styling
            for (let i = 0; i < points.length - 1; i++) {
                const p1 = points[i];
                const p2 = points[i + 1];

                const latLons = [
                    [parseFloat(p1.LAT), parseFloat(p1.LON)],
                    [parseFloat(p2.LAT), parseFloat(p2.LON)]
                ];

                // Convert wind speed from km/h to knots (approx 1 knot = 1.852 km/h)
                const windKmh = parseFloat(p2.WIND_KMH) || 0;
                const windKnots = windKmh / 1.852;

                const style = getTrackStyle(windKnots);

                result.push({
                    id: `${sid}-${i}`,
                    positions: latLons,
                    color: style.color,
                    weight: style.weight
                });
            }
        });
        return result;
    }, [tracksData, selectedYear]);

    return (
        <div style={{ height: '400px', width: '100%', borderRadius: '12px', overflow: 'hidden', border: '1px solid rgba(36,144,204,0.3)', position: 'relative', zIndex: 1 }}>
            <MapContainer center={[15, 85]} zoom={5} style={{ height: '100%', width: '100%', background: '#020d18' }}>
                <TileLayer
                    url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                    attribution="&copy; OpenStreetMap contributors &copy; CARTO"
                />
                {lines.map((line) => (
                    <Polyline
                        key={line.id}
                        positions={line.positions}
                        pathOptions={{ color: line.color, weight: line.weight, opacity: 0.8 }}
                    />
                ))}
            </MapContainer>
        </div>
    );
}
