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
            accentColor: 'var(--color-danger)',
            rgbBorder: '242, 102, 91',
            iconText: '!',
            desc: (species) => `${species}: Critical status. Severe overfishing. Immediate action required.`
        };
        if (priority === 'HIGH') return {
            accentColor: 'var(--color-amber)',
            rgbBorder: '240, 169, 78',
            iconText: '▲',
            desc: (species, msy) => `${species}: Declining status. ${Math.round(msy)}% MSY utilization. Intervention needed.`
        };
        return {
            accentColor: 'var(--color-warning)',
            rgbBorder: '240, 169, 78',
            iconText: '–',
            desc: (species) => `${species}: Moderate risk. Monitor over next 30 days.`
        };
    };

    return (
        <div
            className="card flex flex-col h-full"
            style={{
                borderTop: '2px solid var(--color-danger)',
            }}
        >
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--color-abyss-400)' }}>Smart Alert Prioritization</span>
                <span style={{
                    fontSize: 9, padding: '2px 8px', borderRadius: 99, fontWeight: 700,
                    borderLeft: '2px solid var(--color-amber)',
                    background: 'rgba(240, 169, 78, 0.08)',
                    border: '1px solid rgba(240, 169, 78, 0.2)',
                    borderLeftWidth: 2,
                    color: 'var(--color-amber)',
                }}>
                    {allAlerts.length} active · {criticalCount} critical
                </span>
            </div>

            {/* List */}
            <div className="overflow-y-auto pr-1 space-y-[5px] custom-scrollbar max-h-[300px]">
                {alerts.length === 0 ? (
                    <div className="text-center py-4 text-xs text-[var(--color-abyss-400)] italic">No active alerts. System nominal.</div>
                ) : (
                    alerts.map((a, idx) => {
                        const style = getAlertStyle(a.priority);
                        const msyPercent = a.msy || 0;
                        const health = a.stock_health_percent || 0;
                        const trend = a.trend || 'Stable';
                        const protectedSp = a.protected;

                        return (
                            <div key={idx} style={{
                                background: 'var(--color-abyss-950)',
                                borderLeft: `2px solid ${style.accentColor}`,
                                border: `1px solid rgba(${style.rgbBorder}, 0.2)`,
                                borderLeftWidth: 2,
                                borderRadius: 7,
                                padding: '8px 10px',
                                display: 'flex',
                                gap: 8,
                            }}>

                                {/* 1. Icon */}
                                <div style={{
                                    flexShrink: 0, width: 18, height: 18, borderRadius: '50%',
                                    display: 'flex', alignItems: 'center', justifycontent: 'center',
                                    fontSize: 10, fontWeight: 800,
                                    background: `rgba(${style.rgbBorder}, 0.1)`,
                                    color: style.accentColor,
                                }}>
                                    {style.iconText}
                                </div>

                                {/* 2. Middle Block */}
                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifycontent: 'center' }}>
                                    <div style={{ fontSize: 11, fontWeight: 800, lineHeight: 1, marginBottom: 4, color: style.accentColor }}>
                                        {a.species} {protectedSp && '🛡️'}
                                    </div>
                                    <div style={{ fontSize: 9, color: 'var(--color-abyss-400)', lineHeight: 1.5, marginBottom: 6 }}>
                                        {style.desc(a.species, msyPercent)}
                                    </div>
                                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                                        <span style={{ fontSize: 9, padding: '1px 6px', borderRadius: 99, background: 'rgba(45, 212, 191, 0.08)', border: '1px solid rgba(45, 212, 191, 0.2)', color: 'var(--color-accent)' }}>H: {Math.round(health)}%</span>
                                        <span style={{ fontSize: 9, padding: '1px 6px', borderRadius: 99, background: msyPercent > 90 ? 'rgba(242, 102, 91, 0.08)' : 'rgba(240, 169, 78, 0.08)', border: msyPercent > 90 ? '1px solid rgba(242, 102, 91, 0.2)' : '1px solid rgba(240, 169, 78, 0.2)', color: msyPercent > 90 ? 'var(--color-danger)' : 'var(--color-amber)' }}>MSY: {Math.round(msyPercent)}%</span>
                                        {trend.toLowerCase().includes('declin') && <span style={{ fontSize: 9, padding: '1px 6px', borderRadius: 99, background: 'rgba(240, 169, 78, 0.08)', border: '1px solid rgba(240, 169, 78, 0.2)', color: 'var(--color-amber)' }}>Declining</span>}
                                        {trend.toLowerCase().includes('critical') && <span style={{ fontSize: 9, padding: '1px 6px', borderRadius: 99, background: 'rgba(242, 102, 91, 0.08)', border: '1px solid rgba(242, 102, 91, 0.2)', color: 'var(--color-danger)' }}>Critical</span>}
                                        {a.season_open === false && <span style={{ fontSize: 9, padding: '1px 6px', borderRadius: 99, background: 'rgba(111, 207, 151, 0.08)', border: '1px solid rgba(111, 207, 151, 0.2)', color: 'var(--color-green)' }}>Spawning Q2</span>}
                                    </div>
                                </div>

                                {/* 3. Priority Badge */}
                                <div style={{
                                    fontSize: 8, padding: '2px 7px', borderRadius: 99, fontWeight: 800,
                                    background: `rgba(${style.rgbBorder}, 0.1)`,
                                    border: `1px solid rgba(${style.rgbBorder}, 0.3)`,
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
                    <div className="text-center py-2 text-[10px] text-[var(--color-abyss-400)] italic mt-2">
                        ... and {hiddenCount} more alerts
                    </div>
                )}
            </div>
        </div>
    );
}
