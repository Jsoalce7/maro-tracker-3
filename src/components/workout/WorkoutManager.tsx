import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { workoutService, ExerciseType } from '../../services/workoutService';
import { useAuthStore } from '../../stores/authStore';
import { SetConfigEditor } from './SetConfigEditor';
import { SetConfig, ProgressionType } from '../../types/workout';

interface WorkoutManagerProps {
    onClose: () => void;
}

export function WorkoutManager({ onClose }: WorkoutManagerProps) {
    const { session } = useAuthStore();
    const queryClient = useQueryClient();
    const [view, setView] = useState<'list' | 'edit'>('list');
    const [editingTemplate, setEditingTemplate] = useState<any>(null); // null = creating new

    // Fetch Templates
    const { data: templates = [] } = useQuery({
        queryKey: ['workout_templates', session?.user?.id],
        queryFn: () => session?.user?.id ? workoutService.getTemplates(session.user.id) : [],
        enabled: !!session?.user?.id
    });

    // Fetch Upcoming Schedules
    const { data: schedules = [] } = useQuery({
        queryKey: ['workout_schedule', session?.user?.id],
        queryFn: () => session?.user?.id ? workoutService.getUpcomingSchedules(session.user.id) : [],
        enabled: !!session?.user?.id
    });

    // Delete Mutation
    const deleteMutation = useMutation({
        mutationFn: (id: string) => workoutService.deleteTemplate(id),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['workout_templates'] })
    });

    // Schedule Mutation
    const scheduleMutation = useMutation({
        mutationFn: async (data: { templateId: string, date: string }) => {
            return workoutService.scheduleWorkout(session!.user!.id, data.templateId, data.date);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['workout_schedule'] });
            setSchedulingTemplate(null);
            alert("Workout scheduled!");
        },
        onError: (err) => alert("Failed to schedule")
    });

    // State for Scheduling
    const [schedulingTemplate, setSchedulingTemplate] = useState<any>(null); // Template object

    const handleEdit = (tmpl: any) => {
        setEditingTemplate(tmpl);
        setView('edit');
    };

    const handleCancelEdit = () => {
        setEditingTemplate(null);
        setView('list');
    };

    return (
        <div className="fixed inset-0 z-[70] bg-[#050505] flex flex-col animate-in slide-in-from-bottom-10 duration-200">
            {/* Header */}
            <div className="px-5 py-4 border-b border-[#262626] flex items-center justify-between safe-top">
                <button onClick={view === 'edit' ? handleCancelEdit : onClose} className="p-2 -ml-2 text-[#6B6B6B] hover:text-white">
                    {view === 'edit' ? 'Cancel' : 'Close'}
                </button>
                <h2 className="text-white font-bold text-lg">
                    {view === 'edit' ? (editingTemplate ? 'Edit Template' : 'New Template') : 'Manage Workouts'}
                </h2>
                <div className="w-16 flex justify-end">
                    {view === 'list' && (
                        <button
                            onClick={() => { setEditingTemplate(null); setView('edit'); }}
                            className="text-[#3B82F6] font-medium text-sm"
                        >
                            + New
                        </button>
                    )}
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                {view === 'list' ? (
                    <div className="space-y-3 max-w-2xl mx-auto">
                        {templates.length === 0 ? (
                            <div className="text-center py-10 text-[#666]">
                                <p>No templates yet.</p>
                                <p className="text-xs mt-2">Create one to get started!</p>
                            </div>
                        ) : (
                            templates.map((t: any) => {
                                const upcomingCount = schedules.filter((s: any) => s.template_id === t.id).length;
                                return (
                                    <div key={t.id} className="bg-[#141414] border border-[#262626] rounded-xl p-4 flex flex-col gap-4 group">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <div className="font-bold text-white text-lg">{t.name}</div>
                                                <div className="text-xs text-[#666] mt-0.5 flex gap-2">
                                                    <span>{t.workout_template_exercises?.length || 0} exercises</span>
                                                    {upcomingCount > 0 && <span className="text-amber-500">• Scheduled {upcomingCount} times</span>}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => setSchedulingTemplate(t)}
                                                    className="px-3 py-1.5 bg-[#262626] hover:bg-[#333] text-white text-xs font-bold rounded-lg transition-colors border border-[#333]"
                                                >
                                                    Schedule
                                                </button>
                                                <button
                                                    onClick={() => handleEdit(t)}
                                                    className="px-3 py-1.5 bg-[#262626] hover:bg-[#333] text-white text-xs font-bold rounded-lg transition-colors"
                                                >
                                                    Edit
                                                </button>
                                                <button
                                                    onClick={() => { if (confirm('Delete template?')) deleteMutation.mutate(t.id); }}
                                                    className="p-1.5 text-[#666] hover:text-red-500 transition-colors"
                                                >
                                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                    </svg>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )
                            })
                        )}
                    </div>
                ) : (
                    <EditTemplateForm
                        initialData={editingTemplate}
                        onSave={() => { setView('list'); queryClient.invalidateQueries({ queryKey: ['workout_templates'] }); }}
                    />
                )}
            </div>

            {/* Schedule Modal Overlay */}
            {schedulingTemplate && (
                <div className="fixed inset-0 z-[80] bg-black/80 flex items-center justify-center p-4">
                    <div className="bg-[#1A1D21] border border-[#333] rounded-2xl w-full max-w-sm p-6 space-y-4">
                        <h3 className="text-white font-bold text-lg">Schedule Workout</h3>
                        <p className="text-sm text-[#888]">When do you want to do <b>{schedulingTemplate.name}</b>?</p>

                        <form onSubmit={(e) => {
                            e.preventDefault();
                            const formData = new FormData(e.currentTarget);
                            const date = formData.get('date') as string;
                            if (date) scheduleMutation.mutate({ templateId: schedulingTemplate.id, date });
                        }}>
                            <input
                                type="date"
                                name="date"
                                required
                                className="w-full bg-[#050505] border border-[#333] text-white rounded-xl p-3 outline-none focus:border-[#3B82F6]"
                                defaultValue={new Date().toISOString().split('T')[0]}
                            />
                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={() => setSchedulingTemplate(null)} className="flex-1 py-3 bg-[#333] hover:bg-[#444] text-white rounded-xl font-bold">Cancel</button>
                                <button type="submit" disabled={scheduleMutation.isPending} className="flex-1 py-3 bg-[#3B82F6] hover:bg-[#2563EB] text-white rounded-xl font-bold">
                                    {scheduleMutation.isPending ? 'Scheduling...' : 'Confirm'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

// --- Subcomponent: Edit Form ---

function EditTemplateForm({ initialData, onSave }: { initialData?: any, onSave: () => void }) {
    const { session } = useAuthStore();
    const [name, setName] = useState(initialData?.name || '');
    // Initialize exercises. Handle snake_case from DB vs local camelCase
    const [exercises, setExercises] = useState<any[]>(initialData?.workout_template_exercises || []);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    // Quick Add Exercise State
    const [newExName, setNewExName] = useState('');

    const queryClient = useQueryClient();

    const saveMutation = useMutation({
        mutationFn: async () => {
            console.log('Saving template with data:', { id: initialData?.id, name, exercises });
            return workoutService.saveWorkoutTemplate(session!.user!.id, {
                id: initialData?.id, // undefined = create new
                name,
                exercises
            });
        },
        onSuccess: () => {
            // Invalidate templates query to trigger refetch
            queryClient.invalidateQueries({ queryKey: ['templates'] });
            queryClient.invalidateQueries({ queryKey: ['workouts'] }); // Also invalidate workouts for Diary card
            onSave();
        },
        onError: (err: any) => {
            console.error('Template save error:', err);
            setErrorMsg(err.message || err.error_description || "Failed to save template. Please try again.");
        }
    });

    const handleAddExercise = () => {
        // Auto-generate exercise name if not provided
        const exerciseName = newExName.trim() || `Exercise ${exercises.length + 1}`;

        // Create default per-set config with 1 set (not 3)
        const defaultSetConfig: SetConfig[] = [
            { set: 1, reps: 10, weight: 0, duration_seconds: 60 }
        ];

        setExercises([...exercises, {
            name: exerciseName,
            exercise_type: 'weight_reps' as ExerciseType,
            default_sets: 1,  // Changed from 3 to 1
            default_target_reps: 10,
            default_target_weight: 0,
            per_set_config: defaultSetConfig,
            progression_type: 'none' as ProgressionType,
            rest_seconds: 60,
            rest_between_exercises_enabled: false,
            rest_between_exercises_seconds: 90,
            has_timer: false
        }]);
        setNewExName('');
    };

    const handleUpdateExercise = (idx: number, updates: Partial<any>) => {
        const newEx = [...exercises];
        newEx[idx] = { ...newEx[idx], ...updates };
        setExercises(newEx);
    };

    const getExerciseSummary = (ex: any) => {
        const type = ex.exercise_type || 'weight_reps';
        if (type === 'time') {
            const duration = ex.default_duration_seconds || 60;
            const mins = Math.floor(duration / 60);
            const secs = duration % 60;
            return `${ex.default_sets || 1} sets × ${mins}:${secs.toString().padStart(2, '0')}`;
        }
        if (type === 'weight_reps' || type === 'time_and_weight') {
            const weight = ex.default_target_weight || ex.default_weight || 0;
            return `${ex.default_sets || 3} sets × ${ex.default_target_reps || ex.default_reps || 10} reps @ ${weight} lbs`;
        }
        if (type === 'reps_only') {
            return `${ex.default_sets || 3} sets × ${ex.default_target_reps || ex.default_reps || 10} reps`;
        }
        return `${ex.default_sets || 3} sets × ${ex.default_target_reps || ex.default_reps || 10} reps`;
    };

    const handleRemoveExercise = (idx: number) => {
        const newEx = [...exercises];
        newEx.splice(idx, 1);
        setExercises(newEx);
    };

    const handleSave = () => {
        setErrorMsg(null);
        if (!name.trim()) {
            setErrorMsg("Template name is required");
            return;
        }

        saveMutation.mutate();
    };

    return (
        <div className="max-w-xl mx-auto space-y-6">
            <div className="space-y-2">
                <label className="text-xs font-bold text-[#666] uppercase">Template Name</label>
                <input
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="e.g. Pull Day B"
                    className="w-full bg-[#1A1D21] text-white border border-[#333] rounded-xl p-4 text-lg font-bold outline-none focus:border-[#3B82F6]"
                />
            </div>

            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-[#666] uppercase">Exercises</label>
                </div>

                {exercises.map((ex, idx) => {
                    const exerciseType = ex.exercise_type || 'weight_reps';
                    return (
                        <div key={idx} className="bg-[#1A1D21] border border-[#262626] rounded-xl p-4 space-y-3">
                            {/* Header Row */}
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3 flex-1">
                                    <div className="w-6 h-6 rounded-full bg-[#2A2A2A] text-[#666] flex items-center justify-center text-xs font-bold">
                                        {idx + 1}
                                    </div>
                                    <input
                                        value={ex.name}
                                        onChange={(e) => handleUpdateExercise(idx, { name: e.target.value })}
                                        className="flex-1 bg-transparent text-white font-bold outline-none"
                                        placeholder="Exercise name"
                                    />
                                </div>
                                <button onClick={() => handleRemoveExercise(idx)} className="text-[#666] hover:text-red-500 text-xl">×</button>
                            </div>

                            {/* Type Selector */}
                            <div className="flex gap-2">
                                <button
                                    onClick={() => handleUpdateExercise(idx, { exercise_type: 'time' })}
                                    className={`flex-1 px-3 py-2 text-xs font-bold rounded-lg transition-colors ${exerciseType === 'time' ? 'bg-[#3B82F6] text-white' : 'bg-[#262626] text-[#888] hover:bg-[#333]'
                                        }`}
                                >
                                    Time
                                </button>
                                <button
                                    onClick={() => handleUpdateExercise(idx, { exercise_type: 'weight_reps' })}
                                    className={`flex-1 px-3 py-2 text-xs font-bold rounded-lg transition-colors ${exerciseType === 'weight_reps' ? 'bg-[#3B82F6] text-white' : 'bg-[#262626] text-[#888] hover:bg-[#333]'
                                        }`}
                                >
                                    Weight + Reps
                                </button>
                                <button
                                    onClick={() => handleUpdateExercise(idx, { exercise_type: 'reps_only' })}
                                    className={`flex-1 px-3 py-2 text-xs font-bold rounded-lg transition-colors ${exerciseType === 'reps_only' ? 'bg-[#3B82F6] text-white' : 'bg-[#262626] text-[#888] hover:bg-[#333]'
                                        }`}
                                >
                                    Reps Only
                                </button>
                            </div>

                            {/* Progression Type Selector */}
                            <div className="space-y-2">
                                <label className="text-[10px] text-[#666] uppercase font-bold">Progression</label>
                                <select
                                    value={ex.progression_type || 'none'}
                                    onChange={(e) => handleUpdateExercise(idx, { progression_type: e.target.value as ProgressionType })}
                                    className="w-full bg-[#050505] text-white border border-[#333] rounded-lg px-3 py-2"
                                >
                                    <option value="none">Fixed (same each set)</option>
                                    <option value="increase">Increasing Weight</option>
                                    <option value="decrease">Drop Sets</option>
                                    <option value="pyramid">Pyramid</option>
                                </select>
                            </div>

                            {/* Per-Set Configuration Editor */}
                            {ex.per_set_config && (
                                <SetConfigEditor
                                    exerciseType={exerciseType}
                                    setCount={ex.default_sets || 1}
                                    perSetConfig={ex.per_set_config}
                                    progressionType={ex.progression_type || 'none'}
                                    onChange={(newConfig) => handleUpdateExercise(idx, {
                                        per_set_config: newConfig,
                                        default_sets: newConfig.length  // Update set count when config changes
                                    })}
                                />
                            )}

                            {/* Rest Configuration */}
                            <div className="space-y-3 mt-4 pt-4 border-t border-[#262626]">
                                <div>
                                    <label className="text-[10px] text-[#666] uppercase font-bold">
                                        Rest Between Sets (seconds)
                                    </label>
                                    <input
                                        type="number"
                                        value={ex.rest_seconds || 0}
                                        onChange={(e) => handleUpdateExercise(idx, { rest_seconds: parseInt(e.target.value) || 0 })}
                                        className="w-full bg-[#050505] text-white border border-[#333] rounded-lg px-3 py-2 mt-1"
                                        placeholder="0 = no rest timer"
                                    />
                                </div>

                                <div>
                                    <label className="text-[10px] text-[#666] uppercase font-bold">
                                        Rest After Exercise (seconds)
                                    </label>
                                    <input
                                        type="number"
                                        value={ex.rest_between_exercises_seconds || 0}
                                        onChange={(e) => handleUpdateExercise(idx, {
                                            rest_between_exercises_seconds: parseInt(e.target.value) || 0,
                                            rest_between_exercises_enabled: parseInt(e.target.value) > 0
                                        })}
                                        className="w-full bg-[#050505] text-white border border-[#333] rounded-lg px-3 py-2 mt-1"
                                        placeholder="0 = no rest timer"
                                    />
                                </div>
                            </div>

                            {/* Delete button can be added later if needed */}
                        </div>
                    );
                })}

                {/* Add Exercise Button */}
                <button
                    onClick={handleAddExercise}
                    className="w-full py-3 border-2 border-dashed border-[#444] rounded-xl text-[#888] hover:text-white hover:border-[#666] transition-colors flex items-center justify-center gap-2"
                >
                    <span className="text-xl">+</span>
                    <span>Add Exercise</span>
                </button>

                {errorMsg && (
                    <div className="p-3 bg-red-900/20 border border-red-900/50 rounded-xl text-red-400 text-sm text-center">
                        {errorMsg}
                    </div>
                )}

                <button
                    onClick={handleSave}
                    disabled={saveMutation.isPending}
                    className="w-full py-4 bg-[#3B82F6] hover:bg-[#2563EB] disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-bold shadow-lg shadow-blue-500/20 transition-all mt-8"
                >
                    {saveMutation.isPending ? 'Saving Template...' : 'Save Template'}
                </button>
            </div >
        </div>
    );
}
