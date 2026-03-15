import React, { useMemo, useState, useEffect, useCallback } from 'react';
import Sidebar from './components/Sidebar';
import OceanChart from './components/OceanChart';
import LoadingSpinner from './components/LoadingSpinner';
import HistoricalChart, { HIST_PARAMS } from './components/HistoricalChart';
import OceanAnalyticsSummary, { HIST_ANALYTICS_PARAMS } from './components/OceanAnalyticsSummary';
import FisheriesIntelligence from './components/FisheriesIntelligence';
import CycloneIntelligence from './components/CycloneIntelligence';
import MultiBuoyDashboard from './components/MultiBuoyDashboard';
import useMultiBuoyData from './hooks/useMultiBuoyData';
import { useHistoricalBuoyData } from './hooks/useHistoricalBuoyData';
import { LOCATIONS, PARAMETERS } from './data/constants';
import { computeStats } from './utils/anomaly';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const YEARS = Array.from({ length: 2023 - 2012 + 1 }, (_, i) => 2023 - i);
const MONTHS = ['All', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const TIME_WINDOWS = ['6H', '12H', '24H', '48H', '5D'];
const MAX_RENDER_ROWS = 5000;

// ─── Moving Average Toggle ────────────────────────────────────────────────────
function MAToggle({ enabled, onToggle }) {
    return (
        <label htmlFor="ma-toggle" style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            cursor: 'pointer', userSelect: 'none',
            background: 'rgba(36,144,204,0.08)', border: '1px solid rgba(36,144,204,0.2)',
            borderRadius: 99, padding: '0.3rem 0.75rem', fontSize: '0.72rem', color: '#4db8e8',
        }}>
            <span style={{ position: 'relative', display: 'inline-block', width: 30, height: 16, flexShrink: 0 }}>
                <input id="ma-toggle" type="checkbox" checked={enabled} onChange={onToggle}
                    style={{ opacity: 0, width: 0, height: 0, position: 'absolute' }} />
                <span style={{
                    position: 'absolute', inset: 0, borderRadius: 99,
                    background: enabled ? 'rgba(0,212,255,0.55)' : 'rgba(36,144,204,0.2)', transition: 'background 0.2s'
                }} />
                <span style={{
                    position: 'absolute', top: 2, left: enabled ? 16 : 2,
                    width: 12, height: 12, borderRadius: '50%',
                    background: enabled ? '#00d4ff' : '#4db8e8', transition: 'left 0.2s, background 0.2s'
                }} />
            </span>
            Show 24h Trend Line
        </label>
    );
}

// ─── Global 3-Buoy Status Strip (Phase 6) ────────────────────────────────────────────────
function GlobalBuoyStrip({ buoyData, buoys, activeId, onSelect, lastUpdated }) {
    const elapsedMs = lastUpdated ? Date.now() - lastUpdated.getTime() : Infinity;
    const dotColor = elapsedMs > 15 * 60 * 1000 ? '#ef4444' : elapsedMs > 5 * 60 * 1000 ? '#f59e0b' : '#4ade80';

    return (
        <div style={{ display: 'flex', gap: '1rem', fontSize: '0.75rem', marginTop: '0.4rem', flexWrap: 'wrap' }}>
            {buoys.map(b => {
                const bData = buoyData[b.id] || {};
                const sst = bData.sst != null ? `${bData.sst.toFixed(1)}°C` : '—°C';
                // Note: user said km/h but wind data is m/s. We will use * 3.6 for km/h.
                const wind = bData.wind != null ? `${(bData.wind * 3.6).toFixed(0)}km/h` : '—km/h';
                const isActive = b.id === activeId;

                return (
                    <div
                        key={b.id}
                        onClick={() => onSelect(b.id)}
                        className={`flex items-center gap-2 cursor-pointer transition-colors ${isActive ? 'text-cyan-400 font-bold' : 'text-slate-400 hover:text-cyan-400'}`}
                    >
                        <span style={{ color: dotColor, fontSize: '10px' }}>●</span>
                        <span>{b.name}</span>
                        <span style={{ opacity: 0.8, fontSize: '0.65rem' }}>SST: {sst} Wind: {wind}</span>
                    </div>
                );
            })}
        </div>
    );
}

// ─── Sparkline SVG ────────────────────────────────────────────────────────────
function Sparkline({ values, color }) {
    if (!values || values.length < 2) return null;
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;
    const points = values.map((v, i) => {
        const x = (i / (values.length - 1)) * 70;
        const y = 45 - ((v - min) / range) * 40;
        return `${x},${y}`;
    }).join(' ');

    return (
        <svg width="70" height="45" style={{ position: 'absolute', bottom: 4, right: 8, opacity: 0.2 }}>
            <polyline points={points} fill="none" stroke={color} strokeWidth="1.5" />
        </svg>
    );
}

