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
        <div className="md:hidden sticky top-0 z-40 bg-slate-950/80 backdrop-blur-xl border-b border-slate-800/60 p-3 mb-3">
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#00d4ff] to-[#0055ff] flex items-center justify-center p-0.5 shadow-[0_0_15px_rgba(0,212,255,0.4)]">
                        <div className="w-full h-full rounded-full bg-[#0a1628] flex items-center justify-center relative overflow-hidden">
                            <Activity className="w-4 h-4 text-[#00d4ff] z-10 animate-pulse" />
                        </div>
                    </div>
                    <div>
                        <h1 className="text-sm font-bold text-white tracking-wide">Ocean Blue</h1>
                        <div className="text-[10px] text-cyan-400 font-semibold">{tabTitles[activeTab]}</div>
                    </div>
                </div>

                <button
                    onClick={() => setSheetOpen(true)}
                    className="p-2 bg-slate-900 border border-slate-700/50 rounded-lg text-slate-300 active:scale-95 transition-transform"
                >
                    <Settings className="w-5 h-5" />
                </button>
            </div>

            {/* Dropdown Sheet */}
            {sheetOpen && (
                <div className="fixed inset-0 z-50 flex flex-col bg-slate-950">
                    <div className="flex justify-between items-center p-4 border-b border-slate-800">
                        <h2 className="text-lg font-bold text-white flex items-center gap-2">
                            <Settings className="w-5 h-5 text-cyan-400" /> Settings
                        </h2>
                        <button onClick={() => setSheetOpen(false)} className="p-2 text-slate-400">
                            <X className="w-6 h-6" />
                        </button>
                    </div>

                    <div className="p-4 flex-1 overflow-y-auto">
                        {/* Location Select */}
                        {['live', 'historical'].includes(activeTab) && (
                            <div className="mb-6">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2 mb-2">
                                    <MapPin className="w-4 h-4" /> Location Array
                                </label>
                                <select
                                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white appearance-none"
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
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2 mb-2">
                                    <Layers className="w-4 h-4" /> Parameters
                                </label>
                                <div className="grid grid-cols-2 gap-2">
                                    {PARAMETERS.map(param => (
                                        <button
                                            key={param.key}
                                            onClick={() => toggleParam(param.key)}
                                            className={`p-3 rounded-xl border text-left text-sm font-medium transition-colors ${activeParams.includes(param.key)
                                                    ? 'bg-cyan-950/40 border-cyan-500/50 text-cyan-300'
                                                    : 'bg-slate-900 border-slate-800 text-slate-400'
                                                }`}
                                        >
                                            <div style={{ color: activeParams.includes(param.key) ? param.color : '' }}>{param.label}</div>
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
                            className="w-full py-3 rounded-xl bg-slate-800 border border-slate-700 text-white font-medium flex items-center justify-center gap-2 mt-4"
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
