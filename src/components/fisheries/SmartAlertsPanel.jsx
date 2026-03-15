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
            border: 'border-l-[#f87171]',
            iconBg: 'bg-[#2a0505]',
            iconColor: 'text-[#f87171]',
            iconText: '!',
            nameColor: 'text-[#f87171]',
            badgeCss: 'bg-red-950 text-red-400 border-red-900',
            desc: (species) => `${species}: Critical status. Severe overfishing. Immediate action required.`
        };
        if (priority === 'HIGH') return {
            border: 'border-l-[#fb923c]',
            iconBg: 'bg-[#1e1000]',
            iconColor: 'text-[#fb923c]',
            iconText: '▲',
            nameColor: 'text-[#fb923c]',
            badgeCss: 'bg-orange-950 text-orange-400 border-orange-900',
            desc: (species, msy) => `${species}: Declining status. ${Math.round(msy)}% MSY utilization. Intervention needed.`
        };
        return {
            border: 'border-l-[#facc15]',
            iconBg: 'bg-[#1a1800]',
            iconColor: 'text-[#facc15]',
            iconText: '–',
            nameColor: 'text-[#facc15]',
            badgeCss: 'bg-yellow-950 text-yellow-400 border-yellow-900',
            desc: (species) => `${species}: Moderate risk. Monitor over next 30 days.`
        };
    };

    return (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col h-full">
            {/* Header */}
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-[9px] text-slate-600 uppercase tracking-widest font-bold">Smart Alert Prioritization</h3>
                <span className="bg-orange-950 text-orange-400 border border-orange-900 text-[8px] font-bold px-2 py-0.5 rounded">
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
                            <div key={idx} className={`bg-[#060f1e] flex gap-2 p-[8px_9px] rounded-[7px] border-l-[3px] border-t border-r border-b border-t-slate-800 border-r-slate-800 border-b-slate-800 ${style.border}`}>

                                {/* 1. Icon */}
                                <div className={`shrink-0 w-[18px] h-[18px] rounded-full flex items-center justify-center text-[10px] font-bold ${style.iconBg} ${style.iconColor}`}>
                                    {style.iconText}
                                </div>

                                {/* 2. Middle Block */}
                                <div className="flex-1 flex flex-col justify-center">
                                    <div className={`text-[11px] font-bold leading-none mb-1 ${style.nameColor}`}>
                                        {a.species} {protectedSp && '🛡️'}
                                    </div>
                                    <div className="text-[9px] text-[#4a6a8a] leading-[1.4] mb-1.5">
                                        {style.desc(a.species, msyPercent)}
                                    </div>
                                    <div className="flex gap-1 flex-wrap">
                                        <span className="bg-blue-950/40 text-blue-400 border border-blue-900/50 text-[9px] px-1.5 py-[1px] rounded">H: {Math.round(health)}%</span>
                                        <span className={`${msyPercent > 90 ? 'bg-red-950/40 text-red-400 border-red-900/50' : 'bg-orange-950/40 text-orange-400 border-orange-900/50'} border text-[9px] px-1.5 py-[1px] rounded`}>MSY: {Math.round(msyPercent)}%</span>
                                        {trend.toLowerCase().includes('declin') && <span className="bg-yellow-950/40 border border-yellow-900/50 text-yellow-400 text-[9px] px-1.5 py-[1px] rounded">Declining</span>}
                                        {trend.toLowerCase().includes('critical') && <span className="bg-red-950/40 border border-red-900/50 text-red-400 text-[9px] px-1.5 py-[1px] rounded">Critical</span>}
                                        {a.season_open === false && <span className="bg-green-950/40 border border-green-900/50 text-green-400 text-[9px] px-1.5 py-[1px] rounded">Spawning Q2</span>}
                                    </div>
                                </div>

                                {/* 3. Priority Badge */}
                                <div className={`text-[8px] px-2 py-1 rounded font-bold border shrink-0 h-fit ${style.badgeCss}`}>
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
