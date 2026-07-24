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
                    borderLeft: '2px solid var(--color-danger)',
                    background: 'rgba(242, 102, 91, 0.08)',
                    border: '1px solid rgba(242, 102, 91, 0.2)',
                    borderLeftWidth: 2,
                    padding: '5px 12px',
                    borderRadius: 7,
                    display: 'flex', alignItems: 'center', gap: 8,
                    fontWeight: 800, fontSize: 10,
                    color: 'var(--color-danger)',
                    textTransform: 'uppercase', letterSpacing: '0.1em',
                }}>
                    <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--color-danger)', animation: 'zpulse 1.5s infinite', flexShrink: 0 }} />
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
                                    border: active ? '1px solid rgba(45, 212, 191, 0.4)' : '1px solid var(--color-abyss-800)',
                                    background: active ? 'rgba(45, 212, 191, 0.08)' : 'var(--color-abyss-950)',
                                    color: active ? 'var(--color-accent)' : 'var(--color-abyss-400)',
                                    transition: 'all 0.15s',
                                    fontFamily: 'inherit',
                                }}
                                onMouseEnter={e => !active && (e.currentTarget.style.color = 'var(--color-accent)')}
                                onMouseLeave={e => !active && (e.currentTarget.style.color = 'var(--color-abyss-400)')}
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
                        ? 'bg-[rgba(45,212,191,0.08)] border-[rgba(45,212,191,0.3)] text-[var(--color-accent)]'
                        : 'bg-[var(--color-abyss-950)] border-[var(--color-abyss-800)] text-[var(--color-abyss-300)] hover:border-[var(--color-accent)]'
                        }`}
                >
                    {isSimulating ? "Simulation Active ✓" : "Simulate 10% Reduction"}
                </button>

                {/* Button 2 */}
                <button
                    onClick={cycleSst}
                    className={`text-xs px-3 py-1.5 rounded-lg border cursor-pointer transition-all duration-150 ${sstScenario === 'normal' ? 'bg-[var(--color-abyss-950)] border-[var(--color-abyss-800)] text-[var(--color-abyss-300)] hover:border-[var(--color-accent)]' :
                        sstScenario === 'low' ? 'bg-[rgba(157,140,245,0.08)] border-[rgba(157,140,245,0.3)] text-[var(--color-violet)]' :
                            'bg-[rgba(242,102,91,0.08)] border-[rgba(242,102,91,0.3)] text-[var(--color-danger)]'
                        }`}
                >
                    {sstScenario === 'normal' ? "SST: Normal" : sstScenario === 'low' ? "SST: Low ▼" : "SST: High ▲"}
                </button>

                {/* Button 3 */}
                <button
                    onClick={() => setShowAlertSettings(!showAlertSettings)}
                    className="bg-[var(--color-abyss-950)] border border-[var(--color-abyss-800)] text-[var(--color-abyss-300)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] text-xs px-3 py-1.5 rounded-lg cursor-pointer transition-all duration-150"
                >
                    Alert Settings
                </button>

                {/* Button 4 */}
                <button
                    onClick={handleExportPDF}
                    disabled={isExporting}
                    className="bg-[var(--color-abyss-950)] border border-[var(--color-abyss-800)] text-[var(--color-abyss-300)] hover:border-[var(--color-violet)] hover:text-[var(--color-violet)] disabled:opacity-50 text-xs px-3 py-1.5 rounded-lg cursor-pointer transition-all duration-150"
                >
                    {isExporting ? "Generating..." : "Export PDF"}
                </button>
            </div>
        </div>
    );
}
