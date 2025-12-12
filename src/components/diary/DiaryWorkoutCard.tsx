import { useState, useMemo } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { workoutService, WorkoutSessionSummary, WorkoutExerciseSummary } from '../../services/workoutService';
import { useNavigate } from 'react-router-dom';
import { ChangeWorkoutModal } from '../workout/ChangeWorkoutModal';

interface DiaryWorkoutCardProps {
    date: string; // YYYY-MM-DD
    forceExpanded?: boolean;
    onClickOverride?: () => void;
}

export const DiaryWorkoutCard = ({ date, forceExpanded, onClickOverride }: DiaryWorkoutCardProps) => {
    const { session } = useAuthStore();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [isExpandedLocal, setIsExpandedLocal] = useState(false);

    // Context Menu State
    const [showContextMenu, setShowContextMenu] = useState(false);
    const [longPressTimer, setLongPressTimer] = useState<number | null>(null);
    const [showChangeWorkoutModal, setShowChangeWorkoutModal] = useState(false);

    // 1. Fetch Workout State (NEW: Single source of truth)
    const { data: workoutState, isLoading } = useQuery({
        queryKey: ['workoutState', date],
        queryFn: async () => {
            if (!session?.user?.id) return { schedule: null, session: null, status: 'no_workout' as const };
            return workoutService.getWorkoutState(session.user.id, date);
        },
        enabled: !!session?.user?.id,
    });

    const activeSession = workoutState?.session;
    const scheduledWorkout = workoutState?.schedule;
    const isExpanded = forceExpanded !== undefined ? forceExpanded : isExpandedLocal;

    const handleToggle = () => {
        if (onClickOverride) {
            onClickOverride();
            return;
        }
        setIsExpandedLocal(!isExpandedLocal);
    };

    // Long-press handlers
    const handleTouchStart = (e: React.TouchEvent) => {
        const timer = setTimeout(() => {
            setShowContextMenu(true);
        }, 500); // 500ms long press
        setLongPressTimer(timer);
    };

    const handleTouchEnd = () => {
        if (longPressTimer) {
            clearTimeout(longPressTimer);
            setLongPressTimer(null);
        }
    };

    const handleContextMenu = (e: React.MouseEvent) => {
        e.preventDefault();
        setShowContextMenu(true);
    };

    // Context Menu Actions
    const handleResetWorkout = async () => {
        if (!session?.user?.id) return;
        if (confirm('Reset today\'s workout? This will delete all logged sets.')) {
            try {
                await workoutService.resetWorkout(session.user.id, date);
                queryClient.invalidateQueries({ queryKey: ['workoutState'] });
                queryClient.invalidateQueries({ queryKey: ['workouts'] });
                setShowContextMenu(false);
            } catch (e) {
                alert('Failed to reset workout');
            }
        }
    };

    const handleEditTemplate = () => {
        const templateId = activeSession?.template_id || scheduledWorkout?.template_id;
        if (!templateId) return;
        // Navigate to manage workouts with template pre-selected for editing
        // Since we don't have direct navigation to edit mode, we'll open the manager
        // User can implement this by passing a callback or using router state
        alert('Navigate to Manage Workouts to edit this template');
        setShowContextMenu(false);
    };

    const handleChangeWorkout = () => {
        setShowChangeWorkoutModal(true);
        setShowContextMenu(false);
    };

    const handleStartWorkout = async () => {
        if (!session?.user?.id) return;

        try {
            // Use workout state to determine action
            if (workoutState?.status === 'in_progress' && activeSession) {
                // Resume existing session
                navigate(`/workout/session/${activeSession.id}`);
            } else if (workoutState?.status === 'not_started' && scheduledWorkout) {
                // Start new session from scheduled template
                const result = await workoutService.startWorkoutFromTemplate(
                    session.user.id,
                    scheduledWorkout.template_id
                );
                navigate(`/workout/session/${result.session.id}`);
            } else if (workoutState?.status === 'no_workout') {
                // No workout scheduled - this shouldn't happen from this handler
                alert('No workout scheduled for today');
            }
        } catch (error) {
            console.error('Failed to start workout:', error);
            alert('Failed to start workout. Please try again.');
        }
        setShowContextMenu(false);
    };

    // 3. Status Logic
    const status = useMemo(() => {
        if (activeSession) {
            if (activeSession.status === 'in_progress') return { label: 'IN PROGRESS', color: 'border-amber-500/30 text-amber-500 bg-amber-500/10' };
            if (activeSession.status === 'completed') return { label: 'COMPLETED', color: 'border-emerald-500/30 text-emerald-500 bg-emerald-500/10' };
            return { label: 'ABANDONED', color: 'border-red-500/30 text-red-500 bg-red-500/10' };
        }
        if (scheduledWorkout) {
            return { label: 'NOT STARTED', color: 'border-zinc-700 text-zinc-400 bg-zinc-900/50' };
        }
        return { label: 'NO WORKOUT', color: 'border-zinc-800 text-zinc-600 bg-zinc-900/20' };
    }, [activeSession, scheduledWorkout]);

    const isInProgress = activeSession?.status === 'in_progress';
    const isCompleted = activeSession?.status === 'completed';
    // Display name priority: Session Name > Scheduled Template Name > "Workout"
    const templateName = activeSession?.name || scheduledWorkout?.workout_templates?.name || 'Workout';
    const exerciseCount = activeSession?.exercises?.length || scheduledWorkout?.workout_templates?.workout_template_exercises?.length || 0;

    // 4. Handlers
    // State for loading
    const [isStarting, setIsStarting] = useState(false);

    const handleStart = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!session?.user?.id) return;

        setIsStarting(true);
        try {
            if (scheduledWorkout) {
                // Create session from scheduled workout
                const { session: newSession } = await workoutService.startWorkoutFromTemplate(
                    session.user.id,
                    scheduledWorkout.template_id
                );
                navigate(`/workout/session/${newSession.id}`);
            } else {
                // Quick workout - create empty session
                const newSession = await workoutService.startEmptySession(session.user.id);
                navigate(`/workout/session/${newSession.id}`);
            }
        } catch (err) {
            console.error('Failed to start workout:', err);
            alert('Failed to start workout. Please try again.');
        } finally {
            setIsStarting(false);
        }
    };

    const handleResume = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (activeSession) navigate(`/workout/session/${activeSession.id}`);
    };

    // Duration Helper
    const getDuration = () => {
        if (!activeSession?.started_at || !activeSession?.ended_at) return '0 min';
        const start = new Date(activeSession.started_at);
        const end = new Date(activeSession.ended_at);
        const diff = Math.round((end.getTime() - start.getTime()) / 60000);
        return `${diff} min`;
    };

    return (
        <div className={`
            relative overflow-visible rounded-[24px] bg-[#141414] border border-[#222] transition-all duration-300 flex flex-col
            ${isExpanded ? 'ring-1 ring-[#333]' : 'hover:border-[#333]'}
        `}>
            {/* Header */}
            <div
                onClick={handleToggle}
                onContextMenu={handleContextMenu}
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
                className="p-5 cursor-pointer flex-shrink-0"
            >
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    {/* Top Row: Title & Action */}
                    <div className="flex items-center justify-between md:justify-start md:gap-6 flex-1">
                        <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center border transition-colors ${isInProgress ? 'bg-amber-500/10 border-amber-500/20 text-amber-500' :
                                isCompleted ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' :
                                    'bg-[#2A2A2A] border-[#333] text-[#8E8E93]'
                                }`}>
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                </svg>
                            </div>
                            <div>
                                <h2 className="text-[17px] font-bold text-white tracking-tight leading-none">Workout</h2>
                                <p className="text-[12px] text-[#666] font-medium mt-0.5 truncate max-w-[150px]">{templateName}</p>
                            </div>
                        </div>

                        <div className="md:hidden">
                            <StatusPill status={status} />
                        </div>
                    </div>

                    {/* Collapsed Summary */}
                    {!isExpanded && (
                        <div className="flex items-center justify-between md:justify-end gap-6 md:gap-8 flex-1 animate-in fade-in duration-200">
                            <div className="flex items-center gap-6">
                                <div className="flex flex-col md:items-end">
                                    <span className="text-[20px] font-bold text-white tracking-tight leading-none">{exerciseCount}</span>
                                    <span className="text-[10px] text-[#666] font-bold uppercase tracking-wider">Exercises</span>
                                </div>
                                {isCompleted && (
                                    <>
                                        <div className="w-px h-6 bg-[#2A2A2A]" />
                                        <div className="flex flex-col md:items-end">
                                            <span className="text-[20px] font-bold text-white tracking-tight leading-none">{getDuration().replace(' min', '')}</span>
                                            <span className="text-[10px] text-[#666] font-bold uppercase tracking-wider">Mins</span>
                                        </div>
                                    </>
                                )}
                            </div>
                            <div className="hidden md:block">
                                <StatusPill status={status} />
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Context Menu Overlay */}
            {showContextMenu && (
                <>
                    <div
                        className="fixed inset-0 z-[60]"
                        onClick={() => setShowContextMenu(false)}
                    />
                    <div className="absolute top-16 right-5 z-[70] bg-[#1A1D21] border border-[#333] rounded-xl shadow-2xl overflow-hidden min-w-[200px]">
                        {activeSession && (
                            <button
                                onClick={handleResetWorkout}
                                className="w-full px-4 py-3 text-left text-sm text-red-400 hover:bg-red-500/10 transition-colors flex items-center gap-3"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                                Reset Today's Workout
                            </button>
                        )}
                        {(activeSession?.template_id || scheduledWorkout?.template_id) && (
                            <button
                                onClick={handleEditTemplate}
                                className="w-full px-4 py-3 text-left text-sm text-white hover:bg-[#333] transition-colors flex items-center gap-3 border-t border-[#262626]"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                                Edit Template
                            </button>
                        )}
                        <button
                            onClick={handleChangeWorkout}
                            className="w-full px-4 py-3 text-left text-sm text-white hover:bg-[#333] transition-colors flex items-center gap-3 border-t border-[#262626]"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                            </svg>
                            Change Today's Workout
                        </button>
                    </div>
                </>
            )}

            {/* Content (Timeline) */}
            {isExpanded && (
                <div className="flex-1 min-h-0 flex flex-col px-5 pb-5 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="h-px bg-[#222] w-full mb-4 flex-shrink-0" />

                    <div className="mt-2 flex-1 min-h-0 overflow-y-auto pr-2 custom-scrollbar">
                        <div className="sticky top-0 bg-[#141414] z-10 pb-2">
                            <h4 className="text-[10px] uppercase tracking-wider text-[#666] font-bold mb-3">Timeline</h4>
                        </div>

                        <div className="relative pl-3 space-y-0">
                            <div className="absolute left-[3.5px] top-1.5 bottom-2 w-px bg-[#262626]"></div>

                            {!activeSession && !scheduledWorkout ? (
                                <div className="text-sm text-[#444] py-2 italic pl-4">No workout started.</div>
                            ) : !activeSession && scheduledWorkout ? (
                                // Show scheduled workout exercises
                                scheduledWorkout.workout_templates?.workout_template_exercises
                                    ?.sort((a: any, b: any) => a.order_index - b.order_index)
                                    .map((ex: any) => (
                                        <div key={ex.id} className="relative flex items-start gap-4 py-2 group">
                                            {/* Dot */}
                                            <div className="relative z-10 w-2 h-2 rounded-full mt-1.5 ring-4 ring-[#141414] transition-colors bg-[#333]"></div>

                                            <div className="flex-1 -mt-1 p-2 rounded-lg hover:bg-[#1A1A1A] transition-colors flex justify-between items-center">
                                                <div>
                                                    <div className="text-[14px] font-bold text-white leading-tight">{ex.name}</div>
                                                    <div className="text-[11px] text-[#6B6B6B] mt-0.5">
                                                        {ex.default_sets || 3} sets × {ex.default_reps || 10} reps
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                            ) : (
                                activeSession?.exercises?.map((ex: WorkoutExerciseSummary, idx: number) => {
                                    const completedSets = ex.setsCount; // Calculated on backend

                                    return (
                                        <div key={ex.id} className="relative flex items-start gap-4 py-2 group">
                                            {/* Dot */}
                                            <div className={`relative z-10 w-2 h-2 rounded-full mt-1.5 ring-4 ring-[#141414] transition-colors ${completedSets > 0 ? 'bg-[#3B82F6]' : 'bg-[#333]'
                                                }`}></div>

                                            <div className="flex-1 -mt-1 p-2 rounded-lg hover:bg-[#1A1A1A] transition-colors flex justify-between items-center">
                                                <div>
                                                    <div className="text-[14px] font-bold text-white leading-tight">{ex.name}</div>
                                                    <div className="text-[11px] text-[#6B6B6B] mt-0.5">
                                                        {completedSets} sets • {getErrorFreeWeightRange(ex)} lb
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="mt-4 pt-4 border-t border-[#222] flex items-center justify-between flex-shrink-0">
                        {isCompleted && activeSession.started_at && activeSession.ended_at ? (
                            <div className="flex gap-4 text-[11px] text-[#6B6B6B] font-medium font-mono">
                                <span>Start {new Date(activeSession.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                <span>End {new Date(activeSession.ended_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                        ) : <div></div>}

                        {!isCompleted && (
                            <button
                                onClick={activeSession ? handleResume : handleStart}
                                disabled={isStarting}
                                className={`px-6 py-2.5 rounded-xl text-sm font-bold text-white transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed ${activeSession
                                    ? 'bg-[#F59E0B] hover:bg-[#D97706] shadow-amber-900/20'
                                    : 'bg-[#3B82F6] hover:bg-[#2563EB] shadow-blue-900/20'
                                    }`}
                            >
                                {isStarting ? "Starting..." : activeSession ? "Resume" : "Start Workout"}
                            </button>
                        )}

                        {isCompleted && (
                            <div className="text-[11px] text-[#6B6B6B] font-bold">
                                {activeSession.total_sets} Sets Total
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Change Workout Modal */}
            {showChangeWorkoutModal && (
                <ChangeWorkoutModal
                    date={date}
                    currentTemplateId={scheduledWorkout?.template_id}
                    onClose={() => setShowChangeWorkoutModal(false)}
                />
            )}
        </div>
    );
};

// --- Components ---

const StatusPill = ({ status }: { status: { label: string, color: string } }) => (
    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border uppercase tracking-wider ${status.color}`}>
        {status.label}
    </span>
);

function getErrorFreeWeightRange(ex: WorkoutExerciseSummary) {
    if (!ex.minWeight || !ex.maxWeight) return "-";
    return ex.minWeight === ex.maxWeight ? ex.minWeight : `${ex.minWeight}-${ex.maxWeight}`;
}
