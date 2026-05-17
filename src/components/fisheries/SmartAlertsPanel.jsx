import React from 'react';

export default function SmartAlertsPanel({ species, msyUtilizationFn, critThreshold, highThreshold, msyAlertThreshold }) {
    if (!species) return null;

    // STEP 10: Alert generation based on defined mapping
    const generateAlerts = () => {
        const generated = [];
        species.forEach(sp => {
            const health = sp.stock_health_percent;
            const msy = msyUtilizationFn(sp);

            if (health < 50 || msy > 95) {
                generated.push({ ...sp, priority: 'CRITICAL', msy });
            } else if (health < 65 || msy > 90) {
                generated.push({ ...sp, priority: 'HIGH', msy });
            } else if (health < 75 || msy > 80) {
                generated.push({ ...sp, priority: 'MEDIUM', msy });
            }
        });

        // Sort: CRITICAL first, HIGH second, MEDIUM third, then health ascending
        const order = { 'CRITICAL': 0, 'HIGH': 1, 'MEDIUM': 2 };
        return generated.sort((a, b) => {
            if (order[a.priority] !== order[b.priority]) {
                return order[a.priority] - order[b.priority];
            }
            return a.stock_health_percent - b.stock_health_percent;
        });
    };

    const allAlerts = generateAlerts();
    const criticalCount = allAlerts.filter(a => a.priority === 'CRITICAL').length;
    const alerts = allAlerts.slice(0, 20);
    const hiddenCount = Math.max(0, allAlerts.length - 20);

    const getAlertStyle = (priority) => {
        if (priority === 'CRITICAL') return {
            accentColor: '#f87171',
            rgbBorder: '248,113,113',
            iconText: '!',
            desc: (species) => `${species}: Critical status. Severe overfishing. Immediate action required.`
        };
        if (priority === 'HIGH') return {
            accentColor: '#fb923c',
            rgbBorder: '251,146,60',
            iconText: '▲',
            desc: (species, msy) => `${species}: Declining status. ${Math.round(msy)}% MSY utilization. Intervention needed.`
        };
        return {
            accentColor: '#facc15',
            rgbBorder: '250,204,21',
            iconText: '–',
            desc: (species) => `${species}: Moderate risk. Monitor over next 30 days.`
        };
    };

    return (
        <div style={{
            background: '#040d1a',
            border: '0.5px solid #0d2135',
            borderRadius: 9,
            borderTop: '1.5px solid #f87171',
            padding: '14px',
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
        }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#0f2d44' }}>Smart Alert Prioritization</span>
                <span style={{
                    fontSize: 9, padding: '2px 8px', borderRadius: 99, fontWeight: 700,
                    borderLeft: '2px solid #fb923c',
                    background: 'rgba(251,146,60,0.07)',
                    border: '0.5px solid rgba(251,146,60,0.25)',
                    borderLeftWidth: 2,
                    color: '#fb923c',
                }}>
                    {allAlerts.length} active · {criticalCount} critical
                </span>
            </div>

            {/* List */}
            <div className="overflow-y-auto pr-1 space-y-[5px] custom-scrollbar max-h-[300px]">
                {alerts.length === 0 ? (
                    <div className="text-center py-4 text-xs text-slate-500 italic">No active alerts. System nominal.</div>
                ) : (
                    alerts.map((a, idx) => {
                        const style = getAlertStyle(a.priority);
                        const msyPercent = a.msy || 0;
                        const health = a.stock_health_percent || 0;
                        const trend = a.trend || 'Stable';
                        const protectedSp = a.protected;

                        return (
                            <div key={idx} style={{
                                background: '#040f1f',
                                borderLeft: `2px solid ${style.accentColor}`,
                                border: `0.5px solid rgba(${style.rgbBorder}, 0.2)`,
                                borderLeftWidth: 2,
                                borderRadius: 7,
                                padding: '8px 10px',
                                display: 'flex',
                                gap: 8,
                            }}>

                                {/* 1. Icon */}
                                <div style={{
                                    flexShrink: 0, width: 18, height: 18, borderRadius: '50%',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: 10, fontWeight: 800,
                                    background: `rgba(${style.rgbBorder}, 0.1)`,
                                    color: style.accentColor,
                                }}>
                                    {style.iconText}
                                </div>

                                {/* 2. Middle Block */}
                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                                    <div style={{ fontSize: 11, fontWeight: 800, lineHeight: 1, marginBottom: 4, color: style.accentColor }}>
                                        {a.species} {protectedSp && '🛡️'}
                                    </div>
                                    <div style={{ fontSize: 9, color: '#2a4a62', lineHeight: 1.5, marginBottom: 6 }}>
                                        {style.desc(a.species, msyPercent)}
                                    </div>
                                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                                        <span style={{ fontSize: 9, padding: '1px 6px', borderRadius: 99, background: 'rgba(34,211,238,0.07)', border: '0.5px solid rgba(34,211,238,0.2)', color: '#22d3ee' }}>H: {Math.round(health)}%</span>
                                        <span style={{ fontSize: 9, padding: '1px 6px', borderRadius: 99, background: msyPercent > 90 ? 'rgba(248,113,113,0.07)' : 'rgba(251,146,60,0.07)', border: msyPercent > 90 ? '0.5px solid rgba(248,113,113,0.25)' : '0.5px solid rgba(251,146,60,0.25)', color: msyPercent > 90 ? '#f87171' : '#fb923c' }}>MSY: {Math.round(msyPercent)}%</span>
                                        {trend.toLowerCase().includes('declin') && <span style={{ fontSize: 9, padding: '1px 6px', borderRadius: 99, background: 'rgba(250,204,21,0.07)', border: '0.5px solid rgba(250,204,21,0.25)', color: '#facc15' }}>Declining</span>}
                                        {trend.toLowerCase().includes('critical') && <span style={{ fontSize: 9, padding: '1px 6px', borderRadius: 99, background: 'rgba(248,113,113,0.07)', border: '0.5px solid rgba(248,113,113,0.25)', color: '#f87171' }}>Critical</span>}
                                        {a.season_open === false && <span style={{ fontSize: 9, padding: '1px 6px', borderRadius: 99, background: 'rgba(74,222,128,0.07)', border: '0.5px solid rgba(74,222,128,0.25)', color: '#4ade80' }}>Spawning Q2</span>}
                                    </div>
                                </div>

                                {/* 3. Priority Badge */}
                                <div style={{
                                    fontSize: 8, padding: '2px 7px', borderRadius: 99, fontWeight: 800,
                                    background: `rgba(${style.rgbBorder}, 0.1)`,
                                    border: `0.5px solid rgba(${style.rgbBorder}, 0.3)`,
                                    color: style.accentColor,
                                    flexShrink: 0, alignSelf: 'flex-start',
                                    letterSpacing: '0.08em', textTransform: 'uppercase',
                                }}>
                                    {a.priority}
                                </div>
                            </div>
                        );
                    })
                )}
                {hiddenCount > 0 && (
                    <div className="text-center py-2 text-[10px] text-slate-500 italic mt-2">
                        ... and {hiddenCount} more alerts
                    </div>
                )}
            </div>
        </div>
    );
}
