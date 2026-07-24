import React, { useState } from 'react';
import { useCycloneData } from '../hooks/useCycloneData';
import LoadingSpinner from './LoadingSpinner';
import CycloneMap from './cyclones/CycloneMap';
import CycloneTrendGraph from './cyclones/CycloneTrendGraph';
import AdvancedGlobe from './cyclone/AdvancedGlobe';
import RiskBreakdownPanel from './cyclone/RiskBreakdownPanel';
import RapidIntensificationAlert from './cyclone/RapidIntensificationAlert';
import HistoricalAnalogPanel from './cyclone/HistoricalAnalogPanel';
import FisheriesImpactPanel from './cyclone/FisheriesImpactPanel';
import useCycloneTimeline from '../hooks/useCycloneTimeline';
import { computeRisk } from '../services/cycloneRiskEngine';


const BUOY_COLORS = {
    'rama-23003': 'var(--color-accent)', // cyan/teal
    'north-indian': 'var(--color-temp)', // warm orange
    'bay-of-bengal': 'var(--color-violet)' // violet
};

export default function CycloneIntelligence({ buoyData, buoys }) {
    const { data, loading, error, toggleSimulation, refetch } = useCycloneData();
    const [show2D, setShow2D] = useState(false);
    const { isPlaying, currentYear, speed, play, pause, reset, setSpeed, setCurrentYear } = useCycloneTimeline();

    // Yearly stats hook (must be before early returns)
    const yearlyStats = React.useMemo(() => {
        const tracks = data?.tracks;
        if (!tracks) return { total: 0, severe: 0, maxWindKnots: 0 };
        let total = 0, severe = 0, maxWindKnots = 0;
        Object.values(tracks).forEach(points => {
            if (!points || !points.length) return;
            const inYear = points.some(p => p.ISO_TIME.startsWith(currentYear.toString()));
            if (!inYear) return;
            total += 1;
            const stormMaxKmh = Math.max(...points.map(p => parseFloat(p.WIND_KMH) || 0));
            const stormMaxKnots = stormMaxKmh / 1.852;
            if (stormMaxKnots >= 96) severe += 1;
            if (stormMaxKnots > maxWindKnots) maxWindKnots = stormMaxKnots;
        });
        return { total, severe, maxWindKnots: Math.round(maxWindKnots) };
    }, [data?.tracks, currentYear]);

    if (loading || !buoyData) return <LoadingSpinner message="Loading Marine Hazard Intelligence..." />;
    if (error) return (
        <div className="card" style={{ padding: '2rem', textAlign: 'center', marginTop: '3rem' }}>
            <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>⚠️</div>
            <div style={{ color: 'var(--color-danger)', fontWeight: 700, marginBottom: '0.5rem' }}>Failed to load Cyclone Data</div>
            <div style={{ color: 'var(--color-accent)', fontSize: '0.9rem', marginBottom: '1rem' }}>{error}</div>
            <button onClick={refetch} style={{ background: 'rgba(45, 212, 191, 0.08)', border: '1px solid rgba(45, 212, 191, 0.2)', padding: '0.4rem 1.5rem', color: 'var(--color-accent)', borderRadius: '8px', cursor: 'pointer' }}>Retry</button>
        </div>
    );
    if (!data || !data.summary) return null;

    const { summary, risk, tracks, simulationEnabled, liveRisk, summaryRaw } = data;
    const lr = liveRisk || {};

    // Phase 3: Multi-Buoy Integration
    const buoyRisks = buoys.map(b => {
        const bd = buoyData[b.id] || {};
        const sst = bd.sst || 27;
        const wind = bd.wind ? bd.wind * 3.6 : 20; // m/s to km/h
        const pressure = bd.pressure || 1013;
        const waves = bd.wave ? bd.wave.toFixed(1) : 1.5;

        const simSST = simulationEnabled ? sst + 1 : sst;
        const riskData = computeRisk({ sst: simSST, windSpeed: wind, pressure });

        return {
            ...b,
            sst: simSST,
            wind,
            pressure,
            waves,
            riskScore: riskData.totalRisk,
            riskData
        };
    });

    const highestRiskBuoy = [...buoyRisks].sort((a, b) => b.riskScore - a.riskScore)[0] || buoyRisks[0];

    const getBuoyObj = (id) => buoyRisks.find(b => b.id === id) || { riskScore: 0 };
    const bobRisk = getBuoyObj('bay-of-bengal').riskScore;
    const indianRisk = getBuoyObj('rama-23003').riskScore;
    const arabianRisk = getBuoyObj('north-indian').riskScore;

    const compositeScore = Math.round(bobRisk * 0.45 + indianRisk * 0.35 + arabianRisk * 0.20);
    const riskData = highestRiskBuoy.riskData || computeRisk({ sst: highestRiskBuoy.sst, windSpeed: highestRiskBuoy.wind, pressure: highestRiskBuoy.pressure });

    // Alert level colors
    const cfiRisk = compositeScore;
    const alertColor = cfiRisk >= 70 ? 'var(--color-danger)' : cfiRisk >= 50 ? 'var(--color-amber)' : cfiRisk >= 30 ? 'var(--color-accent)' : 'var(--color-green)';
    const alertBg = cfiRisk >= 70 ? 'rgba(242, 102, 91, 0.12)' : cfiRisk >= 50 ? 'rgba(240, 169, 78, 0.1)' : 'rgba(45, 212, 191, 0.06)';

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', paddingBottom: '2rem' }}>

            {/* ═══════ HAZARD ALERT BANNER ═══════ */}
            <div className="card" style={{
                background: `linear-gradient(90deg, ${alertBg} 0%, rgba(2,13,24,0) 100%)`,
                borderLeft: `5px solid ${alertColor}`,
                padding: '1rem 1.5rem',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                flexWrap: 'wrap', gap: '0.75rem'
            }}>
                <div>
                    <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: alertColor, margin: 0, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                        {cfiRisk >= 70 ? '🚨 CYCLONE FORMATION LIKELY' : cfiRisk >= 50 ? '⚠️ STORM WARNING' : cfiRisk >= 30 ? '👁 WATCH ACTIVE' : '✅ STABLE CONDITIONS'}
                    </h2>
                    <p style={{ color: 'var(--color-abyss-400)', margin: '0.25rem 0 0', fontSize: '0.85rem' }}>
                        Risk Index: <strong style={{ color: '#fff' }}>{cfiRisk}</strong> | Formation Probability: <strong style={{ color: '#fff' }}>{lr.formation_probability || 0}%</strong>
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <button onClick={() => setShow2D(!show2D)} style={{
                        background: 'rgba(45, 212, 191, 0.08)', border: '1px solid rgba(45, 212, 191, 0.3)',
                        padding: '0.5rem 1rem', borderRadius: '8px', color: 'var(--color-accent)',
                        cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem'
                    }}>
                        {show2D ? '🌍 3D Globe' : '🗺️ 2D Map'}
                    </button>
                    <button onClick={toggleSimulation} style={{
                        background: simulationEnabled ? 'rgba(242, 102, 91, 0.08)' : 'rgba(45, 212, 191, 0.08)',
                        border: `1px solid ${simulationEnabled ? 'var(--color-danger)' : 'var(--color-accent)'}`,
                        padding: '0.5rem 1rem', borderRadius: '8px',
                        color: simulationEnabled ? 'var(--color-danger)' : 'var(--color-accent)',
                        cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem'
                    }}>
                        {simulationEnabled ? '🛑 Clear Sim' : '🔬 +1°C SST'}
                    </button>
                </div>
            </div>

            {/* ═══════ MAIN LAYOUT: Left Panel + Globe/Map + Right Panel ═══════ */}
            <div className="flex flex-col md:grid md:grid-cols-[minmax(340px,auto)_1fr_260px] gap-3 md:gap-4 md:min-h-[520px]">

                {/* ─── LEFT PANEL: Multi-Buoy Hazard Inputs ─── */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>

                    {/* 3-Column Panel */}
                    <div className="flex overflow-x-auto md:grid md:grid-cols-3 gap-2 pb-2 md:pb-0 snap-x">
                        {buoyRisks.map(b => {
                            const bColor = BUOY_COLORS[b.id] || 'var(--color-accent)';
                            const sstColor = b.sst > 28.5 ? 'var(--color-temp)' : b.sst < 27 ? 'var(--color-accent)' : 'var(--color-abyss-300)';
                            const windColor = b.wind > 50 ? 'var(--color-danger)' : b.wind >= 20 ? 'var(--color-amber)' : 'var(--color-green)';
                            const pColor = b.pressure < 1005 ? 'var(--color-danger)' : b.pressure <= 1010 ? 'var(--color-amber)' : 'var(--color-green)';

                            return (
                                <div key={b.id} className="min-w-[140px] md:min-w-0 snap-start card flex flex-col justify-between" style={{ borderTop: `3px solid ${bColor}` }}>
                                    <div className="mb-2">
                                        <div className="text-[11px] font-bold truncate" style={{ color: bColor }} title={b.name}>{b.name.replace('Ocean', '').replace('Indian', 'IO')}</div>
                                        <div className="text-[9px] text-[var(--color-abyss-400)] truncate">{b.region}</div>
                                    </div>
                                    <div className="space-y-[2px] text-[10px] mb-3">
                                        <div className="flex justify-between items-center"><span className="text-[var(--color-abyss-400)]">SST</span><span style={{ color: sstColor, fontWeight: 700 }}>{b.sst.toFixed(1)}°C</span></div>
                                        <div className="flex justify-between items-center"><span className="text-[var(--color-abyss-400)]">WND</span><span style={{ color: windColor, fontWeight: 700 }}>{b.wind.toFixed(0)} km/h</span></div>
                                        <div className="flex justify-between items-center"><span className="text-[var(--color-abyss-400)]">PRS</span><span style={{ color: pColor, fontWeight: 700 }}>{b.pressure.toFixed(0)} mb</span></div>
                                        <div className="flex justify-between items-center"><span className="text-[var(--color-abyss-400)]">WAV</span><span className="text-[var(--color-accent)] font-bold">{b.waves}m</span></div>
                                    </div>
                                    {/* Footer Risk Bar */}
                                    <div className="mt-auto">
                                        <div className="h-1 w-full bg-[var(--color-abyss-800)] rounded overflow-hidden mb-1">
                                            <div className="h-full rounded" style={{ width: `${b.riskScore}%`, background: bColor }} />
                                        </div>
                                        <div className="text-[9px] font-bold text-[var(--color-abyss-400)] text-right">{b.riskScore}% Risk</div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Regional Risk Assessment Composite Row */}
                    <div className="card">
                        <div className="text-[10px] text-[var(--color-abyss-400)] uppercase tracking-widest font-bold mb-2">Regional Risk Assessment</div>
                        <div className="flex gap-2">
                            <ZoneBadge label="Arabian Sea" score={arabianRisk} color="var(--color-temp)" isActive={arabianRisk >= Math.max(bobRisk, indianRisk)} />
                            <ZoneBadge label="Indian Ocean" score={indianRisk} color="var(--color-accent)" isActive={indianRisk >= Math.max(bobRisk, arabianRisk)} />
                            <ZoneBadge label="Bay of Bengal" score={bobRisk} color="var(--color-violet)" isActive={bobRisk >= Math.max(indianRisk, arabianRisk)} />
                        </div>
                    </div>

                    {/* Cyclone Risk Gauge */}
                    <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, justifyContent: 'center' }}>
                        <div style={{ color: 'var(--color-accent)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.5rem' }}>
                            Composite Risk Gauge
                        </div>
                        <RiskGauge value={compositeScore} />

                        {/* 3 Mini bars below gauge */}
                        <div className="w-full mt-4 space-y-2 px-2">
                            <MiniRiskBar label="BoB Risk" value={bobRisk} color={BUOY_COLORS['bay-of-bengal']} />
                            <MiniRiskBar label="Indian Ocean" value={indianRisk} color={BUOY_COLORS['rama-23003']} />
                            <MiniRiskBar label="Arabian Sea" value={arabianRisk} color={BUOY_COLORS['north-indian']} />
                        </div>
                    </div>
                </div>

                {/* ─── CENTER: 3D Globe or 2D Map ─── */}
                <div className="card flex flex-col min-h-[300px] md:min-h-0">
                    {show2D ? (
                        <CycloneMap tracksData={tracks} selectedYear={currentYear} />
                    ) : (
                        <AdvancedGlobe
                            currentYear={currentYear}
                            riskScore={riskData.totalRisk}
                            isPlaying={isPlaying}
                            setSpeed={setSpeed}
                            tracksData={tracks}
                            summaryData={summaryRaw}
                            buoysData={buoyRisks}
                        />
                    )}
                    {/* Timeline slider + play controls */}
                    <div className="flex flex-wrap md:flex-nowrap items-center gap-2 mt-3 p-1">
                        <button onClick={isPlaying ? pause : play} style={{
                            background: 'rgba(45, 212, 191, 0.08)', border: '1px solid rgba(45, 212, 191, 0.3)',
                            padding: '0.5rem 0.7rem', borderRadius: '6px', color: 'var(--color-accent)',
                            cursor: 'pointer', fontWeight: 700, fontSize: '0.8rem', minWidth: '60px'
                        }}>
                            {isPlaying ? '⏸ Pause' : '▶ Play'}
                        </button>
                        <button onClick={reset} style={{
                            background: 'var(--color-abyss-950)', border: '1px solid var(--color-abyss-800)',
                            padding: '0.5rem 0.5rem', borderRadius: '6px', color: 'var(--color-abyss-300)',
                            cursor: 'pointer', fontSize: '0.8rem'
                        }}>
                            ↺ Reset
                        </button>
                        <input type="range" min="2001" max="2025" step="1" value={currentYear}
                            onChange={(e) => setCurrentYear(Number(e.target.value))}
                            style={{ flex: 1, accentColor: 'var(--color-accent)', cursor: 'pointer' }}
                        />
                        <span style={{ color: '#fff', fontWeight: 800, fontSize: '1.1rem', minWidth: '3rem' }}>{currentYear}</span>
                        <select value={speed} onChange={(e) => setSpeed(Number(e.target.value))} style={{
                            background: 'var(--color-abyss-950)', border: '1px solid var(--color-abyss-800)', color: '#fff',
                            padding: '0.5rem 0.5rem', borderRadius: '6px', fontSize: '0.8rem', cursor: 'pointer', minWidth: '60px'
                        }}>
                            <option value={0.5}>0.5×</option>
                            <option value={1}>1×</option>
                            <option value={2}>2×</option>
                            <option value={4}>4×</option>
                        </select>
                    </div>
                </div>

                {/* ─── RIGHT PANEL: Impact + Historical ─── */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>

                    <div className="relative">
                        <HistoricalAnalogPanel
                            currentSST={highestRiskBuoy.sst}
                            currentPressure={highestRiskBuoy.pressure}
                            currentWind={highestRiskBuoy.wind}
                            summaryData={summaryRaw}
                        />
                        <div className="absolute top-2 right-4 text-[9px] text-[var(--color-abyss-400)] bg-[var(--color-abyss-950)] border border-[var(--color-abyss-800)] px-2 py-0.5 rounded shadow-sm">
                            Driven by <span style={{ color: BUOY_COLORS[highestRiskBuoy.id] || 'var(--color-accent)' }}>{highestRiskBuoy.name}</span>
                        </div>
                    </div>

                    {/* Year Stats */}
                    <div className="card">
                        <div style={{ color: 'var(--color-accent)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.5rem' }}>
                            {currentYear} Activity
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem' }}>
                            <StatMini label="Storms" value={yearlyStats.total} />
                            <StatMini label="Severe" value={yearlyStats.severe} color="var(--color-danger)" />
                            <StatMini label="Max kt" value={yearlyStats.maxWindKnots} color="var(--color-amber)" />
                        </div>
                    </div>
                </div>
            </div>

            {/* ═══════ BOTTOM: Trend Graph + Decadal Risk ═══════ */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <CycloneTrendGraph tracksData={tracks} />

                <div className="card flex flex-col">
                    <h3 style={{ color: 'var(--color-accent)', marginBottom: '1rem', fontSize: '1rem', fontWeight: 600 }}>Decadal Risk Drivers</h3>
                    <RiskDriverBlock label="10-Year Storm Growth" value="+24%" desc="↑ Activity Increasing" color="var(--color-amber)" />
                    <RiskDriverBlock label="Intensity Escalation (Cat 4/5)" value={simulationEnabled ? '+53%' : '+41%'}
                        desc={simulationEnabled ? '↑ Extreme Risk (Simulated)' : '↑ High Risk'} color="var(--color-danger)" />
                    <div style={{ borderTop: '1px dashed var(--color-abyss-800)', paddingTop: '1rem', marginTop: 'auto' }}>
                        <div style={{ fontSize: '0.8rem', color: 'var(--color-abyss-400)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Peak Landfall Corridor</div>
                        <div style={{ background: 'rgba(242, 102, 91, 0.08)', border: '1px solid rgba(242, 102, 91, 0.2)', padding: '0.6rem', borderRadius: '8px', color: 'var(--color-danger)', fontSize: '0.9rem', fontWeight: 600, textAlign: 'center' }}>
                            📍 Odisha - West Bengal Coast
                        </div>
                    </div>
                </div>
            </div>

            {/* ═══════ NEW SECTIONS: Risk Breakdown + Rapid Intensification ═══════ */}
            <div className="flex flex-col md:grid md:grid-cols-[1fr_2fr] gap-4">
                <RiskBreakdownPanel sst={highestRiskBuoy.sst} windSpeed={highestRiskBuoy.wind} pressure={highestRiskBuoy.pressure} />
                <RapidIntensificationAlert summaryData={summaryRaw} />
            </div>

            {/* ═══════ Fisheries Impact ═══════ */}
            <FisheriesImpactPanel totalRisk={riskData.totalRisk} />
        </div>
    );
}

/* ──────────────── Sub-components ──────────────── */

function ZoneBadge({ label, score, color, isActive }) {
    return (
        <div className={`flex-1 rounded-lg border p-1 text-center transition-all ${isActive ? 'animate-pulse bg-[var(--color-abyss-900)]' : 'bg-[var(--color-abyss-950)]'}`} style={{ borderColor: isActive ? color : 'var(--color-abyss-800)' }}>
            <div className="text-[10px] text-[var(--color-abyss-400)] truncate mb-[2px]">{label}</div>
            <div className="text-xs font-bold" style={{ color }}>{score}%</div>
        </div>
    );
}

function MiniRiskBar({ label, value, color }) {
    return (
        <div className="flex items-center gap-2">
            <span className="text-[10px] text-[var(--color-abyss-400)] w-16 text-right whitespace-nowrap">{label}</span>
            <div className="flex-1 h-1.5 bg-[var(--color-abyss-800)] rounded overflow-hidden">
                <div className="h-full rounded" style={{ width: `${value}%`, background: color }} />
            </div>
            <span className="text-[10px] w-6 font-bold" style={{ color }}>{value}</span>
        </div>
    );
}

function HazardMetric({ label, value, delta, color }) {
    return (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0', borderBottom: '1px solid var(--color-abyss-800)' }}>
            <span style={{ color: 'var(--color-abyss-400)', fontSize: '0.8rem' }}>{label}</span>
            <div style={{ textAlign: 'right' }}>
                <span style={{ color: '#fff', fontWeight: 700, fontSize: '0.95rem' }}>{value}</span>
                {delta && <span style={{ color, fontSize: '0.75rem', marginLeft: '0.4rem' }}>({delta})</span>}
            </div>
        </div>
    );
}

function RiskGauge({ value }) {
    const clampedValue = Math.max(0, Math.min(100, value));
    const angle = -90 + (clampedValue / 100) * 180;
    const color = clampedValue >= 70 ? 'var(--color-danger)' : clampedValue >= 50 ? 'var(--color-amber)' : clampedValue >= 30 ? 'var(--color-accent)' : 'var(--color-green)';
    return (
        <div style={{ position: 'relative', width: 140, height: 80, overflow: 'hidden' }}>
            <svg viewBox="0 0 140 80" style={{ width: '100%', height: '100%' }}>
                <defs>
                    <linearGradient id="gaugeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="var(--color-green)" />
                        <stop offset="40%" stopColor="var(--color-accent)" />
                        <stop offset="60%" stopColor="var(--color-amber)" />
                        <stop offset="100%" stopColor="var(--color-danger)" />
                    </linearGradient>
                </defs>
                <path d="M 15 75 A 55 55 0 0 1 125 75" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="8" strokeLinecap="round" />
                <path d="M 15 75 A 55 55 0 0 1 125 75" fill="none" stroke="url(#gaugeGrad)" strokeWidth="8" strokeLinecap="round"
                    strokeDasharray={`${(clampedValue / 100) * 173} 173`} />
                <line x1="70" y1="75" x2={70 + 45 * Math.cos((angle * Math.PI) / 180)} y2={75 + 45 * Math.sin((angle * Math.PI) / 180)}
                    stroke={color} strokeWidth="2.5" strokeLinecap="round" />
                <circle cx="70" cy="75" r="4" fill={color} />
                <text x="70" y="68" textAnchor="middle" fill="#fff" fontSize="18" fontWeight="800">{clampedValue}</text>
            </svg>
        </div>
    );
}

function GaugeLabel({ label, value, color }) {
    return (
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.25rem 0', fontSize: '0.78rem' }}>
            <span style={{ color: 'var(--color-abyss-400)' }}>{label}</span>
            <span style={{ color, fontWeight: 700 }}>{value}</span>
        </div>
    );
}

function StatMini({ label, value, color = '#fff' }) {
    return (
        <div style={{ textAlign: 'center' }}>
            <div style={{ color, fontWeight: 800, fontSize: '1.3rem', lineHeight: 1 }}>{value}</div>
            <div style={{ color: 'var(--color-abyss-400)', fontSize: '0.7rem', marginTop: '0.2rem' }}>{label}</div>
        </div>
    );
}

function RiskDriverBlock({ label, value, desc, color }) {
    return (
        <div style={{ marginBottom: '1rem', background: 'var(--color-abyss-950)', border: '1px solid var(--color-abyss-800)', padding: '0.75rem', borderRadius: '8px' }}>
            <div style={{ fontSize: '0.78rem', color: 'var(--color-abyss-400)', marginBottom: '0.35rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.5rem' }}>
                <span style={{ fontSize: '1.6rem', fontWeight: 800, color, lineHeight: 1 }}>{value}</span>
                <span style={{ fontSize: '0.8rem', color, marginBottom: '0.15rem' }}>{desc}</span>
            </div>
        </div>
    );
}

// Add global styles for ping animation (only needs to be injected once, safely tracked by global CSS ideally)
const style = document.createElement('style');
style.innerHTML = `
@keyframes ping {
  75%, 100% {
    transform: scale(2);
    opacity: 0;
  }
}
`;
document.head.appendChild(style);
