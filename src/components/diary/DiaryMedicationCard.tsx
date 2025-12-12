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
                                <span className="text-xl">💊</span>
                            </div>
                            <div>
                                <h2 className="text-[17px] font-bold text-white tracking-tight leading-none">Medication</h2>
                                <p className="text-[12px] text-[#666] font-medium mt-0.5">Today's doses</p>
                            </div>
                        </div>
                        <div className="md:hidden">
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border uppercase tracking-wider ${cardStatus.color}`}>
                                {cardStatus.label}
                            </span>
                        </div>
                    </div>

                    {/* Collapsed Summary */}
                    {!isExpanded && (
                        <div className="flex items-center justify-between md:justify-end gap-6 md:gap-8 flex-1 animate-in fade-in duration-200">
                            <div className="flex items-center gap-6">
                                <div className="flex flex-col md:items-end">
                                    <span className="text-[20px] font-bold text-white tracking-tight leading-none">{stats.taken}</span>
                                    <span className="text-[10px] text-[#666] font-bold uppercase tracking-wider">Taken</span>
                                </div>
                                <div className="w-px h-6 bg-[#2A2A2A]" />
                                <div className="flex flex-col md:items-end">
                                    <span className="text-[20px] font-bold text-[#666] tracking-tight leading-none">{stats.due}</span>
                                    <span className="text-[10px] text-[#666] font-bold uppercase tracking-wider">Due</span>
                                </div>
                            </div>
                            <div className="hidden md:block">
                                <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border uppercase tracking-wider ${cardStatus.color}`}>
                                    {cardStatus.label}
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

                    <h4 className="text-[10px] uppercase tracking-wider text-[#666] font-bold mb-3 flex-shrink-0">Schedule</h4>

                    {/* Doses List (Scrollable) */}
                    <div className="flex-1 min-h-0 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                        {doses.length === 0 && (
                            <div className="text-center py-8">
                                <p className="text-[#444] text-sm italic">No medications scheduled.</p>
                            </div>
                        )}
                        {doses.map(dose => (
                            <div
                                key={dose.id}
                                onClick={(e) => { e.stopPropagation(); handleDoseClick(dose); }}
                                className="flex items-center justify-between p-3 rounded-xl bg-[#1A1A1A] border border-[#262626] hover:bg-[#222] cursor-pointer transition-colors group"
                            >
                                {/* Left: Info */}
                                <div>
                                    <div className="flex items-center gap-2">
                                        <div className="text-[14px] font-bold text-white">{dose.medication.name}</div>
                                        {dose.medication.brand && <span className="text-[10px] text-[#666] border border-[#333] rounded px-1.5 py-0.5">{dose.medication.brand}</span>}
                                    </div>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className="text-[11px] text-[#888] font-medium">{dose.medication.strength_value} {dose.medication.strength_unit}</span>
                                        <span className="text-[11px] text-[#444]">•</span>
                                        <span className="text-[11px] text-[#888] font-medium">{dose.time_display}</span>
                                    </div>
                                </div>

                                {/* Right: Status Chip */}
                                <div className="flex items-center gap-2">
                                    {dose.status === 'due' && (
                                        <button
                                            onClick={(e) => handleMarkMissed(e, dose)}
                                            className="opacity-0 group-hover:opacity-100 px-2 py-1 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-lg text-[9px] font-bold uppercase transition-all"
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
                    <div className="mt-4 pt-4 border-t border-[#222] flex items-center justify-between flex-shrink-0">
                        <div className="flex flex-col">
                            <span className="text-[11px] text-[#666] font-medium">{getNextDoseText()}</span>
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
                        <div className="text-[11px] text-[#666] font-bold">
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
                <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 text-[10px] font-bold uppercase tracking-wider">
                    {isPrn ? 'Taken (PRN)' : 'Taken'}
                </span>
            );
        case 'missed':
            return (
                <span className="px-2.5 py-1 rounded-lg bg-red-500/10 text-red-500 border border-red-500/20 text-[10px] font-bold uppercase tracking-wider">
                    Missed
                </span>
            );
        case 'skipped':
            return (
                <span className="px-2.5 py-1 rounded-lg bg-zinc-500/10 text-zinc-500 border border-zinc-500/20 text-[10px] font-bold uppercase tracking-wider">
                    Skipped
                </span>
            );
        default:
            return (
                <span className={`px-2.5 py-1 rounded-lg border text-[10px] font-bold uppercase tracking-wider transition-colors bg-[#262626] text-[#888] border-[#333] group-hover:bg-[#333] group-hover:text-white`}>
                    Due
                </span>
            );
    }
}
