import React, { useState } from 'react';
import { RefreshCw, MapPin, Layers, Settings, X, Activity } from 'lucide-react';
import { LOCATIONS, PARAMETERS } from '../data/constants';

export default function MobileHeader({
    activeTab,
    activeLocation,
    setActiveLocation,
    activeParams,
    toggleParam,
    onRefresh,
    isRefreshing
}) {
    const [sheetOpen, setSheetOpen] = useState(false);

    // Get tab title
    const tabTitles = {
        live: 'Live Forecast',
        historical: 'Historical Data',
        fisheries: 'Fisheries Intelligence',
        cyclones: 'Cyclones & Risk'
    };

    return (
        <div className="md:hidden">
            {/* Fixed Header */}
            <div className="fixed top-0 left-0 right-0 z-50 bg-[rgba(2,13,24,0.8)] backdrop-blur-xl border-b border-[rgba(7,41,67,0.6)] p-3">
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[var(--color-accent)] to-[var(--color-abyss-600)] flex items-center justify-center p-0.5 shadow-[0_0_15px_rgba(45,212,191,0.4)]">
                            <div className="w-full h-full rounded-full bg-[var(--color-abyss-950)] flex items-center justify-center relative overflow-hidden">
                                <Activity className="w-4 h-4 text-[var(--color-accent)] z-10 animate-pulse" />
                            </div>
                        </div>
                        <div>
                            <h1 className="text-sm font-bold text-white tracking-wide">Ocean Blue</h1>
                            <div className="text-[10px] text-[var(--color-accent)] font-semibold">{tabTitles[activeTab]}</div>
                        </div>
                    </div>

                    <button
                        onClick={() => setSheetOpen(true)}
                        style={{ background: 'rgba(36, 144, 204, 0.08)', border: '1px solid rgba(36, 144, 204, 0.15)', color: 'var(--color-abyss-300)' }}
                        className="p-2 rounded-lg active:scale-95 transition-transform"
                    >
                        <Settings className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Spacer to prevent content from hiding beneath the fixed header */}
            <div className="h-[60px] w-full"></div>

            {/* Dropdown Sheet */}
            {sheetOpen && (
                <div className="fixed inset-0 z-50 flex flex-col bg-[var(--color-abyss-950)]">
                    <div className="flex justify-between items-center p-4 border-b border-[var(--color-abyss-800)]">
                        <h2 className="text-lg font-bold text-white flex items-center gap-2">
                            <Settings className="w-5 h-5 text-[var(--color-accent)]" /> Settings
                        </h2>
                        <button onClick={() => setSheetOpen(false)} className="p-2 text-[var(--color-abyss-300)]">
                            <X className="w-6 h-6" />
                        </button>
                    </div>

                    <div className="p-4 flex-1 overflow-y-auto">
                        {/* Location Select */}
                        {['live', 'historical'].includes(activeTab) && (
                            <div className="mb-6">
                                <label className="text-xs font-bold text-[var(--color-abyss-400)] uppercase tracking-widest flex items-center gap-2 mb-2">
                                    <MapPin className="w-4 h-4" /> Location Array
                                </label>
                                <select
                                    className="w-full bg-[var(--color-abyss-900)] border border-[var(--color-abyss-700)] rounded-xl p-3 text-white appearance-none"
                                    value={activeLocation}
                                    onChange={(e) => setActiveLocation(e.target.value)}
                                >
                                    {LOCATIONS.map(loc => (
                                        <option key={loc.id} value={loc.id}>{loc.label} — {loc.coords}</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {/* Parameter Select */}
                        {['live', 'historical'].includes(activeTab) && (
                            <div className="mb-6">
                                <label className="text-xs font-bold text-[var(--color-abyss-400)] uppercase tracking-widest flex items-center gap-2 mb-2">
                                    <Layers className="w-4 h-4" /> Parameters
                                </label>
                                <div className="grid grid-cols-2 gap-2">
                                    {PARAMETERS.map(param => (
                                        <button
                                            key={param.key}
                                            onClick={() => toggleParam(param.key)}
                                            className={`p-3 rounded-xl border text-left text-sm font-medium transition-colors ${activeParams.includes(param.key)
                                                ? 'bg-[rgba(45,212,191,0.08)] border-[rgba(45,212,191,0.3)] text-[var(--color-accent)]'
                                                : 'bg-[var(--color-abyss-900)] border-[var(--color-abyss-800)] text-[var(--color-abyss-300)]'
                                                }`}
                                        >
                                            <div style={{ color: activeParams.includes(param.key) ? `var(--color-${param.key === 'sea_surface_temp' ? 'temp' : param.key === 'wind_speed' ? 'accent' : param.key === 'air_pressure' ? 'violet' : 'green'})` : '' }}>{param.label}</div>
                                            <div className="text-[10px] opacity-60">{param.unit}</div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Force Refresh */}
                        <button
                            onClick={() => {
                                onRefresh();
                                setSheetOpen(false);
                            }}
                            style={{ background: 'rgba(45, 212, 191, 0.08)', border: '1px solid rgba(45, 212, 191, 0.2)', color: 'var(--color-accent)' }}
                            className="w-full py-3 rounded-xl font-medium flex items-center justify-center gap-2 mt-4"
                        >
                            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                            Force Data Sync
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
