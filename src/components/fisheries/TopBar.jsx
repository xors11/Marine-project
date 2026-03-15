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
                <div className="bg-red-950 border border-red-900 text-red-400 px-3 py-1.5 rounded-lg flex items-center gap-2 font-bold text-[11px] uppercase tracking-widest shadow-lg">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-400" style={{ animation: 'zpulse 1.5s infinite' }} />
                    HIGH EXPLOITATION ZONE
                </div>

                {/* Clickable Pills */}
                <div className="flex flex-wrap gap-2">
                    {regions.map(r => {
                        const active = activeRegion === r;
                        return (
                            <button
                                key={r}
                                onClick={() => setActiveRegion(r)}
                                className={`border rounded-full px-3 py-1 text-xs cursor-pointer transition-colors ${active
                                    ? 'bg-blue-950 border-blue-600 text-blue-300 font-semibold'
                                    : 'bg-slate-900 border-slate-700 text-slate-500 hover:border-slate-500 hover:text-slate-400'
                                    }`}
                            >
                                {r} {regionCounts && regionCounts[r] !== undefined ? `(${regionCounts[r]})` : ''}
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
