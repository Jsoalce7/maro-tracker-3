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
            relative overflow-visible rounded-[24px] bg-[#141414] border border-[#222] transition-all duration-300 flex flex-col
            ${isExpanded ? 'ring-1 ring-[#333]' : 'hover:border-[#333]'}
        `}>
            {/* Header */}
            <div
                onClick={handleToggle}
                className="p-5 cursor-pointer flex-shrink-0"
            >
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    {/* Top Row */}
                    <div className="flex items-center justify-between md:justify-start md:gap-6 flex-1">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-[#2A2A2A] flex items-center justify-center">
                                <span className="text-xl">❤️</span>
                            </div>
                            <div>
                                <h2 className="text-[17px] font-bold text-white tracking-tight leading-none">Vitals</h2>
                                <p className="text-[12px] text-[#666] font-medium mt-0.5">Summary</p>
                            </div>
                        </div>
                        <div className="md:hidden">
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border uppercase tracking-wider ${statusUI.color}`}>
                                {statusUI.label}
                            </span>
                        </div>
                    </div>

                    {/* Collapsed Summary */}
                    {!isExpanded && (
                        <div className="flex items-center justify-between md:justify-end gap-6 md:gap-8 flex-1 animate-in fade-in duration-200">
                            <div className="flex items-center gap-6">
                                <div className="flex flex-col md:items-end">
                                    <span className="text-[16px] font-bold text-white tracking-tight leading-none">
                                        {latestBP ? `${latestBP.systolic}/${latestBP.diastolic}` : '-'}
                                    </span>
                                    <span className="text-[10px] text-[#666] font-bold uppercase tracking-wider">BP</span>
                                </div>
                                <div className="w-px h-6 bg-[#2A2A2A]" />
                                <div className="flex flex-col md:items-end">
                                    <span className="text-[16px] font-bold text-white tracking-tight leading-none">
                                        {latestGlucose ? latestGlucose.value : '-'}
                                    </span>
                                    <span className="text-[10px] text-[#666] font-bold uppercase tracking-wider">Glucose</span>
                                </div>
                            </div>
                            <div className="hidden md:block">
                                <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border uppercase tracking-wider ${statusUI.color}`}>
                                    {statusUI.label}
                                </span>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Expanded Content */}
            {isExpanded && (
                <div className="flex-1 min-h-0 flex flex-col px-5 pb-5 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="h-px bg-[#222] w-full mb-4 flex-shrink-0" />

                    <div className="flex-1 min-h-0 overflow-y-auto pr-2 custom-scrollbar">
                        {/* BP Section */}
                        <div className="mb-6">
                            <div className="flex items-center justify-between mb-3">
                                <h4 className="text-[10px] uppercase tracking-wider text-[#666] font-bold">Blood Pressure</h4>
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
                                        <div key={entry.id} className="flex items-center justify-between p-2.5 rounded-xl bg-[#1A1A1A] border border-[#262626] hover:bg-[#222] hover:border-[#333] transition-colors">
                                            <div>
                                                <div className="text-[14px] font-bold text-white leading-tight">
                                                    {entry.systolic} <span className="text-[#666] text-[11px] font-normal">/</span> {entry.diastolic} <span className="text-[#666] text-[10px] font-normal">mmHg</span>
                                                </div>
                                                <div className="text-[10px] text-[#666] mt-0.5">{entry.note}</div>
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
                                <h4 className="text-[10px] uppercase tracking-wider text-[#666] font-bold">Glucose</h4>
                                <button className="text-[10px] text-[#3B82F6] font-bold hover:text-[#60A5FA]">Log</button>
                            </div>

                            <div className="space-y-2">
                                {MOCK_GLUCOSE.map(entry => {
                                    const s = getGlucoseStatus(entry.value);
                                    return (
                                        <div key={entry.id} className="flex items-center justify-between p-2.5 rounded-xl bg-[#1A1A1A] border border-[#262626] hover:bg-[#222] hover:border-[#333] transition-colors">
                                            <div>
                                                <div className="text-[14px] font-bold text-white leading-tight">
                                                    {entry.value} <span className="text-[#666] text-[10px] font-normal">{entry.unit}</span>
                                                </div>
                                                <div className="text-[10px] text-[#666] mt-0.5">{entry.note}</div>
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
                    <div className="mt-4 pt-4 border-t border-[#222] flex items-center justify-between flex-shrink-0">
                        <div className="flex flex-col gap-0.5">
                            {latestBP && (
                                <span className="text-[10px] text-[#666]">Last BP: <span className="text-white">{latestBP.systolic}/{latestBP.diastolic}</span> at {latestBP.time}</span>
                            )}
                            {latestGlucose && (
                                <span className="text-[10px] text-[#666]">Last Glucose: <span className="text-white">{latestGlucose.value}</span> at {latestGlucose.time}</span>
                            )}
                        </div>
                        <button className="text-[10px] text-[#444] hover:text-[#888] font-bold border border-[#222] hover:border-[#333] rounded-lg px-2 py-1 transition-colors">
                            Manage devices
                        </button>
                    </div>

                </div>
            )}
        </div>
    );
}