// ─── Enhanced Summary Card (Change 2) ─────────────────────────────────────────
function EnhancedSummaryCard({ label, value, unit, color, borderColor, delta, stats, sparklineValues, formatValue }) {
    const formattedValue = value != null ? formatValue(value) : '—';
    return (
        <div className="bg-slate-900 border border-slate-700 rounded-xl p-5 md:p-4" style={{ borderLeft: `4px solid ${borderColor}`, position: 'relative', overflow: 'hidden' }}>
            <div className="text-[10px] md:text-xs text-slate-400 uppercase tracking-wider mb-1 font-bold">{label}</div>
            <div className="text-4xl md:text-3xl font-black md:font-bold leading-tight" style={{ color }}>
                {formattedValue}
                <span className="text-sm md:text-base font-medium ml-1" style={{ opacity: 0.8 }}>{unit}</span>
            </div>
            {/* Trend badge */}
            <span className={`text-[10px] md:text-xs px-2.5 py-1 rounded-md font-bold inline-block mt-2 mb-3 ${delta.bg} ${delta.textColor}`}>
                {delta.text}
            </span>
            {/* Stats row */}
            {stats && (
                <div className="flex gap-4 border-t border-slate-700/50 pt-3 mt-1">
                    <div>
                        <div className="text-[10px] text-slate-500 font-bold">Min</div>
                        <div className="text-xs font-bold text-slate-300">{stats.min != null ? formatValue(stats.min) : '—'}</div>
                    </div>
                    <div>
                        <div className="text-[10px] text-slate-500 font-bold">Mean</div>
                        <div className="text-xs font-bold text-slate-300">{stats.mean != null ? formatValue(stats.mean) : '—'}</div>
                    </div>
                    <div>
                        <div className="text-[10px] text-slate-500 font-bold">Max</div>
                        <div className="text-xs font-bold text-slate-300">{stats.max != null ? formatValue(stats.max) : '—'}</div>
                    </div>
                </div>
            )}
            <Sparkline values={sparklineValues} color={color} />
        </div>
    );
}

