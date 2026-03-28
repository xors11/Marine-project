import React, { useMemo, useState, useEffect, useCallback } from 'react';
import Sidebar from './components/Sidebar';
import OceanChart from './components/OceanChart';
import LoadingSpinner from './components/LoadingSpinner';
import HistoricalChart, { HIST_PARAMS } from './components/HistoricalChart';
import OceanAnalyticsSummary, { HIST_ANALYTICS_PARAMS } from './components/OceanAnalyticsSummary';
import FisheriesIntelligence from './components/FisheriesIntelligence';
import CycloneIntelligence from './components/CycloneIntelligence';
import MultiBuoyDashboard from './components/MultiBuoyDashboard';
import BottomNav from './components/BottomNav';
import MobileHeader from './components/MobileHeader';
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
        <div className="flex overflow-x-auto gap-3 pb-1" style={{ fontSize: '0.75rem', marginTop: '0.4rem' }}>
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
                        className={`flex-shrink-0 flex items-center gap-2 cursor-pointer transition-colors ${isActive ? 'text-cyan-400 font-bold' : 'text-slate-400 hover:text-cyan-400'}`}
                        style={{ minWidth: 'fit-content' }}
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
    const height = 36;

    const points = values.map((v, i) => {
        const x = (i / (values.length - 1)) * 100;
        const y = height - ((v - min) / range) * (height - 4) - 2;
        return `${x},${y}`;
    });

    const linePath = `M ${points[0]} ` + points.slice(1).map(p => `L ${p}`).join(' ');
    const fillPath = `${linePath} L 100,${height} L 0,${height} Z`;
    const gradId = `fillGrad-${color.replace('#', '')}`;
    const lastV = values[values.length - 1];
    const lastY = height - ((lastV - min) / range) * (height - 4) - 2;

    return (
        <div style={{ position: 'relative', height: '36px', width: '100%', margin: '6px 0' }}>
            <svg width="100%" height="36px" preserveAspectRatio="none" viewBox={`0 0 100 36`} style={{ display: 'block' }}>
                <defs>
                    <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={color} stopOpacity="0.25" />
                        <stop offset="100%" stopColor={color} stopOpacity="0.02" />
                    </linearGradient>
                </defs>
                <path d={fillPath} fill={`url(#${gradId})`} />
                <path d={linePath} fill="none" stroke={color} strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
            </svg>
            <div style={{
                position: 'absolute', right: 0, top: `${lastY}px`,
                width: 5, height: 5, borderRadius: '50%', background: color,
                transform: 'translate(50%, -50%)', zIndex: 1
            }} />
        </div>
    );
}

