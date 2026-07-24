import React, { useState, useMemo } from 'react';

const SORT_KEYS = {
    species: (a, b) => a.species.localeCompare(b.species),
    health: (a, b) => a.stock_health_percent - b.stock_health_percent,
    msy: (a, b, fn) => fn(a) - fn(b),
    catch: (a, b) => (a.current_catch_tonnes || 0) - (b.current_catch_tonnes || 0),
    trend: (a, b) => {
        const order = { Critical: 0, Declining: 1, Stable: 2, Increasing: 3 };
        return (order[a.trend] ?? 2) - (order[b.trend] ?? 2);
    },
};

const getHealthColor = (h) => {
    if (h < 50) return 'var(--color-danger)';
    if (h < 65) return 'var(--color-amber)';
    if (h < 75) return 'var(--color-warning)';
    return 'var(--color-green)';
};

const getStatusProps = (h) => {
    if (h < 50) return { label: 'CRIT', color: 'var(--color-danger)', bg: 'rgba(242, 102, 91, 0.08)', border: 'rgba(242, 102, 91, 0.25)' };
    if (h < 65) return { label: 'HIGH', color: 'var(--color-amber)', bg: 'rgba(240, 169, 78, 0.08)', border: 'rgba(240, 169, 78, 0.25)' };
    if (h < 75) return { label: 'MOD',  color: 'var(--color-warning)', bg: 'rgba(240, 169, 78, 0.04)',  border: 'rgba(240, 169, 78, 0.15)' };
    return           { label: 'SAFE', color: 'var(--color-green)', bg: 'rgba(111, 207, 151, 0.08)',  border: 'rgba(111, 207, 151, 0.25)' };
};

const getTrendProps = (trend) => {
    if (!trend) return { icon: '→', color: 'var(--color-abyss-400)' };
    const t = trend.toLowerCase();
    if (t === 'critical' || t.includes('severe')) return { icon: '↓↓', color: 'var(--color-danger)' };
    if (t === 'declining')  return { icon: '↓',  color: 'var(--color-amber)' };
    if (t === 'increasing') return { icon: '↑',  color: 'var(--color-green)' };
    return { icon: '→', color: 'var(--color-abyss-400)' };
};

