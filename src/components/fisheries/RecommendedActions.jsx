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
        <div style={{
            background: '#040d1a',
            border: '0.5px solid #0d2135',
            borderRadius: 9,
            borderTop: '1.5px solid #22d3ee',
            padding: '14px',
            display: 'flex',
            flexDirection: 'column',
        }}>
            <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#0f2d44', marginBottom: 12, display: 'block' }}>Recommended Interventions</span>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10 }}>
                {actions.map((act, i) => {
                    const typeColor = act.type === 'CRITICAL' ? '#f87171' : act.type === 'WARNING' ? '#fb923c' : act.type === 'INFO' ? '#22d3ee' : '#4ade80';
                    const typeRgb   = act.type === 'CRITICAL' ? '248,113,113' : act.type === 'WARNING' ? '251,146,60' : act.type === 'INFO' ? '34,211,238' : '74,222,128';
                    return (
                        <div key={i} style={{
                            background: '#040f1f',
                            border: '0.5px solid #0d2135',
                            borderLeft: `2px solid ${typeColor}`,
                            borderRadius: 9,
                            padding: '12px 14px',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'space-between',
                            gap: 10,
                        }}>
                            <div>
                                <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 6 }}>
                                    <span style={{ fontSize: 18, lineHeight: 1, flexShrink: 0 }}>{act.icon}</span>
                                    <span style={{ fontWeight: 700, fontSize: 12, color: '#d4eef9', lineHeight: 1.3 }}>{act.title}</span>
                                </div>
                                <p style={{ fontSize: 11, color: '#2a4a62', lineHeight: 1.6 }}>{act.desc}</p>
                            </div>
                            <button
                                id={`btn-${act.actionId}`}
                                onClick={() => handleActionClick(act.actionId)}
                                style={{
                                    width: '100%', fontSize: 11, fontWeight: 700, padding: '7px',
                                    borderRadius: 7, cursor: 'pointer',
                                    background: `rgba(${typeRgb}, 0.08)`,
                                    border: `0.5px solid rgba(${typeRgb}, 0.35)`,
                                    color: typeColor,
                                    transition: 'background 0.15s',
                                    fontFamily: 'inherit',
                                }}
                                onMouseEnter={e => e.currentTarget.style.background = `rgba(${typeRgb}, 0.15)`}
                                onMouseLeave={e => e.currentTarget.style.background = `rgba(${typeRgb}, 0.08)`}
                            >
                                {act.btnText}
                            </button>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