// ─── Historical Anomaly Summary Card ──────────────────────────────────────────
function AnomalySummaryCard({ count, modCount, extremeCount, label, color, icon, widthVar }) {
    return (
        <div className="acard-hover" style={{
            flex: '1 1 140px', background: 'rgba(6,13,28,.97)', border: '1px solid rgba(51,65,85,.5)',
            borderRadius: '13px', padding: '18px 20px', position: 'relative', overflow: 'hidden'
        }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, ${color}, transparent)` }} />
            <div style={{ position: 'absolute', top: -28, right: -28, width: 80, height: 80, borderRadius: '50%', background: color, opacity: 0.08 }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <span style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.14em', color: '#e2f4ff', opacity: 0.6, fontWeight: 800 }}>{label}</span>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>{icon}</div>
            </div>
            <div style={{ fontSize: 42, fontVariationSettings: '"wght" 900', fontWeight: 900, letterSpacing: '-0.04em', lineHeight: 1, color }}>{count}</div>
            <div style={{ fontSize: 10, color: '#e2f4ff', opacity: 0.4, margin: '6px 0 14px 0', fontWeight: 600 }}>anomalies detected</div>
            <div style={{ height: 3, background: 'rgba(255,255,255,.08)', borderRadius: 99, marginBottom: 14 }}>
                <div className="acard-fill" style={{ '--w': widthVar, height: '100%', background: `linear-gradient(90deg, transparent, ${color})` }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                <div style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.4)', borderRadius: 6, padding: '3px 6px', fontSize: 9, color: '#ef4444', fontWeight: 800 }}>{extremeCount} extreme</div>
                <div style={{ fontSize: 10, color: '#e2f4ff', opacity: 0.4, fontWeight: 700 }}>{modCount} mod</div>
            </div>
        </div>
    );
}

// ─── Formatters per parameter ──────────────────────────────────────────────────
const FMT = {
    sea_surface_temp: v => Number(v).toFixed(2),
    wind_speed: v => Number(v).toFixed(1),
    air_pressure: v => Number(v).toFixed(0),
    wave_height: v => Number(v).toFixed(2),
};

export default function App() {
    const [locationId, setLocationId] = useState(LOCATIONS[0].id);
    const [activeParams, setActiveParams] = useState(['sea_surface_temp', 'wind_speed', 'air_pressure']);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const toggleSidebar = useCallback(() => setIsSidebarOpen(v => !v), []);
    const closeSidebar = useCallback(() => setIsSidebarOpen(false), []);
    const [viewMode, setViewMode] = useState('live');
    const [selectedYear, setSelectedYear] = useState(2023);
    const [selectedMonth, setSelectedMonth] = useState(0);
    const [compareYear, setCompareYear] = useState(null);
    const [showCompareDropdown, setShowCompareDropdown] = useState(false);
    const [showMA, setShowMA] = useState(false);
    const toggleMA = useCallback(() => setShowMA(v => !v), []);
    const [showExportDropdown, setShowExportDropdown] = useState(false);
    const [exportToast, setExportToast] = useState(null);
    useEffect(() => {
        if (exportToast) {
            const t = setTimeout(() => setExportToast(null), 2500);
            return () => clearTimeout(t);
        }
    }, [exportToast]);

    // Time window state (Change 3)
    const [timeWindow, setTimeWindow] = useState('5D');

    // Compare Mode (Live Forecast Multi-Buoy feature)
    const [compareMode, setCompareMode] = useState(false);

    const location = LOCATIONS.find(l => l.id === locationId) || LOCATIONS[0];
    const isHistorical = viewMode === 'historical';

    const { buoyData, loading, lastUpdated, BUOYS, getRegionalSummary, refetch, pauseRefresh, resumeRefresh } = useMultiBuoyData();

    const data = buoyData[locationId]?.history || [];
    const error = null;

    useEffect(() => {
        if (isHistorical) pauseRefresh?.(); else resumeRefresh?.();
    }, [isHistorical, pauseRefresh, resumeRefresh]);

    const { allData: histAllData, hasLoaded, loading: histLoading, error: histError, load: loadHistorical } =
        useHistoricalBuoyData();

    useEffect(() => {
        if (isHistorical && !hasLoaded && !histLoading) loadHistorical();
    }, [isHistorical, hasLoaded, histLoading, loadHistorical]);

    const stats = useMemo(() => OceanChart.computeStats(data, activeParams), [data, activeParams]);

    const filteredHistorical = useMemo(() => {
        let yearRows = histAllData.filter(r => r.year === selectedYear);
        if (selectedMonth > 0) yearRows = yearRows.filter(r => r.timestamp instanceof Date && r.timestamp.getMonth() === selectedMonth - 1);
        return yearRows.length > MAX_RENDER_ROWS ? yearRows.slice(yearRows.length - MAX_RENDER_ROWS) : yearRows;
    }, [histAllData, selectedYear, selectedMonth]);

    const compareData = useMemo(() => {
        if (!compareYear) return null;
        let rows = histAllData.filter(r => r.year === compareYear);
        if (selectedMonth > 0) rows = rows.filter(r => r.timestamp instanceof Date && r.timestamp.getMonth() === selectedMonth - 1);
        return rows.length > MAX_RENDER_ROWS ? rows.slice(rows.length - MAX_RENDER_ROWS) : rows;
    }, [histAllData, compareYear, selectedMonth]);

    const histStats = useMemo(() => {
        if (!filteredHistorical.length) return {};
        return Object.fromEntries(HIST_PARAMS.map(p => [p.key, computeStats(filteredHistorical, p.key)]));
    }, [filteredHistorical]);

    const aiInsight = useMemo(() => {
        if (!filteredHistorical.length) return null;
        let maxTemp = -Infinity, maxTempDate = '', maxWind = -Infinity, maxWindDate = '';
        filteredHistorical.forEach(row => {
            if (row.WTMP != null && !isNaN(row.WTMP) && row.WTMP > maxTemp) {
                maxTemp = row.WTMP;
                maxTempDate = row.timestamp instanceof Date ? row.timestamp.toLocaleDateString('en-GB', { month: 'short', day: 'numeric' }) : '';
            }
            if (row.WSPD != null && !isNaN(row.WSPD) && row.WSPD > maxWind) {
                maxWind = row.WSPD;
                maxWindDate = row.timestamp instanceof Date ? row.timestamp.toLocaleDateString('en-GB', { month: 'short', day: 'numeric' }) : '';
            }
        });
        if (maxTemp === -Infinity) return null;
        return { maxTemp: maxTemp.toFixed(1), maxTempDate, maxWind: maxWind.toFixed(1), maxWindDate };
    }, [filteredHistorical]);

    const toggleParam = useCallback(key => {
        setActiveParams(prev => prev.includes(key) ? (prev.length > 1 ? prev.filter(k => k !== key) : prev) : [...prev, key]);
    }, []);
    const handleLocationChange = useCallback(id => setLocationId(id), []);

    const handleExportPDF = useCallback(async () => {
        const element = document.getElementById('historical-content');
        if (!element) return;

        try {
            const canvas = await html2canvas(element, {
                backgroundColor: '#020d18',
                scale: 1.5,
                useCORS: true,
                logging: false,
            });

            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a4',
            });

            const pageWidth = pdf.internal.pageSize.getWidth();
            const pageHeight = pdf.internal.pageSize.getHeight();
            const imgWidth = pageWidth;
            const imgHeight = (canvas.height * imgWidth) / canvas.width;

            let heightLeft = imgHeight;
            let position = 0;

            // Add title
            pdf.setFontSize(16);
            pdf.setTextColor(0, 212, 255);
            pdf.text('Ocean Blue — Historical Data Report', 14, 15);
            pdf.setFontSize(10);
            pdf.setTextColor(150, 150, 150);
            pdf.text(`RAMA 23003 · Year: ${selectedYear} · Generated: ${new Date().toLocaleDateString()}`, 14, 22);

            position = 28;

            // Add screenshot — paginate if tall
            pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
            heightLeft -= (pageHeight - position);

            while (heightLeft > 0) {
                position = heightLeft - imgHeight;
                pdf.addPage();
                pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
                heightLeft -= pageHeight;
            }

            pdf.save(`ocean-blue-${selectedYear}-report.pdf`);
        } catch (err) {
            console.error('PDF export error:', err);
            alert('PDF export failed. Please try again.');
        }
    }, [selectedYear]);

    const handleExportCSV = useCallback(() => {
        setExportToast('CSV');
        if (!filteredHistorical.length) return;
        const keys = ['timestamp', ...HIST_PARAMS.map(p => p.key)];
        const csv = [keys.join(','), ...filteredHistorical.map(r => keys.map(k => k === 'timestamp' && r.timestamp instanceof Date ? r.timestamp.toISOString() : r[k] ?? '').join(','))].join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = `ocean-blue-${selectedYear}-data.csv`; a.click();
        URL.revokeObjectURL(url);
    }, [filteredHistorical, selectedYear]);

    const handleExportJSON = useCallback(() => {
        setExportToast('JSON');
        if (!filteredHistorical.length) return;
        const json = JSON.stringify(filteredHistorical.map(r => {
            const o = {}; if (r.timestamp instanceof Date) o.timestamp = r.timestamp.toISOString();
            HIST_PARAMS.forEach(p => { o[p.key] = r[p.key]; }); return o;
        }), null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = `ocean-blue-${selectedYear}-data.json`; a.click();
        URL.revokeObjectURL(url);
    }, [filteredHistorical, selectedYear]);

    const lastUpdatedStr = useMemo(
        () => lastUpdated ? lastUpdated.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : null,
        [lastUpdated]
    );

    // ── Live values + deltas ──────────────────────────────────────────────────
    const liveLast = data.length > 0 ? data[data.length - 1] : {};
    const liveSST = liveLast?.sea_surface_temp;
    const liveWind = liveLast?.wind_speed;
    const livePressure = liveLast?.air_pressure;
    const liveWaveHeight = liveLast?.wave_height;

    // ── Enhanced delta logic (Change 2) ───────────────────────────────────────
    const sstDelta = useMemo(() => {
        const s = stats?.sea_surface_temp;
        if (s?.mean != null && liveSST != null) {
            const diff = liveSST - s.mean;
            if (diff > 0.5) return { text: `▲ +${diff.toFixed(1)}°C from mean`, bg: 'bg-orange-950', textColor: 'text-orange-400' };
            if (diff < -0.5) return { text: `▼ ${diff.toFixed(1)}°C from mean`, bg: 'bg-blue-950', textColor: 'text-blue-400' };
            return { text: '● Within normal range', bg: 'bg-slate-800', textColor: 'text-slate-400' };
        }
        return { text: 'Live reading', bg: 'bg-slate-800', textColor: 'text-slate-400' };
    }, [stats, liveSST]);

    const windDelta = useMemo(() => {
        if (liveWind == null) return { text: '—', bg: 'bg-slate-800', textColor: 'text-slate-400' };
        if (liveWind < 3) return { text: '▼ Calm conditions', bg: 'bg-green-950', textColor: 'text-green-400' };
        if (liveWind <= 8) return { text: '● Moderate wind', bg: 'bg-slate-800', textColor: 'text-slate-400' };
        if (liveWind <= 15) return { text: '▲ Strong wind', bg: 'bg-amber-950', textColor: 'text-amber-400' };
        return { text: '▲▲ Very strong wind', bg: 'bg-red-950', textColor: 'text-red-400' };
    }, [liveWind]);

    const pressureDelta = useMemo(() => {
        if (livePressure == null) return { text: '—', bg: 'bg-slate-800', textColor: 'text-slate-400' };
        const diff = livePressure - 1013;
        if (diff > 2) return { text: `▲ +${diff.toFixed(1)} hPa high`, bg: 'bg-orange-950', textColor: 'text-orange-400' };
        if (diff < -2) return { text: `▼ ${Math.abs(diff).toFixed(1)} hPa low`, bg: 'bg-red-950', textColor: 'text-red-400' };
        return { text: '● Normal pressure', bg: 'bg-green-950', textColor: 'text-green-400' };
    }, [livePressure]);

    const waveDelta = useMemo(() => {
        if (liveWaveHeight == null) return { text: '—', bg: 'bg-slate-800', textColor: 'text-slate-400' };
        if (liveWaveHeight < 0.5) return { text: '● Calm swell', bg: 'bg-green-950', textColor: 'text-green-400' };
        if (liveWaveHeight <= 1.5) return { text: '● Moderate swell', bg: 'bg-slate-800', textColor: 'text-slate-400' };
        if (liveWaveHeight <= 2.5) return { text: '▲ Rough seas', bg: 'bg-amber-950', textColor: 'text-amber-400' };
        return { text: '▲▲ Very rough seas', bg: 'bg-red-950', textColor: 'text-red-400' };
    }, [liveWaveHeight]);

    // ── Sparkline data (last 10 points) ───────────────────────────────────────
    const sparklines = useMemo(() => {
        const last10 = data.slice(-10);
        return {
            sea_surface_temp: last10.map(d => d.sea_surface_temp).filter(v => v != null),
            wind_speed: last10.map(d => d.wind_speed).filter(v => v != null),
            air_pressure: last10.map(d => d.air_pressure).filter(v => v != null),
            wave_height: last10.map(d => d.wave_height).filter(v => v != null),
        };
    }, [data]);

    return (
        <div style={{
            display: 'flex', flexDirection: window.innerWidth <= 768 ? 'column' : 'row',
            height: '100vh', overflow: 'hidden', position: 'relative',
        }}>
            <Sidebar
                locationId={locationId} onLocationChange={handleLocationChange}
                activeParams={activeParams} onToggleParam={toggleParam}
                onRefresh={refetch} isOpen={isSidebarOpen} onClose={closeSidebar}
            />

            <main style={{
                flex: 1, overflowY: 'auto', padding: '2rem 2.5rem',
                background: 'linear-gradient(160deg, #020d18 0%, #04182e 60%, #071e2b 100%)',
            }}>
                {/* Header */}
                <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
                    <div className="flex items-start gap-3">
                        <button className="mobile-menu-btn" onClick={toggleSidebar}>☰</button>
                        <div>
                            <h1 style={{ fontSize: '1.6rem', fontWeight: 900, letterSpacing: '-0.02em', lineHeight: 1.2, backgroundImage: 'linear-gradient(to right, #22d3ee, #a855f7)', WebkitBackgroundClip: 'text', color: 'transparent' }}>
                                Ocean Data Explorer
                            </h1>
                            {isHistorical ? (
                                <div style={{ color: '#94a3b8', fontSize: '0.8rem', marginTop: '0.25rem' }}>
                                    {location.label} &nbsp;·&nbsp; Historical Data — {selectedYear}
                                </div>
                            ) : (
                                <GlobalBuoyStrip
                                    buoyData={buoyData}
                                    buoys={BUOYS}
                                    activeId={locationId}
                                    onSelect={handleLocationChange}
                                    lastUpdated={lastUpdated}
                                />
                            )}
                        </div>
                    </div>

                    <div className="flex items-center gap-3 flex-wrap">
                        <div className="view-toggle">
                            {['live', 'historical', 'fisheries', 'cyclones'].map(m => (
                                <button key={m} className={viewMode === m ? 'active' : ''} onClick={() => setViewMode(m)}>
                                    {m === 'live' ? '📡 Live Forecast' : m === 'historical' ? '📊 Historical Data' : m === 'fisheries' ? '🎣 Fisheries' : '🌪️ Cyclones'}
                                </button>
                            ))}
                        </div>

                        {!isHistorical && viewMode === 'live' && (
                            <>
                                {error && <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(255,77,109,0.1)', border: '1px solid rgba(255,77,109,0.3)', borderRadius: 99, padding: '0.25rem 0.7rem', fontSize: '0.7rem', color: '#ff4d6d' }}>⚠ {error}</div>}
                                {lastUpdatedStr && <div style={{ background: 'rgba(36,144,204,0.1)', border: '1px solid rgba(36,144,204,0.2)', borderRadius: 99, padding: '0.25rem 0.7rem', fontSize: '0.7rem', color: '#4db8e8' }}>↻ Updated {lastUpdatedStr}</div>}
                                {!loading && data.length > 0 && <div style={{ background: 'rgba(36,144,204,0.08)', border: '1px solid rgba(36,144,204,0.15)', borderRadius: 99, padding: '0.25rem 0.7rem', fontSize: '0.7rem', color: '#4db8e8' }}>{data.length} observations</div>}
                            </>
                        )}
                    </div>
                </div>

                {/* Toast overlay */}
                {exportToast && (
                    <div style={{ position: 'fixed', top: 20, right: 20, background: '#0f172a', border: '1px solid #10b981', color: '#10b981', padding: '12px 20px', borderRadius: 8, zIndex: 9999, fontSize: 13, fontWeight: 600, boxShadow: '0 4px 12px rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', gap: 8 }}>
                        ✓ {exportToast} download started!
                    </div>
                )}

                {/* ── Content ─────────────────────────────────────────────────── */}
                {viewMode === 'historical' ? (
                    histLoading ? <LoadingSpinner message="Loading historical buoy data…" /> :
                        histError ? (
                            <div className="glass-card flex flex-col items-center justify-center gap-4" style={{ height: 340, textAlign: 'center', padding: '2rem' }}>
                                <div style={{ fontSize: '2rem' }}>📂</div>
                                <div style={{ color: '#ff4d6d', fontWeight: 700 }}>Unable to load historical data</div>
                                <div style={{ color: '#4db8e8', fontSize: '0.8rem', maxWidth: 360 }}>{histError}. Make sure the backend server is running on port 5000.</div>
                            </div>
                        ) : (
                            <div className="flex flex-col gap-4" id="historical-content">
                                <div className="flex items-start justify-between mb-4 flex-wrap gap-4">
                                    <div style={{ flex: 1, minWidth: 260, overflow: 'hidden' }}>
                                        <div style={{ fontSize: 9, color: '#22d3ee', fontWeight: 700, letterSpacing: '0.13em', textTransform: 'uppercase', marginBottom: 4 }}>
                                            YEAR
                                        </div>
                                        <div className="flex year-scroll" style={{ gap: 8, paddingBottom: 6 }}>
                                            {YEARS.map(y => (
                                                <button key={y} onClick={() => { setSelectedYear(y); setSelectedMonth(0); setCompareYear(null); }}
                                                    style={{
                                                        flexShrink: 0,
                                                        padding: '8px 16px',
                                                        borderRadius: '10px',
                                                        fontSize: 13,
                                                        minHeight: 44,
                                                        cursor: 'pointer',
                                                        transition: 'all 0.15s',
                                                        ...(y === selectedYear ? { background: 'rgba(34,211,238,.15)', border: '1px solid rgba(34,211,238,.4)', color: '#22d3ee', fontWeight: 800 }
                                                            : { background: 'rgba(8,18,38,.85)', border: '1px solid rgba(51,65,85,.6)', color: '#64748b' })
                                                    }}
                                                    onMouseEnter={e => { if (y !== selectedYear) { e.currentTarget.style.borderColor = 'rgba(34,211,238,.18)'; e.currentTarget.style.color = '#94a3b8'; } }}
                                                    onMouseLeave={e => { if (y !== selectedYear) { e.currentTarget.style.borderColor = 'rgba(51,65,85,.55)'; e.currentTarget.style.color = '#475569'; } }}
                                                >
                                                    {y}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3 mt-2">
                                        <div style={{ position: 'relative' }}>
                                            <button onClick={() => setShowExportDropdown(!showExportDropdown)}
                                                style={{ padding: '3px 8px', fontSize: 8, borderRadius: 99, background: 'transparent', border: '1px solid #22d3ee', color: '#22d3ee', fontWeight: 700, cursor: 'pointer' }}>
                                                ↓ Export ▼
                                            </button>
                                            {showExportDropdown && (
                                                <>
                                                    <div style={{ position: 'fixed', inset: 0, zIndex: 10 }} onClick={() => setShowExportDropdown(false)} />
                                                    <div style={{ position: 'absolute', top: '100%', right: 0, zIndex: 20, background: '#0f172a', border: '1px solid #334155', borderRadius: 8, padding: 6, display: 'flex', flexDirection: 'column', gap: 4, marginTop: 4, minWidth: 220 }}>
                                                        <button onClick={() => { handleExportPDF(); setShowExportDropdown(false); }} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 8px', background: 'transparent', border: 'none', textAlign: 'left', cursor: 'pointer', width: '100%' }}>
                                                            <span style={{ background: '#ef4444', color: '#fff', fontSize: 8, padding: '2px 4px', borderRadius: 3, fontWeight: 700 }}>📄 PDF</span>
                                                            <div style={{ flex: 1, color: '#e2f4ff', fontSize: 10 }}>Export as PDF <span style={{ opacity: 0.5, fontSize: 8 }}>— Charts + summary</span></div>
                                                        </button>
                                                        <button onClick={() => { handleExportCSV(); setShowExportDropdown(false); }} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 8px', background: 'transparent', border: 'none', textAlign: 'left', cursor: 'pointer', width: '100%' }}>
                                                            <span style={{ background: '#10b981', color: '#fff', fontSize: 8, padding: '2px 4px', borderRadius: 3, fontWeight: 700 }}>📊 CSV</span>
                                                            <div style={{ flex: 1, color: '#e2f4ff', fontSize: 10 }}>Export as CSV <span style={{ opacity: 0.5, fontSize: 8 }}>— Raw data · {filteredHistorical.length} records</span></div>
                                                        </button>
                                                        <button onClick={() => { handleExportJSON(); setShowExportDropdown(false); }} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 8px', background: 'transparent', border: 'none', textAlign: 'left', cursor: 'pointer', width: '100%' }}>
                                                            <span style={{ background: '#f59e0b', color: '#fff', fontSize: 8, padding: '2px 4px', borderRadius: 3, fontWeight: 700 }}>🗂️ JSON</span>
                                                            <div style={{ flex: 1, color: '#e2f4ff', fontSize: 10 }}>Export as JSON <span style={{ opacity: 0.5, fontSize: 8 }}>— Structured data format</span></div>
                                                        </button>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                        <div style={{ width: 1, height: 14, background: 'rgba(51,65,85, 0.6)' }} />

                                        <div style={{ position: 'relative' }}>
                                            <button onClick={() => compareYear ? (setCompareYear(null), setShowCompareDropdown(false)) : setShowCompareDropdown(!showCompareDropdown)}
                                                style={{ padding: '3px 8px', fontSize: 8, borderRadius: 99, background: compareYear ? 'rgba(239,68,68,0.1)' : 'transparent', border: compareYear ? '1px solid rgba(239,68,68,0.3)' : '1px solid #a855f7', color: compareYear ? '#ef4444' : '#a855f7', fontWeight: 700, cursor: 'pointer' }}>
                                                {compareYear ? `✕ Clear (${compareYear})` : `📈 Compare`}
                                            </button>
                                            {showCompareDropdown && !compareYear && (
                                                <>
                                                    <div style={{ position: 'fixed', inset: 0, zIndex: 10 }} onClick={() => setShowCompareDropdown(false)} />
                                                    <div style={{ position: 'absolute', top: '100%', right: 0, zIndex: 20, background: '#0f172a', border: '1px solid #334155', borderRadius: 8, padding: 8, display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4, width: 220 }}>
                                                        {YEARS.filter(y => y !== selectedYear).map(y => (
                                                            <button key={y} onClick={() => { setCompareYear(y); setShowCompareDropdown(false); }}
                                                                style={{ background: '#1e293b', border: '1px solid #475569', borderRadius: 6, padding: '4px 8px', fontSize: 10, color: '#94a3b8', cursor: 'pointer' }}>{y}</button>
                                                        ))}
                                                    </div>
                                                </>
                                            )}
                                        </div>

                                        <div style={{ fontSize: 8, color: '#64748b', background: 'rgba(51,65,85,.2)', padding: '2px 6px', borderRadius: 4 }}>
                                            {filteredHistorical.length} records
                                        </div>
                                    </div>
                                </div>

                                <div style={{ marginBottom: 4 }}>
                                    <div style={{ fontSize: 9, color: '#22d3ee', fontWeight: 700, letterSpacing: '0.13em', textTransform: 'uppercase', marginBottom: 4 }}>
                                        MONTH
                                    </div>
                                    <div className="flex flex-wrap" style={{ gap: 6 }}>
                                        {MONTHS.map((m, i) => (
                                            <button key={m} onClick={() => setSelectedMonth(i)}
                                                style={{
                                                    padding: '8px 16px',
                                                    borderRadius: 99,
                                                    fontSize: 12,
                                                    minHeight: 44,
                                                    cursor: 'pointer',
                                                    transition: 'all 0.15s',
                                                    ...(i === selectedMonth ? { background: 'rgba(0,212,255,.1)', border: '1px solid rgba(0,212,255,.35)', color: '#22d3ee', fontWeight: 800 }
                                                        : { background: 'transparent', border: '1px solid rgba(51,65,85,.5)', color: '#64748b' })
                                                }}>
                                                {m}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div style={{ display: 'flex', gap: 13, marginBottom: 8, flexWrap: 'wrap' }}>
                                    <AnomalySummaryCard count={histStats.WTMP?.anomalyCount ?? 0}
                                        modCount={histStats.WTMP?.moderateCount ?? 0}
                                        extremeCount={histStats.WTMP?.extremeCount ?? 0}
                                        label="Temp" color="#f97316" icon={<span style={{ fontSize: 13, fontWeight: 900, color: '#f97316' }}>T°</span>} widthVar="88%" />
                                    <AnomalySummaryCard count={histStats.WSPD?.anomalyCount ?? 0}
                                        modCount={histStats.WSPD?.moderateCount ?? 0}
                                        extremeCount={histStats.WSPD?.extremeCount ?? 0}
                                        label="Wind" color="#22d3ee" icon={<span style={{ fontSize: 13, fontWeight: 900, color: '#22d3ee' }}>W</span>} widthVar="54%" />
                                    <AnomalySummaryCard count={histStats.WVHT?.anomalyCount ?? 0}
                                        modCount={histStats.WVHT?.moderateCount ?? 0}
                                        extremeCount={histStats.WVHT?.extremeCount ?? 0}
                                        label="Wave" color="#4ade80" icon={<span style={{ fontSize: 13, fontWeight: 900, color: '#4ade80' }}>~</span>} widthVar="24%" />
                                    <AnomalySummaryCard
                                        count={(histStats.WTMP?.extremeCount ?? 0) + (histStats.WSPD?.extremeCount ?? 0) + (histStats.WVHT?.extremeCount ?? 0) + (histStats.PRES?.extremeCount ?? 0)}
                                        modCount={(histStats.WTMP?.moderateCount ?? 0) + (histStats.WSPD?.moderateCount ?? 0) + (histStats.WVHT?.moderateCount ?? 0) + (histStats.PRES?.moderateCount ?? 0)}
                                        extremeCount={(histStats.WTMP?.extremeCount ?? 0) + (histStats.WSPD?.extremeCount ?? 0) + (histStats.WVHT?.extremeCount ?? 0) + (histStats.PRES?.extremeCount ?? 0)}
                                        label="Extreme" color="#ef4444" icon={<span style={{ fontSize: 13, fontWeight: 900, color: '#ef4444' }}>⚡</span>} widthVar="10%" />
                                </div>


                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 9 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <div style={{ width: 2, height: 11, background: 'rgba(0,212,255,.35)', borderRadius: 2 }}></div>
                                        <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.14em', color: '#155e75', textTransform: 'uppercase' }}>
                                            Parameter Charts
                                        </span>
                                    </div>
                                    <MAToggle enabled={showMA} onToggle={toggleMA} />
                                </div>
                                <HistoricalChart data={filteredHistorical} showMovingAverage={showMA} compareData={compareData} compareYear={compareYear} locationId={locationId} />
                                <OceanAnalyticsSummary data={filteredHistorical} params={HIST_ANALYTICS_PARAMS} />
                            </div>
                        )
                ) : viewMode === 'fisheries' ? (
                    <FisheriesIntelligence currentData={data[data.length - 1] || {}} />
                ) : viewMode === 'cyclones' ? (
                    <CycloneIntelligence />
                ) : (
                    /* ── LIVE VIEW ──────────────────────────────────────────────── */
                    loading ? <LoadingSpinner message="Fetching live ocean data…" /> :
                        error && data.length === 0 ? (
                            <div className="glass-card flex flex-col items-center justify-center gap-4" style={{ height: 340, textAlign: 'center', padding: '2rem' }}>
                                <div style={{ fontSize: '2rem' }}>🌊</div>
                                <div style={{ color: '#ff4d6d', fontWeight: 700 }}>Unable to load ocean data</div>
                                <div style={{ color: '#4db8e8', fontSize: '0.8rem', maxWidth: 360 }}>{error}. Make sure the backend server is running on port 5000.</div>
                                <button onClick={refetch} style={{ background: 'rgba(0,212,255,0.1)', border: '1px solid rgba(0,212,255,0.3)', borderRadius: '0.5rem', padding: '0.4rem 1rem', color: '#00d4ff', fontSize: '0.8rem', cursor: 'pointer' }}>Try Again</button>
                            </div>
                        ) : (
                            <div className="flex flex-col gap-4">
                                {/* Compare Toggle (Phase 2 Change 1) */}
                                <div className="flex justify-end mb-2">
                                    <button
                                        onClick={() => setCompareMode(!compareMode)}
                                        className={`border rounded-lg px-3 py-1.5 text-xs font-bold transition-colors shadow-sm ${compareMode
                                            ? 'bg-cyan-950 border-cyan-700 text-cyan-400'
                                            : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-cyan-400 hover:border-cyan-800'
                                            }`}
                                    >
                                        {compareMode ? 'Single buoy view' : 'Compare all 3 buoys'}
                                    </button>
                                </div>

                                {compareMode ? (
                                    <MultiBuoyDashboard
                                        buoyData={buoyData}
                                        buoys={BUOYS}
                                        timeWindow={timeWindow}
                                    />
                                ) : (
                                    <>
                                        {/* Status Bar logic removed, replacing with global strip context inline here if needed */}
                                        <div className="bg-green-950 border border-green-900 rounded-lg px-4 py-2 flex items-center justify-between mb-4 mt-2">
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" style={{ display: 'inline-block' }} />
                                                <span style={{ color: '#4ade80', fontSize: '0.8rem', fontWeight: 600 }}>{location.label.split('–')[0].trim()} online</span>
                                            </div>
                                            <div style={{ color: '#6ee7b7', fontSize: '0.75rem' }}>{data.length} observations cached</div>
                                        </div>

                                        {/* ═══ Enhanced Summary Cards (Change 2) ═══ */}
                                        <div className="grid grid-cols-4 gap-3">
                                            <EnhancedSummaryCard
                                                label="Sea Surface Temp" value={liveSST} unit="°C"
                                                color="#f97316" borderColor="#f97316" delta={sstDelta}
                                                stats={stats?.sea_surface_temp} sparklineValues={sparklines.sea_surface_temp}
                                                formatValue={FMT.sea_surface_temp}
                                            />
                                            <EnhancedSummaryCard
                                                label="Wind Speed" value={liveWind} unit="m/s"
                                                color="#22d3ee" borderColor="#22d3ee" delta={windDelta}
                                                stats={stats?.wind_speed} sparklineValues={sparklines.wind_speed}
                                                formatValue={FMT.wind_speed}
                                            />
                                            <EnhancedSummaryCard
                                                label="Air Pressure" value={livePressure} unit="hPa"
                                                color="#a78bfa" borderColor="#a78bfa" delta={pressureDelta}
                                                stats={stats?.air_pressure} sparklineValues={sparklines.air_pressure}
                                                formatValue={FMT.air_pressure}
                                            />
                                            <EnhancedSummaryCard
                                                label="Wave Height" value={liveWaveHeight} unit="m"
                                                color="#4ade80" borderColor="#4ade80" delta={waveDelta}
                                                stats={stats?.wave_height} sparklineValues={sparklines.wave_height}
                                                formatValue={FMT.wave_height}
                                            />
                                        </div>

                                        {/* ═══ Section Header (Change 8) ═══ */}
                                        <div className="flex items-center justify-between">
                                            <div className="text-xs uppercase tracking-widest font-medium" style={{ color: '#155e75' }}>
                                                Parameter Trends
                                            </div>
                                            <div className="text-xs font-normal tracking-normal" style={{ color: '#475569' }}>
                                                Dashed = forecast · Shaded band = μ±1σ normal range
                                            </div>
                                        </div>

                                        {/* ═══ Time Window Filter Pills (Change 3) ═══ */}
                                        <div className="flex gap-2 items-center mb-1">
                                            <span className="text-xs text-slate-500 mr-1">View range:</span>
                                            {TIME_WINDOWS.map(tw => (
                                                <button key={tw} onClick={() => setTimeWindow(tw)}
                                                    className={tw === timeWindow
                                                        ? 'bg-cyan-400 text-slate-900 font-bold border-cyan-400'
                                                        : 'bg-slate-900 text-slate-400 border-slate-700 hover:border-slate-500 hover:text-slate-300'}
                                                    style={{ border: '1px solid', borderRadius: '9999px', padding: '0.25rem 0.75rem', fontSize: '0.75rem', cursor: 'pointer', transition: 'all 0.15s' }}>
                                                    {tw}
                                                </button>
                                            ))}
                                            <div style={{ marginLeft: 'auto' }}>
                                                <MAToggle enabled={showMA} onToggle={toggleMA} />
                                            </div>
                                        </div>

                                        {/* ═══ Charts (all changes applied via OceanChart) ═══ */}
                                        <OceanChart data={data} activeParams={activeParams} showMovingAverage={showMA} timeWindow={timeWindow} />
                                    </>
                                )}
                            </div>
                        )
                )}
            </main>
        </div>
    );
}
