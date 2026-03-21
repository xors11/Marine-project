import React from 'react';
import { Activity, Clock, Anchor, Wind } from 'lucide-react';

export default function BottomNav({ activeTab, onTabChange }) {
    const navItems = [
        { id: 'live', label: 'Live', icon: <Activity className="w-5 h-5" /> },
        { id: 'historical', label: 'History', icon: <Clock className="w-5 h-5" /> },
        { id: 'fisheries', label: 'Fisheries', icon: <Anchor className="w-5 h-5" /> },
        { id: 'cyclones', label: 'Cyclones', icon: <Wind className="w-5 h-5" /> }
    ];

    return (
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-slate-950/90 backdrop-blur-md border-t border-slate-800/60 safe-bottom">
            <div className="flex justify-around items-center p-2">
                {navItems.map(item => {
                    const isActive = activeTab === item.id;
                    return (
                        <button
                            key={item.id}
                            onClick={() => onTabChange(item.id)}
                            className={`flex flex-col items-center justify-center w-16 h-14 rounded-xl transition-colors ${isActive ? 'text-cyan-400' : 'text-slate-500 hover:text-slate-300'
                                }`}
                        >
                            <div className={`mb-1 transition-transform ${isActive ? 'scale-110' : ''}`}>
                                {item.icon}
                            </div>
                            <span className="text-[10px] font-medium tracking-wide">{item.label}</span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
