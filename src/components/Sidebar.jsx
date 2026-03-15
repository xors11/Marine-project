import React from 'react';
import { LOCATIONS, PARAMETERS } from '../data/constants';

export default function Sidebar({
    locationId, onLocationChange,
    activeParams, onToggleParam,
    onRefresh,
    isOpen, onClose, // New props for mobile control
}) {
    return (
        <>
            {/* Mobile Overlay Background */}
            <div
                className={`sidebar-mobile-overlay ${isOpen ? 'active' : ''}`}
                onClick={onClose}
            />

            <aside
                className={`flex flex-col gap-7 py-6 px-5 h-full overflow-y-auto transition-transform duration-300 ease-in-out`}
                style={{
                    width: '260px',
                    minWidth: '260px',
                    background: 'rgba(4,24,46,0.85)',
                    borderRight: '1px solid rgba(36,144,204,0.18)',
                    backdropFilter: 'blur(16px)',
                    position: window.innerWidth <= 768 ? 'fixed' : 'relative',
                    left: 0,
                    top: 0,
                    zIndex: 50,
                    transform: window.innerWidth <= 768 && !isOpen ? 'translateX(-100%)' : 'translateX(0)',
                }}
            >
                {/* Header / Logo */}
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                        <div
                            style={{
                                width: 38, height: 38,
                                borderRadius: '50%',
                                background: 'radial-gradient(circle at 35% 35%, #00d4ff 0%, #135580 70%)',
                                boxShadow: '0 0 18px rgba(0,212,255,0.4)',
                                flexShrink: 0,
                            }}
                        />
                        <div>
                            <div className="gradient-text font-extrabold text-sm leading-tight">Ocean Blue</div>
                            <div style={{ color: '#4db8e8', fontSize: '0.65rem', letterSpacing: '0.1em' }}>
                                Data Explorer
                            </div>
                        </div>
                    </div>

                    {/* Mobile Close Button */}
                    <button
                        onClick={onClose}
                        className="mobile-menu-btn"
                        style={{ width: 32, height: 32, padding: 0, fontSize: '1.2rem', display: window.innerWidth <= 768 ? 'flex' : 'none' }}
                    >
                        &times;
                    </button>
                </div>

                <div style={{ height: 1, background: 'rgba(36,144,204,0.15)' }} />

                {/* Location Selector */}
                <div>
                    <div className="sidebar-label">Buoy Location</div>
                    <select
                        className="ocean-select"
                        value={locationId}
                        onChange={(e) => onLocationChange(e.target.value)}
                    >
                        {LOCATIONS.map((loc) => (
                            <option key={loc.id} value={loc.id}>{loc.label}</option>
                        ))}
                    </select>
                    {/* Lat/lon display */}
                    {(() => {
                        const loc = LOCATIONS.find((l) => l.id === locationId);
                        return loc ? (
                            <div style={{ fontSize: '0.65rem', color: '#4db8e8', marginTop: '0.4rem', opacity: 0.7 }}>
                                {loc.lat >= 0 ? `${loc.lat}°N` : `${Math.abs(loc.lat)}°S`} &nbsp;
                                {loc.lon >= 0 ? `${loc.lon}°E` : `${Math.abs(loc.lon)}°W`}
                            </div>
                        ) : null;
                    })()}
                </div>

                {/* Parameter Selector */}
                <div>
                    <div className="sidebar-label">Parameters</div>
                    <div className="flex flex-col gap-2">
                        {PARAMETERS.map((p) => {
                            const active = activeParams.includes(p.key);
                            return (
                                <button
                                    key={p.key}
                                    className={`param-pill ${active ? 'active' : ''}`}
                                    onClick={() => onToggleParam(p.key)}
                                    style={active ? { borderLeft: `3px solid ${p.color}` } : {}}
                                >
                                    <span
                                        style={{
                                            width: 8, height: 8,
                                            borderRadius: '50%',
                                            background: active ? p.color : 'rgba(36,144,204,0.3)',
                                            flexShrink: 0,
                                            transition: 'background 0.2s',
                                        }}
                                    />
                                    <span>{p.label}</span>
                                    <span style={{ marginLeft: 'auto', fontSize: '0.65rem', color: active ? 'rgba(0,212,255,0.7)' : 'rgba(74,183,232,0.5)' }}>
                                        {p.unit}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Manual Refresh */}
                <button
                    onClick={onRefresh}
                    style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                        background: 'rgba(0,212,255,0.08)',
                        border: '1px solid rgba(0,212,255,0.25)',
                        borderRadius: '0.5rem',
                        padding: '0.5rem',
                        color: '#00d4ff',
                        fontSize: '0.75rem',
                        cursor: 'pointer',
                        transition: 'background 0.2s',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(0,212,255,0.16)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(0,212,255,0.08)'}
                >
                    ↺  Refresh Now
                </button>

                {/* Footer */}
                <div className="mt-auto" style={{ fontSize: '0.62rem', color: '#135580', textAlign: 'center', lineHeight: 1.6 }}>
                    Source: Open‑Meteo Marine API<br />Auto‑refresh every 5 min
                </div>
            </aside>
        </>
    );
}
