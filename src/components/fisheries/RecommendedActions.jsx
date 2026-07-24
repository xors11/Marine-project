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
        <div
            className="card flex flex-col h-full"
            style={{
                borderTop: '2px solid var(--color-accent)',
            }}
        >
            <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--color-abyss-400)', marginBottom: 12, display: 'block' }}>Recommended Interventions</span>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10 }}>
                {actions.map((act, i) => {
                    const typeColor = act.type === 'CRITICAL' ? 'var(--color-danger)' : act.type === 'WARNING' ? 'var(--color-amber)' : act.type === 'INFO' ? 'var(--color-accent)' : 'var(--color-green)';
                    const typeRgb   = act.type === 'CRITICAL' ? '242,102,91' : act.type === 'WARNING' ? '240,169,78' : act.type === 'INFO' ? '45,212,191' : '111,207,151';
                    return (
                        <div key={i} style={{
                            background: 'var(--color-abyss-950)',
                            border: '1px solid var(--color-abyss-800)',
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
                                    <span style={{ fontWeight: 700, fontSize: 12, color: 'var(--color-abyss-100)', lineHeight: 1.3 }}>{act.title}</span>
                                </div>
                                <p style={{ fontSize: 11, color: 'var(--color-abyss-400)', lineHeight: 1.6 }}>{act.desc}</p>
                            </div>
                            <button
                                id={`btn-${act.actionId}`}
                                onClick={() => handleActionClick(act.actionId)}
                                style={{
                                    width: '100%', fontSize: 11, fontWeight: 700, padding: '7px',
                                    borderRadius: 7, cursor: 'pointer',
                                    background: `rgba(${typeRgb}, 0.08)`,
                                    border: `1px solid rgba(${typeRgb}, 0.35)`,
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