// ─── Enhanced Summary Card (Change 2) ─────────────────────────────────────────
function EnhancedSummaryCard({ label, value, unit, color, borderColor, delta, stats, sparklineValues, formatValue, dataAge }) {
    const formattedValue = value != null ? formatValue(value) : '—';

    // Determine Alert State
    let alertState = 'ok';
    let statusColor = '#34d399';
    let alertBorderStr = '#34d399';
    const bgStr = delta?.bg || '';
    if (bgStr.includes('red') || bgStr.includes('danger')) {
        alertState = 'danger';
        statusColor = '#ff4d6d';
        alertBorderStr = '#ff4d6d';
    } else if (bgStr.includes('amber') || bgStr.includes('orange') || bgStr.includes('warning') || bgStr.includes('blue')) {
        alertState = 'warning';
        statusColor = '#fbbf24';
        alertBorderStr = '#fbbf24';
    }

    const statusIcon = alertState === 'ok' ? (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
        </svg>
    ) : (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
    );

    let sparkColor = color;
    if (label.includes('Wind')) sparkColor = '#00d4ff';
    if (label.includes('Wave')) sparkColor = '#34d399';
    if (label.includes('Temp') || label.includes('SST')) sparkColor = '#f97316';
    if (label.includes('Pressure')) sparkColor = '#a78bfa';

    return (
        <div
            className="flex flex-col relative rounded-xl glass-card"
            style={{
                background: 'rgba(6,14,30,0.7)',
                border: '0.5px solid rgba(36,144,204,0.2)',
                borderLeft: `2px solid ${alertBorderStr}`,
                backdropFilter: 'blur(8px)',
                overflow: 'visible',
                padding: '14px',
                gap: '6px'
            }}
            ref={(el) => {
                if (el) {
                    el.style.setProperty('border-left', `2px solid ${alertBorderStr}`, 'important');
                }
            }}
        >
            <style>{`
                @keyframes metricLivePulse {
                    0%, 100% { opacity: 1; transform: scale(1); }
                    50% { opacity: 0.5; transform: scale(0.8); }
                }
                .metric-live-dot {
                    animation: metricLivePulse 1.4s ease-in-out infinite;
                }
            `}</style>

            <div className="flex justify-between items-start w-full">
                <div className="text-[10px] md:text-xs text-slate-400 uppercase tracking-wider font-bold m-0 p-0 leading-none">{label}</div>
                {dataAge?.label === 'fresh' && (
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: 4,
                        background: 'rgba(52,211,153,0.1)',
                        border: '0.5px solid rgba(52,211,153,0.25)',
                        borderRadius: 99, padding: '2px 7px',
                    }}>
                        <div className="metric-live-dot" style={{ width: 5, height: 5, borderRadius: '50%', background: '#34d399' }} />
                        <span style={{ fontSize: 9, color: '#34d399', fontWeight: 700, textTransform: 'uppercase' }}>Live</span>
                    </div>
                )}
            </div>

            <div className="text-4xl md:text-3xl font-black md:font-bold leading-none m-0 p-0" style={{ color }}>
                {formattedValue}
                <span className="text-sm md:text-base font-medium ml-1" style={{ opacity: 0.8 }}>{unit}</span>
            </div>

            <div className="flex items-center gap-1.5 m-0 p-0" style={{ fontSize: '11px', color: statusColor, fontWeight: 600 }}>
                {statusIcon}
                <span>{delta?.text?.replace(/^[▲▼●]+( )?/, '') || 'Live reading'}</span>
            </div>

            <Sparkline values={sparklineValues} color={sparkColor} />

            {stats && (
                <div style={{
                    display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8,
                    borderTop: '0.5px solid rgba(36,144,204,0.12)', paddingTop: '8px', margin: 0
                }}>
                    <div>
                        <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--ocean-400)' }}>Min</div>
                        <div style={{ fontSize: 12, fontWeight: 600, color: '#87d4f4' }}>{stats.min != null ? formatValue(stats.min) : '—'}</div>
                    </div>
                    <div>
                        <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--ocean-400)' }}>Mean</div>
                        <div style={{ fontSize: 12, fontWeight: 600, color: '#87d4f4' }}>{stats.mean != null ? formatValue(stats.mean) : '—'}</div>
                    </div>
                    <div>
                        <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--ocean-400)' }}>Max</div>
                        <div style={{ fontSize: 12, fontWeight: 600, color: '#87d4f4' }}>{stats.max != null ? formatValue(stats.max) : '—'}</div>
                    </div>
                </div>
            )}
        </div>
    );
}

