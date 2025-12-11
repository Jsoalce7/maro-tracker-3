import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { workoutService } from '../services/workoutService';
import { SessionHeader } from '../components/workout/SessionHeader';
import { SessionExerciseHeader } from '../components/workout/SessionExerciseHeader';
import { ExerciseTypeView } from '../components/workout/ExerciseTypeView';
import { WorkoutCompletionModal } from '../components/workout/WorkoutCompletionModal';
import { RestBetweenSets } from '../components/workout/RestBetweenSets';
import { RestBetweenExercises } from '../components/workout/RestBetweenExercises';
import { ProgressionDisplay } from '../components/workout/ProgressionDisplay';

export function WorkoutSession() {
    const { sessionId } = useParams();
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    const [showCompletion, setShowCompletion] = useState(false);

    // 1. Fetch Session Data
    const { data: session, isLoading } = useQuery({
        queryKey: ['session', sessionId],
        queryFn: () => workoutService.getSessionDetails(sessionId!),
        enabled: !!sessionId,
    });

    // 2. State for Navigation - Initialize from saved session state
    const [currentExerciseIdx, setCurrentExerciseIdx] = useState(0);
    const [currentSetIdx, setCurrentSetIdx] = useState(0);

    // Load saved session state on mount (RESUME)
    useEffect(() => {
        if (session) {
            // Resume from saved position if available
            const savedExIdx = session.current_exercise_index ?? 0;
            const savedSetIdx = session.current_set_index ?? 0;

            setCurrentExerciseIdx(savedExIdx);
            setCurrentSetIdx(savedSetIdx);

            console.log('📍 Resuming session at Exercise', savedExIdx + 1, 'Set', savedSetIdx + 1);
        }
    }, [session?.id]); // Only run when session loads

    // Local inputs state (to prevent jitter on global updates)
    // Keyed by exIdx-setIdx to reset on change
    const [inputs, setInputs] = useState({ weight: 0, reps: 0, duration_seconds: 0 });

    // Rest state management
    type RestState = {
        type: 'set' | 'exercise';
        duration: number;
        nextExerciseName?: string;
    } | null;
    const [restState, setRestState] = useState<RestState>(null);

    const exercises = session?.workout_session_exercises?.sort((a: any, b: any) => a.order_index - b.order_index) || [];
    const currentExercise = exercises[currentExerciseIdx];

    // DEBUG: Log what data we're actually getting from the database
    useEffect(() => {
        if (currentExercise) {
            console.log('🔍 Current Exercise Data:', {
                name: currentExercise.name,
                progression_type: currentExercise.progression_type,
                per_set_config: currentExercise.per_set_config,
                rest_seconds: currentExercise.rest_seconds,
                default_sets: currentExercise.default_sets
            });
        }
    }, [currentExercise?.id]);

    // Find matching template exercise for targets
    const templateExercises = session?.workout_templates?.workout_template_exercises || [];
    const currentTemplateEx = templateExercises.find((te: any) => te.id === currentExercise?.template_exercise_id);
    const sets = currentExercise?.workout_sets?.sort((a: any, b: any) => a.set_number - b.set_number) || [];

    // Auto-load inputs when moving between sets/exercises
    useEffect(() => {
        if (!currentExercise || !currentTemplateEx) return;

        // If the set exists (already logged), load it.
        // The `sets` array might be sparse or ordered. We check if set_number corresponds to currentSetIdx + 1.
        const existingSet = sets.find((s: any) => s.set_number === currentSetIdx + 1);

        if (existingSet) {
            setInputs({
                reps: existingSet.reps || 0,
                weight: Number(existingSet.weight) || 0,
                duration_seconds: existingSet.duration_seconds || 0
            });
        } else {
            // Default to Template or Previous Set
            const prevSet = sets.find((s: any) => s.set_number === currentSetIdx);
            setInputs({
                reps: prevSet?.reps || currentTemplateEx.default_reps || 10,
                weight: Number(prevSet?.weight) || 0,
                duration_seconds: prevSet?.duration_seconds || currentTemplateEx.default_duration_seconds || 0
            });
        }
    }, [currentExercise?.id, currentSetIdx, currentTemplateEx?.id, sets]);

    // Helper: Get current set configuration from per_set_config array
    const getCurrentSetConfig = () => {
        if (!currentExercise) return null;

        // Try to get from per_set_config array
        const perSetConfig = currentExercise.per_set_config;
        if (perSetConfig && Array.isArray(perSetConfig) && perSetConfig[currentSetIdx]) {
            return perSetConfig[currentSetIdx];
        }

        // Fallback to defaults if per_set_config not available
        return {
            set: currentSetIdx + 1,
            reps: currentExercise.default_target_reps || currentExercise.default_reps || 10,
            weight: currentExercise.default_target_weight || currentExercise.default_weight || 0,
            duration_seconds: currentExercise.default_duration_seconds || 60
        };
    };

    const currentSetConfig = getCurrentSetConfig();




    // 3. Mutations
    const logSetMutation = useMutation({
        mutationFn: async (data: { weight: number, reps: number, duration_seconds?: number | null }) => {
            return workoutService.logSet(currentExercise.id, {
                weight: data.weight,
                reps: data.reps,
                durationSeconds: data.duration_seconds || 0
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['session', sessionId] });
        }
    });

    const completeSessionMutation = useMutation({
        mutationFn: () => workoutService.completeWorkout(sessionId!),
        onSuccess: () => {
            navigate(-1);
        }
    });

    const handleNext = async () => {
        if (!currentExercise) return;

        try {
            // 1. Determine exercise type
            const exerciseType = currentExercise.exercise_type || 'weight_reps';

            // VALIDATION: Check required inputs based on exercise type
            if (exerciseType === 'weight_reps') {
                if (!inputs.reps || inputs.reps <= 0) {
                    alert('Please enter reps');
                    return;
                }
                if (inputs.weight === null || inputs.weight === undefined) {
                    alert('Please enter weight');
                    return;
                }
            } else if (exerciseType === 'reps_only') {
                if (!inputs.reps || inputs.reps <= 0) {
                    alert('Please enter reps');
                    return;
                }
            } else if (exerciseType === 'time') {
                if (!inputs.duration_seconds || inputs.duration_seconds <= 0) {
                    alert('Please complete the timer');
                    return;
                }
            }

            // 2. Log the set (AWAIT completion)
            const logData: any = {};
            if (exerciseType === 'time') {
                logData.duration_seconds = inputs.duration_seconds || currentExercise.default_duration_seconds || 60;
                logData.weight = 0;
                logData.reps = 0;
            } else if (exerciseType === 'reps_only') {
                logData.reps = inputs.reps || 0;
                logData.weight = 0;
            } else {
                logData.weight = inputs.weight || 0;
                logData.reps = inputs.reps || 0;
            }

            await logSetMutation.mutateAsync(logData);

            // 3. Navigation Logic with Rest Timers
            const targetSets = currentExercise.default_sets || currentTemplateEx?.default_sets || 3;

            if (currentSetIdx < targetSets - 1) {
                // More sets remaining - check for rest between sets
                if (currentExercise.rest_seconds && currentExercise.rest_seconds > 0) {
                    setRestState({
                        type: 'set',
                        duration: currentExercise.rest_seconds
                    });
                } else {
                    // No rest, advance immediately
                    const newSetIdx = currentSetIdx + 1;
                    setCurrentSetIdx(newSetIdx);
                    await workoutService.updateSessionState?.(sessionId!, currentExerciseIdx, newSetIdx);
                }
            } else if (currentExerciseIdx < exercises.length - 1) {
                // Last set of exercise - check for rest between exercises
                if (currentExercise.rest_between_exercises_enabled && currentExercise.rest_between_exercises_seconds > 0) {
                    const nextExercise = exercises[currentExerciseIdx + 1];
                    setRestState({
                        type: 'exercise',
                        duration: currentExercise.rest_between_exercises_seconds,
                        nextExerciseName: nextExercise?.name
                    });
                } else {
                    // No rest, advance to next exercise
                    const newExIdx = currentExerciseIdx + 1;
                    setCurrentExerciseIdx(newExIdx);
                    setCurrentSetIdx(0);
                    await workoutService.updateSessionState?.(sessionId!, newExIdx, 0);
                }
            } else {
                // Finished Last Set of Last Exercise
                await completeSessionMutation.mutateAsync();
                setShowCompletion(true);
            }
        } catch (err) {
            console.error('Failed to save set:', err);
            alert('Failed to save set. Please try again.');
        }
    };

    const handleRestComplete = async () => {
        if (!restState) return;

        if (restState.type === 'set') {
            // Advance to next set
            const newSetIdx = currentSetIdx + 1;
            setCurrentSetIdx(newSetIdx);
            await workoutService.updateSessionState?.(sessionId!, currentExerciseIdx, newSetIdx);
        } else {
            // Advance to next exercise
            const newExIdx = currentExerciseIdx + 1;
            setCurrentExerciseIdx(newExIdx);
            setCurrentSetIdx(0);
            await workoutService.updateSessionState?.(sessionId!, newExIdx, 0);
        }

        setRestState(null);
    };

    const handleRestSkip = () => {
        handleRestComplete();
    };

    const handlePrev = () => {
        if (currentSetIdx > 0) {
            setCurrentSetIdx(prev => prev - 1);
        } else if (currentExerciseIdx > 0) {
            setCurrentExerciseIdx(prev => prev - 1);
            setCurrentSetIdx(0); // Simplify to start of prev exercise
        }
    };

    const handleEndSession = () => {
        if (confirm("End workout early?")) {
            completeSessionMutation.mutate();
        }
    };

    if (isLoading || !session) {
        return <div className="text-white p-10 text-center">Loading session...</div>;
    }

    if (!currentExercise) return <div className="text-white">No exercises found.</div>;

    const completedSetsCount = sets.length;

    // Show rest screen if resting
    if (restState) {
        if (restState.type === 'set') {
            return (
                <div className="flex flex-col h-screen bg-[#050505]">
                    <SessionHeader
                        title={session.name || "Workout"}
                        subtitle={`Resting before Set ${currentSetIdx + 2}`}
                        startedAt={session.started_at}
                        onEndSession={handleEndSession}
                    />
                    <RestBetweenSets
                        duration={restState.duration}
                        currentSet={currentSetIdx + 1}
                        totalSets={currentExercise.default_sets || 3}
                        onComplete={handleRestComplete}
                        onSkip={handleRestSkip}
                    />
                </div>
            );
        } else {
            return (
                <div className="flex flex-col h-screen bg-[#050505]">
                    <SessionHeader
                        title={session.name || "Workout"}
                        subtitle="Transitioning to next exercise"
                        startedAt={session.started_at}
                        onEndSession={handleEndSession}
                    />
                    <RestBetweenExercises
                        duration={restState.duration}
                        nextExerciseName={restState.nextExerciseName || 'Next Exercise'}
                        onComplete={handleRestComplete}
                        onSkip={handleRestSkip}
                    />
                </div>
            );
        }
    }

    // Regular exercise view
    return (
        <div className="flex flex-col h-screen bg-[#050505]">
            <SessionHeader
                title={session.name || "Workout"}
                subtitle={`Exercise ${currentExerciseIdx + 1} of ${exercises.length}`}
                startedAt={session.started_at}
                onEndSession={handleEndSession}
            />

            <SessionExerciseHeader
                exerciseName={currentExercise.name}
                currentSet={currentSetIdx + 1}
                totalSets={currentExercise.default_sets || 3}
                progressionType={currentExercise.progression_type || 'none'}
                mode={currentExercise.exercise_type || 'weight_reps'}
            />

            {/* Progression Display */}
            {currentExercise.per_set_config && currentExercise.progression_type !== 'none' && (
                <div className="px-4 pt-4">
                    <ProgressionDisplay
                        type={currentExercise.progression_type || 'none'}
                        perSetConfig={currentExercise.per_set_config}
                    />
                </div>
            )}

            <ExerciseTypeView
                exercise={currentExercise}
                currentSetIndex={currentSetIdx}
                currentSetConfig={currentSetConfig}
                inputs={inputs}
                onInputChange={(field, val) => setInputs(prev => ({ ...prev, [field]: val }))}
                onLogSet={handleNext} // Complete Set now saves AND advances
            />

            {/* Chips Rail */}
            <div className="px-4 pb-2 flex gap-2 overflow-x-auto scrollbar-hide">
                {exercises.map((ex: any, idx: number) => (
                    <div
                        key={ex.id}
                        className={`text-[10px] font-bold px-2 py-1 rounded border whitespace-nowrap ${idx === currentExerciseIdx
                            ? 'bg-[#3B82F6] text-white border-[#3B82F6]'
                            : idx < currentExerciseIdx
                                ? 'bg-[#10B981]/20 text-[#10B981] border-transparent'
                                : 'bg-[#1A1D21] text-[#444] border-transparent'
                            }`}
                    >
                        {ex.name}
                    </div>
                ))}
            </div>

            {/* Completion Modal */}
            {showCompletion && (
                <WorkoutCompletionModal
                    sessionData={{
                        name: session.name || 'Workout',
                        totalSets: exercises.reduce((sum: number, ex: any) => sum + (sets.filter((s: any) => s.session_exercise_id === ex.id).length), 0),
                        exercises: exercises.length
                    }}
                    onReturnToDiary={() => navigate('/diary')}
                />
            )}
        </div>
    );
}
