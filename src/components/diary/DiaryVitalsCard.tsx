import { useState } from 'react';

// --- Types ---
type VitalStatus = 'normal' | 'attention' | 'high';

interface BPEntry {
    id: string;
    systolic: number;
    diastolic: number;
    time: string;
    note: string;
}

interface GlucoseEntry {
    id: string;
    value: number;
    unit: string;
    time: string;
    note: string;
}

// --- Mock Data ---
const MOCK_BP: BPEntry[] = [
    { id: '1', systolic: 118, diastolic: 78, time: '08:32 AM', note: 'Morning reading' },
    { id: '2', systolic: 125, diastolic: 82, time: '02:15 PM', note: 'Post-lunch' },
];

const MOCK_GLUCOSE: GlucoseEntry[] = [
    { id: '1', value: 96, unit: 'mg/dL', time: '08:29 AM', note: 'Fasting' },
    { id: '2', value: 110, unit: 'mg/dL', time: '10:30 AM', note: '2h post-meal' },
];

interface DiaryVitalsCardProps {
    date: string;
    forceExpanded?: boolean;
    onClickOverride?: () => void;
}

export function DiaryVitalsCard({ date, forceExpanded, onClickOverride }: DiaryVitalsCardProps) {
    const [isExpandedLocal, setIsExpandedLocal] = useState(false);
    const isExpanded = forceExpanded !== undefined ? forceExpanded : isExpandedLocal;

    const handleToggle = () => {
        if (onClickOverride) {
            onClickOverride();
            return;
        }
        setIsExpandedLocal(!isExpandedLocal);
    };

    // --- Status Logic ---
    const getBPStatus = (sys: number, dia: number): VitalStatus => {
        if (sys >= 140 || dia >= 90) return 'high';
        if (sys >= 120 || dia >= 80) return 'attention';
        return 'normal';
    };

    const getGlucoseStatus = (val: number): VitalStatus => {
        if (val >= 126) return 'high'; // diabetic range mock
        if (val >= 100) return 'attention'; // pre-diabetic mock
        return 'normal';
    };

    // Calculate Overall Card Status (worst case wins)
    const latestBP = MOCK_BP[MOCK_BP.length - 1]; // Mock latest
    const latestGlucose = MOCK_GLUCOSE[MOCK_GLUCOSE.length - 1];

    const bpStatus = latestBP ? getBPStatus(latestBP.systolic, latestBP.diastolic) : 'normal';
    const glucoseStatus = latestGlucose ? getGlucoseStatus(latestGlucose.value) : 'normal';

    let cardStatus: VitalStatus = 'normal';
    if (bpStatus === 'high' || glucoseStatus === 'high') cardStatus = 'high';
    else if (bpStatus === 'attention' || glucoseStatus === 'attention') cardStatus = 'attention';

    const getStatusUI = (s: VitalStatus) => {
        switch (s) {
            case 'high': return { label: 'High', color: 'text-red-400 bg-red-500/10 border-red-500/20' };
            case 'attention': return { label: 'Attention', color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' };
            default: return { label: 'Normal', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' };
        }
    };

    const statusUI = getStatusUI(cardStatus);

    return (
        <div className={`
            relative overflow-hidden rounded-2xl bg-[#131518] border border-[#262626] transition-all duration-300 h-full max-h-[450px] flex flex-col
            ${isExpanded ? 'ring-1 ring-[#3B82F6]/50' : 'hover:bg-[#1A1D21]'}
        `}>
            {/* Header */}
            <div
                onClick={handleToggle}
                className="p-5 cursor-pointer flex-shrink-0"
            >
                <div className="flex flex-wrap gap-4 items-center justify-between">
                    <div className="flex items-center gap-4 min-w-0">
                        {/* Icon */}
                        <div className="w-12 h-12 rounded-xl bg-[#2A2A2A] border border-[#333] flex items-center justify-center flex-shrink-0">
                            <svg className="w-6 h-6 text-[#ef4444]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                            </svg>
                        </div>

                        <div className="flex flex-col min-w-0">
                            <span className="text-[17px] font-bold text-white truncate">Vitals</span>
                            <span className="text-[13px] text-[#8E8E93] truncate">Blood Pressure • Glucose</span>
                        </div>
                    </div>

                    <div className="flex flex-col items-end gap-1 ml-auto sm:ml-0 mt-1 sm:mt-0">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border uppercase tracking-wider ${statusUI.color}`}>
                            {statusUI.label}
                        </span>
                        {!isExpanded && (
                            <span className="text-[11px] text-[#6B6B6B]">
                                BP: {latestBP ? `${latestBP.systolic}/${latestBP.diastolic}` : '-'} • Glu: {latestGlucose ? latestGlucose.value : '-'}
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* Expanded Content */}
            {isExpanded && (
                <div className="flex-1 min-h-0 flex flex-col px-5 pb-5 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="h-px bg-[#262626] w-full mb-4 flex-shrink-0" />

                    <div className="flex-1 min-h-0 overflow-y-auto pr-2 custom-scrollbar">
                        {/* BP Section */}
                        <div className="mb-6">
                            <div className="flex items-center justify-between mb-3">
                                <h4 className="text-[10px] uppercase tracking-wider text-[#6B6B6B] font-bold">Blood Pressure</h4>
                                <button className="text-[10px] text-[#3B82F6] font-bold hover:text-[#60A5FA]">Log</button>
                            </div>

                            {/* Mock Sparkline Graph */}
                            <div className="h-8 w-full mb-2 flex items-end gap-1 opacity-50">
                                <div className="w-full h-px bg-[#333]"></div> {/* Base line */}
                                {/* Just dots for visualization */}
                            </div>

                            <div className="space-y-2">
                                {MOCK_BP.map(entry => {
                                    const s = getBPStatus(entry.systolic, entry.diastolic);
                                    const ui = getStatusUI(s);
                                    return (
                                        <div key={entry.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-[#1A1D21] border border-transparent hover:border-[#2A2A2A] transition-colors">
                                            <div>
                                                <div className="text-[14px] font-bold text-white leading-tight">
                                                    {entry.systolic} <span className="text-[#6B6B6B] text-[11px] font-normal">/</span> {entry.diastolic} <span className="text-[#6B6B6B] text-[10px] font-normal">mmHg</span>
                                                </div>
                                                <div className="text-[10px] text-[#6B6B6B] mt-0.5">{entry.note}</div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <span className="text-[10px] text-[#444] font-mono">{entry.time}</span>
                                                <div className={`w-2 h-2 rounded-full ${s === 'normal' ? 'bg-emerald-500' : s === 'attention' ? 'bg-amber-500' : 'bg-red-500'}`}></div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Glucose Section */}
                        <div className="mb-2">
                            <div className="flex items-center justify-between mb-3">
                                <h4 className="text-[10px] uppercase tracking-wider text-[#6B6B6B] font-bold">Glucose</h4>
                                <button className="text-[10px] text-[#3B82F6] font-bold hover:text-[#60A5FA]">Log</button>
                            </div>

                            <div className="space-y-2">
                                {MOCK_GLUCOSE.map(entry => {
                                    const s = getGlucoseStatus(entry.value);
                                    return (
                                        <div key={entry.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-[#1A1D21] border border-transparent hover:border-[#2A2A2A] transition-colors">
                                            <div>
                                                <div className="text-[14px] font-bold text-white leading-tight">
                                                    {entry.value} <span className="text-[#6B6B6B] text-[10px] font-normal">{entry.unit}</span>
                                                </div>
                                                <div className="text-[10px] text-[#6B6B6B] mt-0.5">{entry.note}</div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <span className="text-[10px] text-[#444] font-mono">{entry.time}</span>
                                                <div className={`w-2 h-2 rounded-full ${s === 'normal' ? 'bg-emerald-500' : s === 'attention' ? 'bg-amber-500' : 'bg-red-500'}`}></div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* Footer - Fixed */}
                    <div className="mt-4 pt-4 border-t border-[#262626] flex items-center justify-between flex-shrink-0">
                        <div className="flex flex-col gap-0.5">
                            {latestBP && (
                                <span className="text-[10px] text-[#6B6B6B]">Last BP: <span className="text-white">{latestBP.systolic}/{latestBP.diastolic}</span> at {latestBP.time}</span>
                            )}
                            {latestGlucose && (
                                <span className="text-[10px] text-[#6B6B6B]">Last Glucose: <span className="text-white">{latestGlucose.value}</span> at {latestGlucose.time}</span>
                            )}
                        </div>
                        <button className="text-[10px] text-[#444] hover:text-[#888] font-bold border border-[#2A2A2A] rounded-lg px-2 py-1 transition-colors">
                            Manage devices
                        </button>
                    </div>

                </div>
            )}
        </div>
    );
}
