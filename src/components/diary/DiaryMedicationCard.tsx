import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMedication } from '../../hooks/useMedication';
import { MedicationDose, MedicationDoseStatus } from '../../types/medication';

interface DiaryMedicationCardProps {
    date: string;
    forceExpanded?: boolean;
    onClickOverride?: () => void;
    onManage?: () => void;
}

export function DiaryMedicationCard({ date, forceExpanded, onClickOverride, onManage }: DiaryMedicationCardProps) {
    const navigate = useNavigate();
    const [isExpandedLocal, setIsExpandedLocal] = useState(false);
    const isExpanded = forceExpanded !== undefined ? forceExpanded : isExpandedLocal;

    // Real Hook
    const { doses, stats, logDose, deleteLog } = useMedication(date);

    const handleToggle = () => {
        if (onClickOverride) {
            onClickOverride();
            return;
        }
        setIsExpandedLocal(!isExpandedLocal);
    };

    // --- Status Helpers ---
    const getCardStatus = () => {
        if (stats.missed > 0) return { label: `${stats.missed} Missed`, color: 'text-red-400 bg-red-500/10 border-red-500/20' };
        if (stats.due > 0) return { label: `${stats.due} Due`, color: 'text-blue-400 bg-blue-500/10 border-blue-500/20' };
        if (stats.total > 0 && stats.taken === stats.total) return { label: 'All Taken', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' };
        if (stats.total === 0) return { label: 'No Meds', color: 'text-[#6B6B6B] bg-[#2A2A2A] border-[#333]' };
        return { label: 'Unknown', color: 'text-[#6B6B6B]' };
    };

    const cardStatus = getCardStatus();

    const getNextDoseText = () => {
        const next = doses.find(d => d.status === 'due');
        if (next) return `Next: ${next.medication.name} at ${next.time_display}`;
        if (stats.total === 0) return "No medications scheduled";
        return "All meds taken for today 🎉";
    };

    // --- Handlers ---
    const handleDoseClick = (dose: MedicationDose) => {
        if (dose.status === 'due' || dose.status === 'skipped') {
            // Mark as taken
            logDose({ medId: dose.medication.id, scheduleId: dose.schedule?.id, status: 'taken', plannedTime: dose.planned_time });
        } else if (dose.status === 'taken') {
            // Undo (Delete Log)
            if (dose.log_id) {
                deleteLog(dose.log_id);
            }
        } else if (dose.status === 'missed') {
            // Undo missed
            if (dose.log_id) {
                deleteLog(dose.log_id);
            }
        }
    };

    const handleMarkMissed = (e: React.MouseEvent, dose: MedicationDose) => {
        e.stopPropagation();
        // Force mark as missed
        logDose({ medId: dose.medication.id, scheduleId: dose.schedule?.id, status: 'missed', plannedTime: dose.planned_time });
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
                                {stats.taken}/{stats.total} taken • {stats.due} due
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
                        {doses.length === 0 && (
                            <div className="text-center py-8">
                                <p className="text-[#6B6B6B] text-sm">No medications scheduled.</p>
                            </div>
                        )}
                        {doses.map(dose => (
                            <div
                                key={dose.id}
                                onClick={(e) => { e.stopPropagation(); handleDoseClick(dose); }}
                                className="flex items-center justify-between p-3 rounded-xl bg-[#1A1D21] border border-[#2A2A2A] hover:bg-[#202428] cursor-pointer transition-colors group"
                            >
                                {/* Left: Info */}
                                <div>
                                    <div className="flex items-center gap-2">
                                        <div className="text-[14px] font-bold text-white">{dose.medication.name}</div>
                                        {dose.medication.brand && <span className="text-[10px] text-[#5C5C5E] border border-[#3C3C3E] rounded px-1">{dose.medication.brand}</span>}
                                        <div className="text-[#6B6B6B] font-normal text-xs">• {dose.time_display}</div>
                                    </div>
                                    <div className="text-[11px] text-[#8E8E93]">
                                        {dose.medication.strength_value} {dose.medication.strength_unit}
                                        {dose.schedule?.anchor && dose.schedule.anchor !== 'None' && ` • ${dose.schedule.anchor}`}
                                    </div>
                                </div>

                                {/* Right: Status Chip */}
                                <div className="flex items-center gap-2">
                                    {dose.status === 'due' && (
                                        <button
                                            onClick={(e) => handleMarkMissed(e, dose)}
                                            className="opacity-0 group-hover:opacity-100 px-2 py-1 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded text-[9px] font-bold uppercase transition-all"
                                        >
                                            Miss
                                        </button>
                                    )}
                                    <div className="flex flex-col items-end gap-1">
                                        <StatusButton status={dose.status} isPrn={dose.is_prn} />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Footer - Fixed */}
                    <div className="mt-4 pt-4 border-t border-[#262626] flex items-center justify-between flex-shrink-0">
                        <div className="flex flex-col">
                            <span className="text-[11px] text-[#6B6B6B] font-medium">{getNextDoseText()}</span>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    navigate('/medications');
                                }}
                                className="text-[11px] text-[#3B82F6] hover:text-[#60A5FA] font-bold text-left mt-1"
                            >
                                Manage schedule
                            </button>
                        </div>
                        <div className="text-[11px] text-[#6B6B6B] font-bold">
                            {stats.taken} / {stats.total} taken
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function StatusButton({ status, isPrn }: { status: MedicationDoseStatus, isPrn?: boolean }) {
    switch (status) {
        case 'taken':
            return (
                <span className="px-2.5 py-1 rounded-md bg-[#10B981]/10 text-[#10B981] border border-[#10B981]/20 text-[10px] font-bold uppercase tracking-wider">
                    {isPrn ? 'Taken (PRN)' : 'Taken'}
                </span>
            );
        case 'missed':
            return (
                <span className="px-2.5 py-1 rounded-md bg-red-500/10 text-red-500 border border-red-500/20 text-[10px] font-bold uppercase tracking-wider">
                    Missed
                </span>
            );
        case 'skipped':
            return (
                <span className="px-2.5 py-1 rounded-md bg-gray-500/10 text-gray-500 border border-gray-500/20 text-[10px] font-bold uppercase tracking-wider">
                    Skipped
                </span>
            );
        default:
            return (
                <span className={`px-2.5 py-1 rounded-md border text-[10px] font-bold uppercase tracking-wider transition-colors bg-[#2A2A2A] text-[#8E8E93] border-[#333] group-hover:bg-[#333]`}>
                    Due
                </span>
            );
    }
}
