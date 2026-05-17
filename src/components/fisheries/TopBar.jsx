import React from 'react';

export default function TopBar({
    activeRegion, setActiveRegion, regions, regionCounts,
    isSimulating, setIsSimulating,
    sstScenario, setSstScenario,
    showAlertSettings, setShowAlertSettings,
    isExporting, handleExportPDF
}) {
    const cycleSst = () => {
        if (sstScenario === 'normal') setSstScenario('low');
        else if (sstScenario === 'low') setSstScenario('high');
        else setSstScenario('normal');
    };

    return (
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6 gap-4">

            <div className="flex items-center gap-4 flex-wrap">
                {/* Zone Badge */}
                <div style={{
                    borderLeft: '2px solid #f87171',
                    background: 'rgba(248,113,113,0.07)',
                    border: '0.5px solid rgba(248,113,113,0.2)',
                    borderLeftWidth: 2,
                    padding: '5px 12px',
                    borderRadius: 7,
                    display: 'flex', alignItems: 'center', gap: 8,
                    fontWeight: 800, fontSize: 10,
                    color: '#f87171',
                    textTransform: 'uppercase', letterSpacing: '0.1em',
                }}>
                    <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#f87171', animation: 'zpulse 1.5s infinite', flexShrink: 0 }} />
                    High Exploitation Zone
                </div>

                {/* Clickable Pills */}
                <div className="flex flex-wrap gap-2">
                    {regions.map(r => {
                        const active = activeRegion === r;
                        return (
                            <button
                                key={r}
                                onClick={() => setActiveRegion(r)}
                                style={{
                                    padding: '4px 12px', borderRadius: 99, fontSize: 11, cursor: 'pointer',
                                    fontWeight: active ? 700 : 400,
                                    border: active ? '0.5px solid rgba(34,211,238,0.4)' : '0.5px solid #0d2135',
                                    background: active ? 'rgba(34,211,238,0.08)' : '#040f1f',
                                    color: active ? '#22d3ee' : '#2a4a62',
                                    transition: 'all 0.15s',
                                    fontFamily: 'inherit',
                                }}
                                onMouseEnter={e => !active && (e.currentTarget.style.color = '#4db8e8')}
                                onMouseLeave={e => !active && (e.currentTarget.style.color = '#2a4a62')}
                            >
                                {r}{regionCounts && regionCounts[r] !== undefined ? ` (${regionCounts[r]})` : ''}
                            </button>
                        );
                    })}
                </div>
            </div>

            <div className="flex flex-wrap gap-2 items-center">
                {/* Action Buttons */}

                {/* Button 1 */}
                <button
                    onClick={() => setIsSimulating(!isSimulating)}
                    className={`text-xs px-3 py-1.5 rounded-lg border cursor-pointer transition-all duration-150 ${isSimulating
                        ? 'bg-cyan-950 border-cyan-700 text-cyan-400'
                        : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-500'
                        }`}
                >
                    {isSimulating ? "Simulation Active ✓" : "Simulate 10% Reduction"}
                </button>

                {/* Button 2 */}
                <button
                    onClick={cycleSst}
                    className={`text-xs px-3 py-1.5 rounded-lg border cursor-pointer transition-all duration-150 ${sstScenario === 'normal' ? 'bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-500' :
                        sstScenario === 'low' ? 'bg-blue-950 border-blue-700 text-blue-400' :
                            'bg-red-950 border-red-700 text-red-400'
                        }`}
                >
                    {sstScenario === 'normal' ? "SST: Normal" : sstScenario === 'low' ? "SST: Low ▼" : "SST: High ▲"}
                </button>

                {/* Button 3 */}
                <button
                    onClick={() => setShowAlertSettings(!showAlertSettings)}
                    className="bg-slate-900 border border-slate-700 text-slate-400 hover:border-cyan-700 hover:text-cyan-400 text-xs px-3 py-1.5 rounded-lg cursor-pointer transition-all duration-150"
                >
                    Alert Settings
                </button>

                {/* Button 4 */}
                <button
                    onClick={handleExportPDF}
                    disabled={isExporting}
                    className="bg-slate-900 border border-slate-700 text-slate-400 hover:border-violet-700 hover:text-violet-400 disabled:opacity-50 text-xs px-3 py-1.5 rounded-lg cursor-pointer transition-all duration-150"
                >
                    {isExporting ? "Generating..." : "Export PDF"}
                </button>
            </div>
        </div>
    );
}