// ─── Historical Anomaly Summary Card ──────────────────────────────────────────
function AnomalySummaryCard({ count, modCount, extremeCount, label, color, icon, widthVar }) {
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
    return (
        <div className="acard-hover" style={{
            flex: '1 1 140px', background: 'rgba(6,13,28,.97)', border: '1px solid rgba(51,65,85,.5)',
            borderRadius: '13px', padding: isMobile ? '12px' : '18px 20px', position: 'relative', overflow: 'hidden'
        }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, ${color}, transparent)` }} />
            <div style={{ position: 'absolute', top: -28, right: -28, width: 80, height: 80, borderRadius: '50%', background: color, opacity: 0.08 }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <span style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.14em', color: '#e2f4ff', opacity: 0.6, fontWeight: 800 }}>{label}</span>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>{icon}</div>
            </div>
            <div className="truncate" style={{ fontSize: isMobile ? 32 : 42, fontVariationSettings: '"wght" 900', fontWeight: 900, letterSpacing: '-0.04em', lineHeight: 1, color }}>{count}</div>
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

    const { buoyData, loading, lastUpdated, countdown, BUOYS, getRegionalSummary, refetch, pauseRefresh, resumeRefresh } = useMultiBuoyData();

    const data = buoyData[locationId]?.history || [];
    const error = null;

    const activeBuoy = BUOYS.find(b => b.id === locationId) || BUOYS[0];
    const setActiveBuoy = (buoy) => handleLocationChange(buoy.id);

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
        if (typeof window !== 'undefined' && window.innerWidth < 768) {
            window.open(url, '_blank');
        } else {
            const a = document.createElement('a'); a.href = url; a.download = `ocean-blue-${selectedYear}-data.csv`; a.click();
        }
        setTimeout(() => URL.revokeObjectURL(url), 100);
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
        if (typeof window !== 'undefined' && window.innerWidth < 768) {
            window.open(url, '_blank');
        } else {
            const a = document.createElement('a'); a.href = url; a.download = `ocean-blue-${selectedYear}-data.json`; a.click();
        }
        setTimeout(() => URL.revokeObjectURL(url), 100);
    }, [filteredHistorical, selectedYear]);

    const lastUpdatedStr = useMemo(
        () => lastUpdated ? lastUpdated.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : null,
        [lastUpdated]
    );

    const dataAge = useMemo(() => {
        if (!lastUpdated) return null;
        const ms = Date.now() - lastUpdated.getTime();
        if (ms < 5 * 60 * 1000) return { color: '#4ade80', label: 'fresh' };
        if (ms < 10 * 60 * 1000) return { color: '#f59e0b', label: 'aging' };
        return { color: '#ef4444', label: 'stale' };
    }, [lastUpdated]);

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
        <div className="flex flex-col md:flex-row h-screen overflow-hidden relative">
            <div className="sidebar-wrapper">
                <Sidebar
                    locationId={locationId} onLocationChange={handleLocationChange}
                    activeParams={activeParams} onToggleParam={toggleParam}
                    onRefresh={refetch} isOpen={isSidebarOpen} onClose={closeSidebar}
                />
            </div>

            <main className="main-content-area flex-1 overflow-y-auto p-3 md:p-8 pb-20 md:pb-8 bg-gradient-to-br from-[#020d18] via-[#04182e] to-[#071e2b]">
                {/* Mobile Header inline dropdown (Hiding since user wants Desktop Header on Mobile) */}
                <div className="hidden">
                    <MobileHeader
                        activeTab={viewMode}
                        activeLocation={locationId}
                        setActiveLocation={handleLocationChange}
                        activeParams={activeParams}
                        toggleParam={toggleParam}
                        onRefresh={refetch}
                        isRefreshing={loading}
                    />
                </div>

                {/* Desktop Header */}
                <div className="main-module-header flex items-start justify-between mb-6 flex-wrap gap-3">
                    <div className="flex items-start gap-3">
                        <button className="mobile-menu-btn" onClick={toggleSidebar}>☰</button>
                        <div>
                            <h1 style={{ fontSize: '1.6rem', fontWeight: 900, letterSpacing: '-0.02em', lineHeight: 1.2, backgroundImage: 'linear-gradient(to right, #22d3ee, #a855f7)', WebkitBackgroundClip: 'text', color: 'transparent' }}>
                                Ocean Data Explorer
                            </h1>
                            {isHistorical ? (
                                <div className="buoy-status-bar" style={{ color: '#94a3b8', fontSize: '0.8rem', marginTop: '0.25rem' }}>
                                    {location.label} &nbsp;·&nbsp; Historical Data — {selectedYear}
                                </div>
                            ) : (
                                <div className="buoy-status-bar">
                                    <GlobalBuoyStrip
                                        buoyData={buoyData}
                                        buoys={BUOYS}
                                        activeId={locationId}
                                        onSelect={handleLocationChange}
                                        lastUpdated={lastUpdated}
                                    />
                                </div>
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
                                {lastUpdatedStr && (
                                    <div style={{
                                        background: 'rgba(36,144,204,0.08)',
                                        border: '1px solid rgba(36,144,204,0.15)',
                                        borderRadius: 99, padding: '0.25rem 0.7rem',
                                        fontSize: '0.7rem', color: '#4db8e8',
                                        display: 'flex', alignItems: 'center', gap: 5
                                    }}>
                                        <span style={{
                                            width: 6, height: 6, borderRadius: '50%',
                                            background: dataAge?.color ?? '#4ade80',
                                            display: 'inline-block'
                                        }} className="animate-pulse" />
                                        Live · {lastUpdatedStr}
                                        <span style={{ color: '#1e3a5f', marginLeft: 2 }}>· {countdown}s</span>
                                    </div>
                                )}
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
                                        <div className="flex year-scroll overflow-x-auto flex-nowrap" style={{ gap: 8, paddingBottom: 6 }}>
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

                                    {/* ═══ MOBILE EXPORT & COMPARE BLOCKS ═══ */}
                                    <div className="md:hidden w-full flex flex-col mb-2 mt-2">
                                        <div className="flex gap-3 mb-4">
                                            <button
                                                onClick={handleExportCSV}
                                                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-slate-900 border border-slate-700 text-sm font-semibold text-slate-300 active:bg-slate-800 transition-all min-h-[44px]"
                                            >
                                                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                                    <path d="M8 2v8M5 7l3 3 3-3" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                                    <path d="M3 12h10" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" />
                                                </svg>
                                                Export CSV
                                            </button>
                                            <button
                                                onClick={handleExportJSON}
                                                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-slate-900 border border-slate-700 text-sm font-semibold text-slate-300 active:bg-slate-800 transition-all min-h-[44px]"
                                            >
                                                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                                    <path d="M8 2v8M5 7l3 3 3-3" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                                    <path d="M3 12h10" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" />
                                                </svg>
                                                Export JSON
                                            </button>
                                        </div>

                                        <div className="mb-4">
                                            <div className="text-[9px] text-slate-500 uppercase tracking-wider mb-2 font-semibold px-1">
                                                Compare with year
                                            </div>
                                            <div className="flex gap-2 overflow-x-auto pb-1 flex-nowrap" style={{ WebkitOverflowScrolling: 'touch', msOverflowStyle: 'none', scrollbarWidth: 'none' }}>
                                                <button
                                                    onClick={() => setCompareYear(null)}
                                                    className={`flex-shrink-0 px-4 py-2.5 rounded-xl border text-xs font-semibold transition-all min-h-[44px] ${compareYear === null
                                                        ? 'bg-slate-700 border-slate-500 text-white'
                                                        : 'bg-slate-900 border-slate-800 text-slate-500'
                                                        }`}
                                                >
                                                    None
                                                </button>
                                                {YEARS.map(year => (
                                                    <button
                                                        key={year}
                                                        onClick={() => setCompareYear(compareYear === year ? null : year)}
                                                        className={`flex-shrink-0 px-4 py-2.5 rounded-xl border text-xs font-semibold transition-all min-h-[44px] ${compareYear === year
                                                            ? 'bg-violet-950 border-violet-700 text-violet-300'
                                                            : 'bg-slate-900 border-slate-800 text-slate-500'
                                                            }`}
                                                    >
                                                        {year}
                                                    </button>
                                                ))}
                                            </div>
                                            {compareYear && (
                                                <div className="flex items-center gap-3 mt-3 px-1">
                                                    <div className="flex items-center gap-2 text-xs text-slate-400">
                                                        <div className="w-8 h-0.5 bg-current rounded"></div>
                                                        {selectedYear} (selected)
                                                    </div>
                                                    <div className="flex items-center gap-2 text-xs text-violet-400">
                                                        <div className="w-8 h-0.5 border-t border-dashed border-current"></div>
                                                        {compareYear} (compare)
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="hidden md:flex items-center gap-3 mt-2">
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
                                    <div className="flex overflow-x-auto flex-nowrap gap-2 pb-1" style={{ WebkitOverflowScrolling: 'touch', msOverflowStyle: 'none', scrollbarWidth: 'none' }}>
                                        {MONTHS.map((m, i) => (
                                            <button key={m} onClick={() => setSelectedMonth(i)}
                                                className="flex-shrink-0"
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

                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-2">
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
                    <FisheriesIntelligence currentData={data[data.length - 1] || {}} getRegionalSummary={getRegionalSummary} />
                ) : viewMode === 'cyclones' ? (
                    <CycloneIntelligence buoyData={buoyData} buoys={BUOYS} />
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
                                {/* ═══ MOBILE BUOY + PARAMETER SELECTOR ═══ */}
                                <div className="md:hidden mb-4 space-y-3 mt-2">
                                    {/* BUOY SELECTOR */}
                                    <div>
                                        <div className="text-[9px] text-slate-500 uppercase tracking-wider mb-2 font-semibold px-1">
                                            Buoy Location
                                        </div>
                                        <div className="flex gap-2 overflow-x-auto pb-1 flex-nowrap">
                                            {BUOYS.map(buoy => {
                                                const isActive = activeBuoy?.id === buoy.id || locationId === buoy.id;
                                                const bData = buoyData[buoy.id];
                                                return (
                                                    <button
                                                        key={buoy.id}
                                                        onClick={() => setActiveBuoy(buoy)}
                                                        className={`flex-shrink-0 flex flex-col px-3 py-2.5 rounded-xl border text-left transition-all min-w-[110px] ${isActive ? 'bg-cyan-950 border-cyan-700' : 'bg-slate-900 border-slate-800 active:border-slate-600'}`}
                                                    >
                                                        <div className="flex items-center gap-1.5 mb-1">
                                                            <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${isActive ? 'bg-cyan-400' : 'bg-slate-600'}`} />
                                                            <span className={`text-[10px] font-bold truncate ${isActive ? 'text-cyan-300' : 'text-slate-400'}`}>
                                                                {buoy.name}
                                                            </span>
                                                        </div>
                                                        <div className={`text-[9px] ${isActive ? 'text-slate-400' : 'text-slate-600'}`}>
                                                            {buoy.label}
                                                        </div>
                                                        {/* STEP 6: Add wave height */}
                                                        <div className="flex gap-2 mt-1.5 flex-wrap">
                                                            <span className={`text-[10px] font-semibold ${isActive ? 'text-orange-400' : 'text-slate-500'}`}>
                                                                {bData?.sst != null ? `${bData.sst.toFixed(1)}°C` : '—'}
                                                            </span>
                                                            <span className={`text-[10px] font-semibold ${isActive ? 'text-cyan-400' : 'text-slate-500'}`}>
                                                                {bData?.wind != null ? `${bData.wind.toFixed(1)}m/s` : '—'}
                                                            </span>
                                                            <span className={`text-[10px] font-semibold ${isActive ? 'text-green-400' : 'text-slate-500'}`}>
                                                                {bData?.wave != null ? `${bData.wave.toFixed(1)}m` : '—'}
                                                            </span>
                                                        </div>
                                                        {isActive && (
                                                            <div className="text-[8px] text-cyan-600 mt-1 font-medium">
                                                                viewing ●
                                                            </div>
                                                        )}
                                                    </button>
                                                )
                                            })}
                                        </div>
                                    </div>

                                    {/* PARAMETER SELECTOR */}
                                    <div>
                                        <div className="text-[9px] text-slate-500 uppercase tracking-wider mb-2 font-semibold px-1">
                                            Parameter
                                        </div>
                                        <div className="flex gap-2 overflow-x-auto pb-1 flex-nowrap">
                                            {[
                                                { id: 'sea_surface_temp', label: 'Sea Surface Temp', short: 'SST', unit: '°C', activeClass: 'bg-orange-950 border-orange-700 text-orange-300', dotClass: 'bg-orange-400' },
                                                { id: 'wind_speed', label: 'Wind Speed', short: 'Wind', unit: 'm/s', activeClass: 'bg-cyan-950 border-cyan-700 text-cyan-300', dotClass: 'bg-cyan-400' },
                                                { id: 'air_pressure', label: 'Air Pressure', short: 'Pressure', unit: 'hPa', activeClass: 'bg-violet-950 border-violet-700 text-violet-300', dotClass: 'bg-violet-400' },
                                                { id: 'wave_height', label: 'Wave Height', short: 'Wave', unit: 'm', activeClass: 'bg-green-950 border-green-700 text-green-300', dotClass: 'bg-green-400' }
                                            ].map(param => {
                                                const isActive = activeParams.includes(param.id);
                                                return (
                                                    <button
                                                        key={param.id}
                                                        onClick={() => toggleParam(param.id)}
                                                        className={`flex-shrink-0 flex items-center gap-2 px-3 py-2.5 rounded-xl border text-xs font-semibold transition-all ${isActive ? param.activeClass : 'bg-slate-900 border-slate-800 text-slate-500'}`}
                                                    >
                                                        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${isActive ? param.dotClass : 'bg-slate-600'}`} />
                                                        <span>{param.short}</span>
                                                        <span className="text-[9px] opacity-60 font-normal">{param.unit}</span>
                                                    </button>
                                                )
                                            })}
                                        </div>
                                    </div>
                                </div>

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
                                        {/* Status bar */}
                                        <div className="bg-green-950 border border-green-900 rounded-lg px-4 py-2 flex items-center justify-between mb-4 mt-2">
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" style={{ display: 'inline-block' }} />
                                                <span style={{ color: '#4ade80', fontSize: '0.8rem', fontWeight: 600 }}>{location.label.split('–')[0].trim()} online</span>
                                            </div>
                                            <div style={{ color: '#6ee7b7', fontSize: '0.75rem' }}>{data.length} observations cached</div>
                                        </div>

                                        {/* Stale data warning banner */}
                                        {dataAge?.label === 'stale' && (
                                            <div style={{
                                                background: 'rgba(127,29,29,0.2)',
                                                border: '1px solid rgba(239,68,68,0.2)',
                                                borderRadius: 8, padding: '6px 14px',
                                                display: 'flex', alignItems: 'center',
                                                justifyContent: 'space-between', fontSize: 10
                                            }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                    <span style={{ color: '#ef4444', fontWeight: 700 }}>⚠ Live data may be stale</span>
                                                    <span style={{ color: '#334155' }}>Last updated {lastUpdatedStr}</span>
                                                </div>
                                                <button onClick={refetch} style={{
                                                    background: 'rgba(239,68,68,0.1)',
                                                    border: '1px solid rgba(239,68,68,0.25)',
                                                    borderRadius: 6, padding: '2px 10px',
                                                    color: '#f87171', fontSize: 9,
                                                    fontWeight: 700, cursor: 'pointer'
                                                }}>Refresh now</button>
                                            </div>
                                        )}

                                        {/* ═══ Enhanced Summary Cards (Change 2) ═══ */}
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                            <EnhancedSummaryCard
                                                label="Sea Surface Temp" value={liveSST} unit="°C"
                                                color="#f97316" borderColor="#f97316" delta={sstDelta}
                                                stats={stats?.sea_surface_temp} sparklineValues={sparklines.sea_surface_temp}
                                                formatValue={FMT.sea_surface_temp} dataAge={dataAge}
                                            />
                                            <EnhancedSummaryCard
                                                label="Wind Speed" value={liveWind} unit="m/s"
                                                color="#22d3ee" borderColor="#22d3ee" delta={windDelta}
                                                stats={stats?.wind_speed} sparklineValues={sparklines.wind_speed}
                                                formatValue={FMT.wind_speed} dataAge={dataAge}
                                            />
                                            <EnhancedSummaryCard
                                                label="Air Pressure" value={livePressure} unit="hPa"
                                                color="#a78bfa" borderColor="#a78bfa" delta={pressureDelta}
                                                stats={stats?.air_pressure} sparklineValues={sparklines.air_pressure}
                                                formatValue={FMT.air_pressure} dataAge={dataAge}
                                            />
                                            <EnhancedSummaryCard
                                                label="Wave Height" value={liveWaveHeight} unit="m"
                                                color="#4ade80" borderColor="#4ade80" delta={waveDelta}
                                                stats={stats?.wave_height} sparklineValues={sparklines.wave_height}
                                                formatValue={FMT.wave_height} dataAge={dataAge}
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
                                        <div className="flex gap-2 items-center mb-1 overflow-x-auto flex-nowrap pb-1">
                                            <span className="text-xs text-slate-500 mr-1 flex-shrink-0">View range:</span>
                                            {TIME_WINDOWS.map(tw => (
                                                <button key={tw} onClick={() => setTimeWindow(tw)}
                                                    className={`flex-shrink-0 ${tw === timeWindow
                                                        ? 'bg-cyan-400 text-slate-900 font-bold border-cyan-400'
                                                        : 'bg-slate-900 text-slate-400 border-slate-700 hover:border-slate-500 hover:text-slate-300'}`}
                                                    style={{ border: '1px solid', borderRadius: '9999px', padding: '0.25rem 0.75rem', fontSize: '0.75rem', cursor: 'pointer', transition: 'all 0.15s' }}>
                                                    {tw}
                                                </button>
                                            ))}
                                            <div className="ml-auto flex-shrink-0 pl-2">
                                                <MAToggle enabled={showMA} onToggle={toggleMA} />
                                            </div>
                                        </div>

                                        {/* ═══ Charts (all changes applied via OceanChart) ═══ */}
                                        <OceanChart data={data} activeParams={activeParams} showMovingAverage={showMA} timeWindow={timeWindow} activeBuoy={activeBuoy} />

                                        {/* Data source footer */}
                                        <div style={{
                                            fontSize: 9, color: '#1e3a5f',
                                            padding: '6px 2px',
                                            display: 'flex', alignItems: 'center',
                                            gap: 8, borderTop: '1px solid rgba(51,65,85,0.2)',
                                            marginTop: 4
                                        }}>
                                            <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#4ade80', display: 'inline-block' }} />
                                            Data: Open-Meteo Marine API
                                            <span style={{ color: '#0f2744' }}>·</span>
                                            Indian Ocean Buoy Network
                                            <span style={{ color: '#0f2744' }}>·</span>
                                            Real-time · 1h resolution
                                            <span style={{ color: '#0f2744' }}>·</span>
                                            {data.length} observations loaded
                                        </div>
                                    </>
                                )}
                            </div>
                        )
                )}
            </main>
            <BottomNav activeTab={viewMode} onTabChange={setViewMode} />
        </div>
    );
}
