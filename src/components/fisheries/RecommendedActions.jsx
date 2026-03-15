import React, { useMemo } from 'react';

export default function RecommendedActions({ species, msyUtilizationFn, critThreshold, highThreshold }) {
    if (!species || species.length === 0) return null;

    // STEP 9: Rule-based inference engine for operational mitigation tasks
    const actions = useMemo(() => {
        const rules = [];

        // 1. Critical species immediate moratorium
        const critSpecies = species.filter(s => s.stock_health_percent < critThreshold);
        if (critSpecies.length > 0) {
            rules.push({
                type: 'CRITICAL',
                title: 'Immediate Moratorium Recommended',
                desc: `${critSpecies.length} species have dropped below the ${critThreshold}% survival threshold. Recommend immediate season closure for ${critSpecies[0].region} region targeting ${critSpecies.slice(0, 3).map(s => s.species).join(', ')}${critSpecies.length > 3 ? '...' : ''}.`,
                btnText: 'Issue Closure Mandate',
                btnColor: 'bg-red-500 hover:bg-red-400 text-white',
                icon: '🛑',
                actionId: 'moratorium'
            });
        }

        // 2. High MSY quota reductions
        const highMsy = species.filter(s => msyUtilizationFn(s) > 95);
        if (highMsy.length > 0) {
            rules.push({
                type: 'WARNING',
                title: 'Enact Emergency Quota Reductions',
                desc: `${highMsy.length} commercial targets are exceeding 95% MSY capacity. Recommend immediate 15% quota reduction for active fleets processing these stocks.`,
                btnText: 'Draft Quota Revision',
                btnColor: 'bg-orange-500 hover:bg-orange-400 text-white',
                icon: '📉',
                actionId: 'quota_red'
            });
        }

        // 3. Spawning area protection (synthetic trigger)
        const decliningProtected = species.filter(s => s.trend === 'Declining' && s.protected);
        if (decliningProtected.length > 0) {
            rules.push({
                type: 'INFO',
                title: 'Expand Protected Zones',
                desc: `Protected species indicators show declining trends (${decliningProtected.length} affected). Recommend expanding marine protected area (MPA) buffer zones by 5nm.`,
                btnText: 'Review MPA Overlay',
                btnColor: 'bg-blue-500 hover:bg-blue-400 text-white',
                icon: '🛡️',
                actionId: 'mpa_expand'
            });
        }

        // 4. Default nominal state
        if (rules.length === 0) {
            rules.push({
                type: 'NOMINAL',
                title: 'System Nominal. No Emergency Actions Required.',
                desc: 'All monitored fisheries remain within acceptable operational thresholds parameters.',
                btnText: 'Acknowledge',
                btnColor: 'bg-slate-600 hover:bg-slate-500 text-white',
                icon: '✓',
                actionId: 'ack_nom'
            });
        }

        return rules;
    }, [species, msyUtilizationFn, critThreshold]);

    const handleActionClick = (actionId) => {
        console.log(`Executing Action Request: ${actionId}`);
        // Visual feedback
        const el = document.getElementById(`btn-${actionId}`);
        if (el) {
            const orig = el.innerText;
            el.innerText = 'Request Sent ✓';
            setTimeout(() => el.innerText = orig, 2000);
        }
    };

    return (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col mt-1">
            <h3 className="text-[9px] text-slate-600 uppercase tracking-widest font-bold mb-4">Recommended Interventions</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {actions.map((act, i) => (
                    <div key={i} className="bg-[#060f1e] border border-slate-700/50 p-4 rounded-lg flex flex-col justify-between h-full hover:border-slate-600 transition-colors">
                        <div>
                            <div className="flex gap-2 items-center mb-2">
                                <span className="text-xl">{act.icon}</span>
                                <h4 className="font-bold text-sm text-[#e2e8f0]">{act.title}</h4>
                            </div>
                            <p className="text-xs text-slate-400 leading-relaxed mb-4">
                                {act.desc}
                            </p>
                        </div>
                        <button
                            id={`btn-${act.actionId}`}
                            onClick={() => handleActionClick(act.actionId)}
                            className={`w-full text-xs font-bold py-2 rounded shadow-lg cursor-pointer transition-colors ${act.btnColor}`}
                        >
                            {act.btnText}
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
}