// ─── Inline species detail drawer ─────────────────────────────────────────────
function SpeciesDrawer({ s, msyUtilizationFn, onClose }) {
    const health   = s.stock_health_percent || 0;
    const msy      = msyUtilizationFn(s);
    const hColor   = getHealthColor(health);
    const msyColor = msy > 95 ? 'var(--color-danger)' : msy > 80 ? 'var(--color-amber)' : 'var(--color-green)';
    const catchRatio = s.msy_tonnes > 0 ? Math.min(100, (s.current_catch_tonnes / s.msy_tonnes) * 100) : 0;
    const trend    = getTrendProps(s.trend);
    const status   = getStatusProps(health);

    const rows = [
        { label: 'Scientific Name', value: s.scientific_name || '—' },
        { label: 'Region',          value: s.region || '—' },
        { label: 'Current Catch',   value: s.current_catch_tonnes != null ? `${s.current_catch_tonnes.toLocaleString()} t` : '—' },
        { label: 'MSY Target',      value: s.msy_tonnes != null ? `${s.msy_tonnes.toLocaleString()} t` : '—' },
        { label: 'Catch vs MSY',    value: `${msy}%`, highlight: msy > 95 ? 'var(--color-danger)' : null },
        { label: 'Trend',           value: s.trend || 'Stable', highlight: trend.color },
        { label: 'Protected',       value: s.protected ? 'Yes 🛡️' : 'No' },
        { label: 'Season',          value: s.season_open === false ? 'Closed (Spawning)' : 'Open' },
    ];

    return (
        <div
            style={{
                gridColumn: '1 / -1',
                background: 'var(--color-abyss-950)',
                border: '1px solid var(--color-abyss-800)',
                borderLeft: `2px solid ${hColor}`,
                borderRadius: 9,
                padding: '14px 16px',
                marginTop: 2,
                marginBottom: 4,
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
                animation: 'drawerSlideIn 0.18s ease',
            }}
        >
            <style>{`
                @keyframes drawerSlideIn {
                    from { opacity: 0; transform: translateY(-6px); }
                    to   { opacity: 1; transform: translateY(0); }
                }
            `}</style>

            {/* Drawer header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                    <div style={{ fontWeight: 800, fontSize: 13, color: hColor }}>{s.species}</div>
                    <div style={{ fontSize: 10, color: 'var(--color-abyss-400)', fontStyle: 'italic', marginTop: 1 }}>{s.scientific_name}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{
                        fontSize: 9, fontWeight: 800, padding: '2px 8px', borderRadius: 99,
                        background: status.bg, border: `0.5px solid ${status.border}`, color: status.color,
                        letterSpacing: '0.08em', textTransform: 'uppercase',
                    }}>{status.label}</span>
                    <button
                        onClick={onClose}
                        style={{ background: 'none', border: 'none', color: 'var(--color-abyss-400)', cursor: 'pointer', fontSize: 14, lineHeight: 1 }}
                    >✕</button>
                </div>
            </div>

            {/* Visual bars */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {/* Health bar */}
                <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--color-abyss-400)' }}>Stock Health</span>
                        <span style={{ fontSize: 11, fontWeight: 700, color: hColor }}>{Math.round(health)}%</span>
                    </div>
                    <div style={{ height: 6, background: 'var(--color-abyss-800)', borderRadius: 99, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${Math.min(100, health)}%`, background: hColor, borderRadius: 99, transition: 'width 0.4s ease' }} />
                    </div>
                    {/* Threshold markers */}
                    <div style={{ position: 'relative', height: 8, marginTop: 2 }}>
                        <div style={{ position: 'absolute', left: '50%', top: 0, width: 1, height: 6, background: 'var(--color-danger)', opacity: 0.5 }} title="50% critical" />
                        <div style={{ position: 'absolute', left: '75%', top: 0, width: 1, height: 6, background: 'var(--color-green)', opacity: 0.5 }} title="75% safe" />
                        <span style={{ position: 'absolute', left: '48%', top: 2, fontSize: 7, color: 'var(--color-danger)', opacity: 0.7 }}>50</span>
                        <span style={{ position: 'absolute', left: '73%', top: 2, fontSize: 7, color: 'var(--color-green)', opacity: 0.7 }}>75</span>
                    </div>
                </div>

                {/* MSY bar */}
                <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--color-abyss-400)' }}>MSY Utilization</span>
                        <span style={{ fontSize: 11, fontWeight: 700, color: msyColor }}>{msy}%</span>
                    </div>
                    <div style={{ height: 6, background: 'var(--color-abyss-800)', borderRadius: 99, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${Math.min(100, catchRatio)}%`, background: msyColor, borderRadius: 99, transition: 'width 0.4s ease' }} />
                    </div>
                    <div style={{ position: 'relative', height: 8, marginTop: 2 }}>
                        <div style={{ position: 'absolute', left: '90%', top: 0, width: 1, height: 6, background: 'var(--color-danger)', opacity: 0.5 }} title="90% warning" />
                        <span style={{ position: 'absolute', left: '88%', top: 2, fontSize: 7, color: 'var(--color-danger)', opacity: 0.7 }}>90</span>
                    </div>
                </div>
            </div>

            {/* Catch vs MSY comparison */}
            <div style={{ display: 'flex', gap: 10 }}>
                <div style={{ flex: 1, background: 'var(--color-abyss-950)', border: '1px solid var(--color-abyss-800)', borderRadius: 7, padding: '8px 10px' }}>
                    <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--color-abyss-400)', marginBottom: 3 }}>Current Catch</div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--color-abyss-100)' }}>{s.current_catch_tonnes != null ? s.current_catch_tonnes.toLocaleString() : '—'}<span style={{ fontSize: 9, color: 'var(--color-abyss-400)', marginLeft: 3 }}>t</span></div>
                </div>
                <div style={{ flex: 1, background: 'var(--color-abyss-950)', border: '1px solid var(--color-abyss-800)', borderRadius: 7, padding: '8px 10px' }}>
                    <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--color-abyss-400)', marginBottom: 3 }}>MSY Ceiling</div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--color-abyss-100)' }}>{s.msy_tonnes != null ? s.msy_tonnes.toLocaleString() : '—'}<span style={{ fontSize: 9, color: 'var(--color-abyss-400)', marginLeft: 3 }}>t</span></div>
                </div>
                <div style={{ flex: 1, background: 'var(--color-abyss-950)', border: '1px solid var(--color-abyss-800)', borderRadius: 7, padding: '8px 10px' }}>
                    <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--color-abyss-400)', marginBottom: 3 }}>Surplus</div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: msy > 100 ? 'var(--color-danger)' : 'var(--color-green)' }}>
                        {s.msy_tonnes != null && s.current_catch_tonnes != null
                             ? `${(s.msy_tonnes - s.current_catch_tonnes).toLocaleString()}`
                             : '—'}
                        <span style={{ fontSize: 9, color: 'var(--color-abyss-400)', marginLeft: 3 }}>t</span>
                    </div>
                </div>
            </div>

            {/* Meta row */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {rows.slice(1).map(r => (
                    <span key={r.label} style={{
                        fontSize: 9, padding: '2px 7px', borderRadius: 99,
                        background: 'var(--color-abyss-900)', border: '1px solid var(--color-abyss-800)',
                        color: r.highlight || 'var(--color-accent)',
                    }}>
                        <span style={{ color: 'var(--color-abyss-400)', marginRight: 3 }}>{r.label}:</span>{r.value}
                    </span>
                ))}
            </div>
        </div>
    );
}

