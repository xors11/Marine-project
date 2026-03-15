import React, { useRef, useEffect, useMemo, useState, useCallback } from 'react';
import Globe from 'globe.gl';
import { categorizeCyclone } from '../../lib/cycloneCategories';

export default function AdvancedGlobe({ currentYear, riskScore, isPlaying, setSpeed, tracksData, summaryData, buoysData = [] }) {
    const globeContainerRef = useRef(null);
    const globeRef = useRef(null);
    const [showSST, setShowSST] = useState(false);
    const [selectedStorm, setSelectedStorm] = useState(null);
    const [globeFailed, setGlobeFailed] = useState(false);

    // ── Compute arcs & points data based on currentYear ──
    const { arcsData, pointsData } = useMemo(() => {
        if (!tracksData || !summaryData) return { arcsData: [], pointsData: [] };

        const arcs = [];
        const points = [];
        const summaryMap = {};
        (Array.isArray(summaryData) ? summaryData : []).forEach(s => { summaryMap[s.SID] = s; });

        Object.entries(tracksData).forEach(([sid, trackPoints]) => {
            if (!trackPoints || trackPoints.length < 2) return;
            const storm = summaryMap[sid];
            if (!storm) return;
            const stormYear = Math.floor(storm.season);
            const cat = categorizeCyclone(storm.max_wind_kmh);
            const isCurrent = stormYear === currentYear;

            // When playing, limit to ±5 years for performance
            if (isPlaying && Math.abs(stormYear - currentYear) > 5) return;

            const first = trackPoints[0];
            const last = trackPoints[trackPoints.length - 1];
            const mid = trackPoints[Math.floor(trackPoints.length / 2)];

            arcs.push({
                startLat: parseFloat(first.LAT),
                startLng: parseFloat(first.LON),
                endLat: parseFloat(last.LAT),
                endLng: parseFloat(last.LON),
                midLat: parseFloat(mid.LAT),
                midLng: parseFloat(mid.LON),
                color: cat.color,
                stroke: isCurrent ? 1.5 : 0.5,
                opacity: isCurrent ? 1.0 : 0.1,
                name: storm.name,
                season: stormYear,
                sid: sid,
                cat: cat,
                maxWind: Math.round(storm.max_wind_kmh),
                minPressure: storm.min_pressure_mb,
                trackCount: trackPoints.length
            });

            // Genesis point (first coordinate)
            const pointRadius = cat.category >= 5 ? 0.8 : cat.category >= 3 ? 0.5 : 0.3;
            points.push({
                lat: parseFloat(first.LAT),
                lng: parseFloat(first.LON),
                color: cat.color,
                radius: pointRadius,
                name: storm.name,
                season: stormYear,
                sid: sid,
                cat: cat,
                opacity: isCurrent ? 1.0 : 0.1
            });
        });

        return { arcsData: arcs, pointsData: points };
    }, [currentYear, isPlaying, tracksData, summaryData]);

    // ── SST hex data ──
    const hexData = useMemo(() => {
        if (!showSST) return [];
        const data = [];
        for (let lat = -10; lat <= 30; lat += 10) {
            for (let lng = 60; lng <= 100; lng += 10) {
                const simSST = 25 + Math.random() * 7;
                let color = '#3b82f6';
                if (simSST >= 30) color = '#dc2626';
                else if (simSST >= 28) color = '#f97316';
                else if (simSST >= 26) color = '#facc15';
                data.push({ lat, lng, color, sst: simSST.toFixed(1) });
            }
        }
        return data;
    }, [showSST]);

    // ── Globe initialization ──
    useEffect(() => {
        if (!globeContainerRef.current || globeFailed) return;

        try {
            const container = globeContainerRef.current;
            const width = container.clientWidth;
            const height = container.clientHeight || 500;

            const globe = Globe()
                .width(width)
                .height(height)
                .backgroundColor('#0a1628')
                .globeImageUrl('https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg')
                .bumpImageUrl('https://unpkg.com/three-globe/example/img/earth-topology.png')
                .backgroundImageUrl('https://unpkg.com/three-globe/example/img/night-sky.png')
                .atmosphereColor('#00d4ff')
                .atmosphereAltitude(0.15)
                .showAtmosphere(true)
                // Arcs
                .arcsData([])
                .arcColor(d => d.color)
                .arcStroke(d => d.stroke)
                .arcDashLength(0.4)
                .arcDashGap(0.2)
                .arcDashAnimateTime(2000)
                .arcLabel(d => `<div style="background:#1e293b;padding:6px 10px;border-radius:8px;border:1px solid #334155;color:#fff;font-size:12px">
                    <b>${d.name !== 'UNNAMED' ? d.name : 'Unknown'}</b><br/>
                    ${d.season} — ${d.cat.label}
                </div>`)
                .onArcClick(d => setSelectedStorm(d))
                .onArcHover(d => { container.style.cursor = d ? 'pointer' : 'default'; })
                // Points
                .pointsData([])
                .pointColor(d => d.color)
                .pointRadius(d => d.radius)
                .pointAltitude(0.01)
                .pointLabel(d => `<div style="background:#1e293b;padding:6px 10px;border-radius:8px;border:1px solid #334155;color:#fff;font-size:12px">
                    <b>${d.name !== 'UNNAMED' ? d.name : 'Storm'}</b> — ${d.season}<br/>
                    ${d.cat.label}
                </div>`)
                .onPointClick(d => {
                    const arc = arcsData.find(a => a.sid === d.sid);
                    if (arc) setSelectedStorm(arc);
                })
                // Rings (monitoring zone)
                .ringsData([{ lat: 15, lng: 80 }])
                .ringColor(() => 'rgba(0,212,255,0.3)')
                .ringMaxRadius(5)
                .ringPropagationSpeed(2)
                .ringRepeatPeriod(1000)
                // HTML Elements for Buoys
                .htmlElementsData([])
                .htmlElement(d => {
                    const el = document.createElement('div');
                    const bColor = d.id === 'rama-23003' ? '#22d3ee' : d.id === 'north-indian' ? '#f97316' : '#a78bfa';
                    el.innerHTML = `
                        <div style="position: relative; width: 14px; height: 14px; cursor: pointer; z-index: 10;">
                            <div style="position: absolute; width: 100%; height: 100%; border-radius: 50%; background: ${bColor}; opacity: 0.6; animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
                            <div style="position: absolute; top: 3px; left: 3px; width: 8px; height: 8px; border-radius: 50%; background: ${bColor};"></div>
                            <div class="tooltip" style="display: none; position: absolute; bottom: 20px; left: 50%; transform: translateX(-50%); background: rgba(15,23,42,0.95); padding: 8px 12px; border-radius: 8px; border: 1px solid #334155; color: #fff; font-size: 11px; white-space: nowrap; box-shadow: 0 4px 12px rgba(0,0,0,0.5);">
                                <b style="color:${bColor}; font-size: 12px; margin-bottom: 2px; display: block;">${d.name}</b>
                                SST: <span style="color:#00e5ff">${d.sst?.toFixed(1) || '—'}°C</span> &nbsp;|&nbsp; Pres: <span style="color:#00e5ff">${d.pressure || '—'} mb</span>
                            </div>
                        </div>
                    `;
                    el.onmouseenter = () => { el.querySelector('.tooltip').style.display = 'block'; };
                    el.onmouseleave = () => { el.querySelector('.tooltip').style.display = 'none'; };
                    return el;
                })
                // Hex polygons (SST)
                .hexPolygonsData([])
                .hexPolygonResolution(3)
                .hexPolygonMargin(0.3)
                .hexPolygonColor(d => d.color)
                .hexPolygonAltitude(0.005)
                (container);

            // Auto rotate
            globe.controls().autoRotate = true;
            globe.controls().autoRotateSpeed = 0.3;
            container.addEventListener('mouseenter', () => { globe.controls().autoRotate = false; });
            container.addEventListener('mouseleave', () => { globe.controls().autoRotate = true; });

            // Initial camera
            globe.pointOfView({ lat: 12, lng: 80, altitude: 2.5 }, 1000);

            globeRef.current = globe;

            // Resize handler
            const onResize = () => {
                if (globeRef.current && container) {
                    globeRef.current.width(container.clientWidth);
                    globeRef.current.height(container.clientHeight || 500);
                }
            };
            window.addEventListener('resize', onResize);

            return () => {
                window.removeEventListener('resize', onResize);
                if (globeRef.current) {
                    globeRef.current._destructor && globeRef.current._destructor();
                }
                // Clean up DOM children
                while (container.firstChild) container.removeChild(container.firstChild);
                globeRef.current = null;
            };
        } catch (err) {
            console.error('Globe initialization failed:', err);
            setGlobeFailed(true);
        }
    }, [globeFailed]);

    // ── Update globe data on changes ──
    useEffect(() => {
        if (!globeRef.current) return;
        globeRef.current
            .arcsData(arcsData)
            .pointsData(pointsData)
            .htmlElementsData(buoysData);
    }, [arcsData, pointsData, buoysData]);

    // ── Update SST hex layer ──
    useEffect(() => {
        if (!globeRef.current) return;
        globeRef.current.hexPolygonsData(hexData);
    }, [hexData]);

    // ── Camera button handlers ──
    const flyToReset = useCallback(() => {
        globeRef.current?.pointOfView({ lat: 12, lng: 80, altitude: 2.5 }, 1000);
    }, []);
    const flyToBayOfBengal = useCallback(() => {
        globeRef.current?.pointOfView({ lat: 15, lng: 88, altitude: 1.8 }, 1000);
    }, []);
    const flyToArabianSea = useCallback(() => {
        globeRef.current?.pointOfView({ lat: 15, lng: 65, altitude: 1.8 }, 1000);
    }, []);
    const flyToStorm = useCallback((lat, lng) => {
        globeRef.current?.pointOfView({ lat, lng, altitude: 1.5 }, 1000);
    }, []);

    // ── WebGL Fallback ──
    if (globeFailed) {
        return (
            <div className="relative bg-slate-900 rounded-xl border border-slate-700 overflow-hidden" style={{ height: '500px' }}>
                <div className="flex items-center justify-center h-full text-slate-400">
                    <div className="text-center">
                        <div className="text-3xl mb-2">🌍</div>
                        <p>3D Globe unavailable — WebGL not supported</p>
                        <p className="text-xs mt-1 text-slate-500">Use 2D Map mode instead</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="relative rounded-xl border border-slate-700 overflow-hidden" style={{ height: '500px', background: '#0a1628' }}>
            {/* Camera Controls */}
            <div className="absolute top-3 left-3 z-10 flex gap-1.5 flex-wrap" style={{ maxWidth: '220px' }}>
                <button onClick={flyToReset} className="bg-slate-900/80 hover:bg-slate-800 text-white text-xs px-2.5 py-1.5 rounded-lg border border-slate-600 transition-colors">
                    🌐 Reset
                </button>
                <button onClick={flyToBayOfBengal} className="bg-slate-900/80 hover:bg-slate-800 text-white text-xs px-2.5 py-1.5 rounded-lg border border-slate-600 transition-colors">
                    Bay of Bengal
                </button>
                <button onClick={flyToArabianSea} className="bg-slate-900/80 hover:bg-slate-800 text-white text-xs px-2.5 py-1.5 rounded-lg border border-slate-600 transition-colors">
                    Arabian Sea
                </button>
                <button onClick={() => setShowSST(!showSST)} className={`text-xs px-2.5 py-1.5 rounded-lg border transition-colors ${showSST ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40' : 'bg-slate-900/80 text-white border-slate-600 hover:bg-slate-800'}`}>
                    SST Layer
                </button>
            </div>

            {/* Active Threat Marker */}
            {riskScore > 60 && (
                <div className="absolute top-3 right-3 z-10">
                    <div className="bg-red-500/20 border border-red-500/40 rounded-lg px-3 py-1.5 animate-pulse">
                        <span className="text-red-400 text-xs font-bold">⚠ ACTIVE THREAT</span>
                    </div>
                </div>
            )}

            {/* Globe container */}
            <div ref={globeContainerRef} style={{ width: '100%', height: '100%' }} />

            {/* Legend */}
            <div className="absolute bottom-4 left-4 z-10 bg-slate-900/80 rounded-lg p-3 border border-slate-700">
                <div className="text-white text-xs font-bold mb-2 uppercase tracking-wider">Cyclone Intensity</div>
                {[
                    { label: 'Tropical Storm', color: '#3b82f6' },
                    { label: 'Category 1', color: '#facc15' },
                    { label: 'Category 2', color: '#f97316' },
                    { label: 'Category 3', color: '#ea580c' },
                    { label: 'Category 4', color: '#dc2626' },
                    { label: 'Category 5', color: '#7f1d1d' },
                ].map(item => (
                    <div key={item.label} className="flex items-center gap-2 mt-1">
                        <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: item.color }} />
                        <span className="text-slate-300 text-xs">{item.label}</span>
                    </div>
                ))}
            </div>

            {/* Storm Info Side Panel */}
            <div
                className="absolute top-0 right-0 h-full bg-slate-900 border-l border-cyan-400/30 p-4 z-20 transition-transform duration-300"
                style={{
                    width: '220px',
                    transform: selectedStorm ? 'translateX(0)' : 'translateX(100%)',
                }}
            >
                {selectedStorm && (
                    <>
                        <button onClick={() => setSelectedStorm(null)} className="absolute top-2 right-2 text-slate-400 hover:text-white text-lg">✕</button>
                        <div className="mt-6">
                            <div className="text-white text-lg font-bold">{selectedStorm.name !== 'UNNAMED' ? selectedStorm.name : 'Unknown Storm'}</div>
                            <div className="text-slate-400 text-sm mt-1">Season {selectedStorm.season}</div>
                            <div className="mt-3 inline-block px-3 py-1 rounded-full text-xs font-semibold border" style={{ color: selectedStorm.cat.color, borderColor: selectedStorm.cat.color }}>
                                {selectedStorm.cat.label}
                            </div>
                            <div className="mt-4 space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-slate-400">Max Wind</span>
                                    <span className="text-white font-semibold">{selectedStorm.maxWind} km/h</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-400">Min Pressure</span>
                                    <span className="text-white font-semibold">{selectedStorm.minPressure} mb</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-400">Track Points</span>
                                    <span className="text-white font-semibold">{selectedStorm.trackCount}</span>
                                </div>
                            </div>
                            <button
                                onClick={() => flyToStorm(selectedStorm.midLat, selectedStorm.midLng)}
                                className="mt-4 w-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs py-2 rounded-lg hover:bg-cyan-500/20 transition-colors"
                            >
                                🎯 Focus on Storm
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
