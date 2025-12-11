import { useState } from 'react';

// --- Types ---
type DoseStatus = 'due' | 'taken' | 'missed';

interface MedicationDose {
    id: string;
    name: string;
    dosage: string;
    instruction: string; // e.g. "with breakfast"
    time: string; // e.g. "08:00 AM"
    status: DoseStatus;
    takenAt?: string; // e.g. "08:05 AM"
}

// --- Mock Data ---
const MOCK_DOSES: MedicationDose[] = [
    { id: '1', name: 'Metformin', dosage: '500 mg', instruction: 'with breakfast', time: '08:00 AM', status: 'taken', takenAt: '08:15 AM' },
    { id: '2', name: 'Vitamin D', dosage: '2000 IU', instruction: 'daily', time: '08:00 AM', status: 'taken', takenAt: '08:15 AM' },
    { id: '3', name: 'Omega-3', dosage: '1 capsule', instruction: 'with lunch', time: '12:00 PM', status: 'taken', takenAt: '12:30 PM' },
    { id: '4', name: 'Metformin', dosage: '500 mg', instruction: 'with dinner', time: '07:00 PM', status: 'due' },
    { id: '5', name: 'Magnesium', dosage: '400 mg', instruction: 'before bed', time: '10:00 PM', status: 'due' },
];

interface DiaryMedicationCardProps {
    date: string;
    forceExpanded?: boolean;
    onClickOverride?: () => void;
}

export function DiaryMedicationCard({ date, forceExpanded, onClickOverride }: DiaryMedicationCardProps) {
    const [isExpandedLocal, setIsExpandedLocal] = useState(false);
    const isExpanded = forceExpanded !== undefined ? forceExpanded : isExpandedLocal;

    const handleToggle = () => {
        if (onClickOverride) {
            onClickOverride();
            return;
        }
        setIsExpandedLocal(!isExpandedLocal);
    };

    const [doses, setDoses] = useState<MedicationDose[]>(MOCK_DOSES);

    // --- Derived Logic ---
    const totalDoses = doses.length;
    const takenCount = doses.filter(d => d.status === 'taken').length;
    const missedCount = doses.filter(d => d.status === 'missed').length;
    const dueCount = doses.filter(d => d.status === 'due').length;

    // --- Status Helpers ---
    const getCardStatus = () => {
        if (missedCount > 0) return { label: `${missedCount} Missed`, color: 'text-red-400 bg-red-500/10 border-red-500/20' };
        if (dueCount > 0) return { label: `${dueCount} Due`, color: 'text-blue-400 bg-blue-500/10 border-blue-500/20' };
        return { label: 'All Taken', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' };
    };

    const cardStatus = getCardStatus();

    const getNextDoseText = () => {
        const next = doses.find(d => d.status === 'due');
        if (next) return `Next: ${next.name} at ${next.time}`;
        return "All meds taken for today 🎉";
    };

    // --- Handlers ---
    const toggleDoseStatus = (id: string, currentStatus: DoseStatus) => {
        // Simple toggle for demo: Due -> Taken -> Missed -> Due
        const nextStatus: Record<DoseStatus, DoseStatus> = {
            'due': 'taken',
            'taken': 'missed',
            'missed': 'due'
        };

        setDoses(prev => prev.map(d => {
            if (d.id !== id) return d;
            const newStatus = nextStatus[currentStatus];
            return {
                ...d,
                status: newStatus,
                takenAt: newStatus === 'taken' ? new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : undefined
            };
        }));
    };

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
                            <svg className="w-6 h-6 text-[#8E8E93]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                            </svg>
                        </div>

                        <div className="flex flex-col min-w-0">
                            <span className="text-[17px] font-bold text-white truncate">Medication</span>
                            <span className="text-[13px] text-[#8E8E93] truncate">Today's doses</span>
                        </div>
                    </div>

                    <div className="flex flex-col items-end gap-1 ml-auto sm:ml-0 mt-1 sm:mt-0">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border uppercase tracking-wider ${cardStatus.color}`}>
                            {cardStatus.label}
                        </span>
                        {!isExpanded && (
                            <span className="text-[11px] text-[#6B6B6B]">
                                {takenCount}/{totalDoses} taken • {dueCount} due
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* Expanded Content */}
            {isExpanded && (
                <div className="flex-1 min-h-0 flex flex-col px-5 pb-5 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="h-px bg-[#262626] w-full mb-4 flex-shrink-0" />

                    <h4 className="text-[10px] uppercase tracking-wider text-[#6B6B6B] font-bold mb-3 flex-shrink-0">Today</h4>

                    {/* Doses List (Scrollable) */}
                    <div className="flex-1 min-h-0 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                        {doses.map(dose => (
                            <div
                                key={dose.id}
                                onClick={(e) => { e.stopPropagation(); toggleDoseStatus(dose.id, dose.status); }}
                                className="flex items-center justify-between p-3 rounded-xl bg-[#1A1D21] border border-[#2A2A2A] hover:bg-[#202428] cursor-pointer transition-colors group"
                            >
                                {/* Left: Info */}
                                <div>
                                    <div className="text-[14px] font-bold text-white">{dose.name} <span className="text-[#6B6B6B] font-normal text-xs ml-1">• {dose.time}</span></div>
                                    <div className="text-[11px] text-[#8E8E93]">{dose.dosage} • {dose.instruction}</div>
                                </div>

                                {/* Right: Status Chip */}
                                <div className="flex flex-col items-end gap-1">
                                    <StatusButton status={dose.status} />
                                    {dose.status === 'taken' && dose.takenAt && (
                                        <span className="text-[9px] text-[#6B6B6B]">at {dose.takenAt}</span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Footer - Fixed */}
                    <div className="mt-4 pt-4 border-t border-[#262626] flex items-center justify-between flex-shrink-0">
                        <div className="flex flex-col">
                            <span className="text-[11px] text-[#6B6B6B] font-medium">{getNextDoseText()}</span>
                            <button className="text-[11px] text-[#3B82F6] hover:text-[#60A5FA] font-bold text-left mt-1">
                                Manage schedule
                            </button>
                        </div>
                        <div className="text-[11px] text-[#6B6B6B] font-bold">
                            {takenCount} / {totalDoses} taken
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function StatusButton({ status }: { status: DoseStatus }) {
    switch (status) {
        case 'taken':
            return (
                <span className="px-2.5 py-1 rounded-md bg-[#10B981]/10 text-[#10B981] border border-[#10B981]/20 text-[10px] font-bold uppercase tracking-wider">
                    Taken
                </span>
            );
        case 'missed':
            return (
                <span className="px-2.5 py-1 rounded-md bg-red-500/10 text-red-500 border border-red-500/20 text-[10px] font-bold uppercase tracking-wider">
                    Missed
                </span>
            );
        default:
            return (
                <span className="px-2.5 py-1 rounded-md bg-[#2A2A2A] text-[#8E8E93] border border-[#333] text-[10px] font-bold uppercase tracking-wider group-hover:bg-[#333] transition-colors">
                    Due
                </span>
            );
    }
}