// ─── Column header ─────────────────────────────────────────────────────────────
function ColHeader({ label, sortKey, sortState, onSort }) {
    const active = sortState.key === sortKey;
    return (
        <button
            onClick={() => onSort(sortKey)}
            style={{
                background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
                color: active ? 'var(--color-accent)' : 'var(--color-abyss-400)',
                display: 'flex', alignItems: 'center', gap: 3,
                transition: 'color 0.15s',
            }}
        >
            {label}
            <span style={{ fontSize: 8, opacity: active ? 1 : 0.35 }}>
                {active ? (sortState.dir === 'asc' ? '↑' : '↓') : '↕'}
            </span>
        </button>
    );
}

// ─── Main component ────────────────────────────────────────────────────────────
export default function SpeciesTable({ species, msyUtilizationFn, critThreshold, highThreshold }) {
    const [showAll, setShowAll]         = useState(false);
    const [search, setSearch]           = useState('');
    const [openId, setOpenId]           = useState(null);
    const [sortState, setSortState]     = useState({ key: 'health', dir: 'asc' });

    if (!species) return null;

    const handleSort = (key) => {
        setSortState(prev =>
            prev.key === key
                ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
                : { key, dir: 'asc' }
        );
        setOpenId(null);
    };

    const filtered = useMemo(() => {
        const q = search.toLowerCase();
        return search
            ? species.filter(s => s.species?.toLowerCase().includes(q) || s.scientific_name?.toLowerCase().includes(q))
            : species;
    }, [species, search]);

    const sorted = useMemo(() => {
        const fn = SORT_KEYS[sortState.key];
        if (!fn) return filtered;
        const arr = [...filtered].sort((a, b) => {
            const v = sortState.key === 'msy' ? fn(a, b, msyUtilizationFn) : fn(a, b);
            return sortState.dir === 'asc' ? v : -v;
        });
        return arr;
    }, [filtered, sortState, msyUtilizationFn]);

    const hasMore     = sorted.length > 20;
    const displayList = (hasMore && !showAll) ? sorted.slice(0, 20) : sorted;

    return (
        <div
            className="card flex flex-col h-full"
            style={{
                borderTop: '2px solid var(--color-accent)',
            }}
        >

            {/* ── Header ── */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
                <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--color-abyss-400)' }}>
                    Species Health — MSY Utilization
                </span>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                    {[
                        { label: 'Crit <50', color: 'var(--color-danger)' },
                        { label: 'High 50–65', color: 'var(--color-amber)' },
                        { label: 'Mod 65–75', color: 'var(--color-warning)' },
                        { label: 'Safe >75', color: 'var(--color-green)' },
                    ].map(l => (
                        <span key={l.label} style={{
                            fontSize: 8, padding: '1px 6px', borderRadius: 99, fontWeight: 700,
                            background: 'var(--color-abyss-900)', border: `1px solid rgba(36,144,204,0.15)`,
                            color: l.color,
                        }}>{l.label}</span>
                    ))}
                </div>
            </div>

            {/* ── Search ── */}
            <div style={{ marginBottom: 8, position: 'relative' }}>
                <svg style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', opacity: 0.3 }}
                    width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="var(--color-abyss-100)" strokeWidth={2.5}>
                    <circle cx={11} cy={11} r={8} /><line x1={21} y1={21} x2={16.65} y2={16.65} />
                </svg>
                <input
                    type="text"
                    value={search}
                    onChange={e => { setSearch(e.target.value); setOpenId(null); }}
                    placeholder="Search species or scientific name…"
                    style={{
                        width: '100%', background: 'var(--color-abyss-950)', border: '1px solid var(--color-abyss-800)',
                        borderRadius: 7, padding: '6px 10px 6px 26px',
                        fontSize: 11, color: 'var(--color-abyss-100)', outline: 'none',
                        fontFamily: 'inherit',
                    }}
                />
                {search && (
                    <button onClick={() => setSearch('')} style={{
                        position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
                        background: 'none', border: 'none', color: 'var(--color-abyss-400)', cursor: 'pointer', fontSize: 12,
                    }}>✕</button>
                )}
            </div>

            {/* ── Column headers ── */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: '18px 1fr 46px 60px 46px 46px 22px',
                gap: '0 6px',
                padding: '4px 8px',
                marginBottom: 4,
                borderBottom: '1px solid var(--color-abyss-800)',
                alignItems: 'center',
            }}>
                <span style={{ fontSize: 9, color: 'var(--color-abyss-400)' }}>#</span>
                <ColHeader label="Species"  sortKey="species" sortState={sortState} onSort={handleSort} />
                <ColHeader label="Health"   sortKey="health"  sortState={sortState} onSort={handleSort} />
                <span style={{ fontSize: 9, color: 'var(--color-abyss-400)' }}>{/* bar */}</span>
                <ColHeader label="MSY%"     sortKey="msy"     sortState={sortState} onSort={handleSort} />
                <ColHeader label="Trend"    sortKey="trend"   sortState={sortState} onSort={handleSort} />
                <ColHeader label="Status"   sortKey="health"  sortState={sortState} onSort={handleSort} />
            </div>

            {/* ── Species rows ── */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'auto' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 2 }}>
                    {displayList.length === 0 && (
                        <div style={{ padding: '20px', textAlign: 'center', fontSize: 12, color: 'var(--color-abyss-400)' }}>
                            No species match "{search}"
                        </div>
                    )}
                    {displayList.map((s, idx) => {
                        const health   = s.stock_health_percent;
                        const hColor   = getHealthColor(health);
                        const msy      = msyUtilizationFn(s);
                        const status   = getStatusProps(health);
                        const trend    = getTrendProps(s.trend);
                        const isOpen   = openId === (s.id ?? s.species);

                        return (
                            <React.Fragment key={s.id ?? s.species}>
                                {/* ── Row ── */}
                                <div
                                    onClick={() => setOpenId(isOpen ? null : (s.id ?? s.species))}
                                    style={{
                                        display: 'grid',
                                        gridTemplateColumns: '18px 1fr 46px 60px 46px 46px 22px',
                                        gap: '0 6px',
                                        alignItems: 'center',
                                        padding: '5px 8px',
                                        borderRadius: 7,
                                        cursor: 'pointer',
                                        background: isOpen ? 'rgba(45,212,191,0.05)' : 'transparent',
                                        border: isOpen ? '1px solid rgba(45,212,191,0.15)' : '1px solid transparent',
                                        transition: 'background 0.15s, border-color 0.15s',
                                    }}
                                    onMouseEnter={e => !isOpen && (e.currentTarget.style.background = 'var(--color-abyss-900)')}
                                    onMouseLeave={e => !isOpen && (e.currentTarget.style.background = 'transparent')}
                                    title={`${s.species} · ${s.scientific_name || ''} · ${s.region || ''}`}
                                >
                                    {/* Rank */}
                                    <span style={{ fontSize: 9, color: 'var(--color-abyss-400)' }}>{idx + 1}</span>

                                    {/* Name */}
                                    <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-abyss-100)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {s.species}
                                    </span>

                                    {/* Health % */}
                                    <span style={{ fontSize: 11, fontWeight: 700, textAlign: 'right', color: hColor }}>
                                        {Math.round(health)}%
                                    </span>

                                    {/* Health bar */}
                                    <div style={{ height: 4, background: 'var(--color-abyss-800)', borderRadius: 99, overflow: 'hidden' }}>
                                        <div style={{ height: '100%', width: `${Math.min(100, health)}%`, background: hColor, borderRadius: 99 }} />
                                    </div>

                                    {/* MSY % */}
                                    <span style={{ fontSize: 10, fontWeight: 700, textAlign: 'right', color: msy > 95 ? 'var(--color-danger)' : 'var(--color-abyss-400)' }}>
                                        {msy}%
                                    </span>

                                    {/* Trend */}
                                    <span style={{ fontSize: 11, fontWeight: 700, textAlign: 'center', color: trend.color }}>
                                        {trend.icon}
                                    </span>

                                    {/* Status badge */}
                                    <span style={{
                                        fontSize: 8, fontWeight: 800, padding: '1px 5px', borderRadius: 99,
                                        background: status.bg, border: `0.5px solid ${status.border}`,
                                        color: status.color, whiteSpace: 'nowrap', textTransform: 'uppercase',
                                        letterSpacing: '0.06em',
                                    }}>
                                        {status.label}
                                    </span>
                                </div>

                                {/* ── Inline detail drawer ── */}
                                {isOpen && (
                                    <SpeciesDrawer
                                        s={s}
                                        msyUtilizationFn={msyUtilizationFn}
                                        onClose={() => setOpenId(null)}
                                    />
                                )}
                            </React.Fragment>
                        );
                    })}
                </div>

                {/* Show more/less */}
                {hasMore && !search && (
                    <button
                        onClick={() => setShowAll(v => !v)}
                        style={{
                            marginTop: 8, width: '100%',
                            background: 'var(--color-abyss-900)', border: '1px solid var(--color-abyss-800)',
                            borderRadius: 7, padding: '7px', fontSize: 10,
                            color: 'var(--color-abyss-400)', cursor: 'pointer',
                            transition: 'border-color 0.15s, color 0.15s',
                            fontFamily: 'inherit',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(45,212,191,0.3)'; e.currentTarget.style.color = 'var(--color-accent)'; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--color-abyss-800)'; e.currentTarget.style.color = 'var(--color-abyss-400)'; }}
                    >
                        {showAll ? `↑ Show top 20 only` : `↓ Show all ${sorted.length} species`}
                    </button>
                )}

                {/* Result count when searching */}
                {search && filtered.length > 0 && (
                    <div style={{ textAlign: 'center', fontSize: 9, color: 'var(--color-abyss-400)', marginTop: 6 }}>
                        {filtered.length} result{filtered.length !== 1 ? 's' : ''} for "{search}"
                    </div>
                )}
            </div>
        </div>
    );
}
