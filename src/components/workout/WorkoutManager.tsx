import { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { workoutService, ExerciseType } from '../../services/workoutService';
import { useAuthStore } from '../../stores/authStore';
import { SetConfigEditor } from './SetConfigEditor';
import { SetConfig, ProgressionType } from '../../types/workout';
import { workoutScheduleStorage, WorkoutScheduleDefinition, WorkoutScheduleEntry } from '../../services/workoutScheduleStorage';
import { WorkoutScheduleEditorModal } from './WorkoutScheduleEditorModal';
import { getTodayLocal } from '../../utils/date';

interface WorkoutManagerProps {
    onClose: () => void;
}

export function WorkoutManager({ onClose }: WorkoutManagerProps) {
    const { session } = useAuthStore();
    const queryClient = useQueryClient();

    // View State
    const [view, setView] = useState<'list' | 'edit'>('list'); // 'edit' = template editor
    const [editingTemplate, setEditingTemplate] = useState<any>(null); // null = creating new

    // Filter State
    const [filterMode, setFilterMode] = useState<'template' | 'schedule'>('template');

    // Schedule Editor State
    const [isScheduleEditorOpen, setIsScheduleEditorOpen] = useState(false);
    const [editingScheduleId, setEditingScheduleId] = useState<string | null>(null);

    // Filter Logic State
    const [templateFilter, setTemplateFilter] = useState<'All' | string>('All'); // For future catagories

    // Fetch Templates
    const { data: templates = [] } = useQuery({
        queryKey: ['workout_templates', session?.user?.id],
        queryFn: () => session?.user?.id ? workoutService.getTemplates(session.user.id) : [],
        enabled: !!session?.user?.id
    });

    // Fetch Local Schedules
    const { data: scheduleDefinitions = [], refetch: refetchSchedules } = useQuery({
        queryKey: ['workout_schedule_definitions', session?.user?.id],
        queryFn: async () => session?.user?.id ? workoutScheduleStorage.getDefinitions(session.user.id) : [],
        enabled: !!session?.user?.id
    });

    // Delete Template Mutation
    const deleteTemplateMutation = useMutation({
        mutationFn: (id: string) => workoutService.deleteTemplate(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['workout_templates'] });
            setView('list'); // Return to list if deleting from edit view
        }
    });

    // Save Schedule Definition Logic
    const handleSaveSchedule = async (
        meta: { name: string, description?: string, is_active: boolean },
        entries: WorkoutScheduleEntry[]
    ) => {
        if (!session?.user?.id) return;
        const userId = session.user.id;

        // 1. Save Definition Locally
        const def: WorkoutScheduleDefinition = {
            id: editingScheduleId || `sch_${Date.now()}`,
            name: meta.name,
            description: meta.description,
            is_active: meta.is_active,
            entries: entries,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };
        workoutScheduleStorage.saveDefinition(userId, def);

        // 2. Generate Future Workouts (if active)
        if (meta.is_active) {
            // Very simple logic: Generate for next 4 weeks
            // This relies on workoutService.scheduleWorkout which is upsert. 
            // We loop through next 28 days.
            const today = new Date();
            const daysMap: { [key: string]: number } = {
                'Sunday': 0, 'Monday': 1, 'Tuesday': 2, 'Wednesday': 3, 'Thursday': 4, 'Friday': 5, 'Saturday': 6
            };

            const promises = [];
            for (let i = 0; i < 28; i++) {
                const datesToCheck = new Date(today);
                datesToCheck.setDate(today.getDate() + i);
                const dayName = Object.keys(daysMap).find(key => daysMap[key] === datesToCheck.getDay());

                // Find entries for this day
                const dayEntries = entries.filter(e => e.day_of_week === dayName);

                for (const entry of dayEntries) {
                    const dateStr = datesToCheck.toISOString().split('T')[0];
                    promises.push(workoutService.scheduleWorkout(userId, entry.template_id, dateStr));
                }
            }
            await Promise.all(promises);
            // Invalidate schedule query for calendar/diary
            queryClient.invalidateQueries({ queryKey: ['workout_schedule'] });
        }

        refetchSchedules();
        setIsScheduleEditorOpen(false);
    };

    const handleDeleteSchedule = (id: string) => {
        if (!session?.user?.id) return;
        if (confirm("Delete this schedule plan? (Existing logs will remain, but future auto-scheduling will stop)")) {
            workoutScheduleStorage.deleteDefinition(session.user.id, id);
            refetchSchedules();
            setIsScheduleEditorOpen(false);
        }
    };

    // Filter Logic
    const filteredItems = useMemo(() => {
        if (filterMode === 'template') {
            return templates;
        } else {
            return scheduleDefinitions;
        }
    }, [filterMode, templates, scheduleDefinitions]);

    // Handlers
    const startEditTemplate = (tmpl: any) => {
        setEditingTemplate(tmpl);
        setView('edit');
    };

    const startCreateSchedule = () => {
        setEditingScheduleId(null);
        setIsScheduleEditorOpen(true);
    };

    const startEditSchedule = (def: WorkoutScheduleDefinition) => {
        setEditingScheduleId(def.id);
        setIsScheduleEditorOpen(true);
    };

    // --- RENDER ---

    return (
        <div className="fixed inset-0 z-[70] bg-[#050505] flex flex-col md:flex-row animate-in slide-in-from-bottom-10 duration-200">

            {/* LEFT SIDEBAR */}
            <div className="w-full md:w-64 bg-[#1C1C1E] border-r border-[#2C2C2E] flex flex-col h-auto md:h-screen sticky top-0 md:relative z-10">
                <div className="p-4 border-b border-[#2C2C2E] flex items-center gap-3 safe-top">
                    <button onClick={onClose} className="p-2 hover:bg-[#2C2C2E] rounded-full text-[#8E8E93]">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                    </button>
                    <h1 className="text-lg font-bold text-white">Workouts</h1>
                </div>

                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                    <div className="mb-8">
                        <h3 className="text-[#8E8E93] text-xs font-bold uppercase tracking-wider mb-3">Templates</h3>
                        <div className="space-y-1">
                            <button
                                onClick={() => { setFilterMode('template'); setView('list'); }}
                                className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${filterMode === 'template' ? 'bg-[#0A84FF] text-white' : 'text-[#8E8E93] hover:bg-[#2C2C2E] hover:text-white'}`}
                            >
                                All Workouts
                            </button>
                        </div>
                    </div>

                    <div>
                        <div className="flex justify-between items-center mb-3">
                            <h3 className="text-[#8E8E93] text-xs font-bold uppercase tracking-wider">Schedules</h3>
                        </div>
                        <div className="space-y-1">
                            <button
                                onClick={() => { setFilterMode('schedule'); setView('list'); }}
                                className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${filterMode === 'schedule' ? 'bg-[#0A84FF] text-white' : 'text-[#8E8E93] hover:bg-[#2C2C2E] hover:text-white'}`}
                            >
                                Schedules
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* RIGHT MAIN CONTENT */}
            <div className="flex-1 h-screen overflow-y-auto bg-black p-4 md:p-8 custom-scrollbar">

                {view === 'edit' ? (
                    <div className="max-w-2xl mx-auto pt-10 pb-20">
                        <div className="flex items-center gap-4 mb-6">
                            <button onClick={() => setView('list')} className="text-[#8E8E93] hover:text-white flex items-center gap-2">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                                Back
                            </button>
                            <h2 className="text-2xl font-bold text-white">{editingTemplate ? 'Edit Workout' : 'New Workout'}</h2>
                        </div>
                        <EditTemplateForm
                            initialData={editingTemplate}
                            onSave={() => { setView('list'); queryClient.invalidateQueries({ queryKey: ['workout_templates'] }); }}
                            onDelete={editingTemplate ? () => deleteTemplateMutation.mutate(editingTemplate.id) : undefined}
                        />
                    </div>
                ) : (
                    <>
                        {/* Header */}
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 pt-10 md:pt-0">
                            <div>
                                <h2 className="text-2xl font-bold text-white">
                                    {filterMode === 'template' ? 'All Workouts' : 'Schedules'}
                                    <span className="text-[#8E8E93] text-sm font-normal ml-3">
                                        {filteredItems.length} {filterMode === 'template' ? (filteredItems.length === 1 ? 'template' : 'templates') : (filteredItems.length === 1 ? 'plan' : 'plans')}
                                    </span>
                                </h2>
                                <p className="text-sm text-[#8E8E93]">
                                    {filterMode === 'template' ? 'Manage your base workout templates.' : 'Manage recurring weekly plans.'}
                                </p>
                            </div>

                            <button
                                onClick={() => {
                                    if (filterMode === 'template') {
                                        setEditingTemplate(null);
                                        setView('edit');
                                    } else {
                                        startCreateSchedule();
                                    }
                                }}
                                className="bg-[#0A84FF] hover:bg-[#007AFF] text-white px-4 py-2 rounded-full font-bold flex items-center gap-2 transition-colors shadow-lg shadow-blue-500/20"
                            >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                                {filterMode === 'template' ? 'New Workout' : 'Add Schedule'}
                            </button>
                        </div>

                        {/* TABS (Placeholder for now matching Meds) */}
                        <div className="flex gap-4 mb-6 border-b border-[#2C2C2E] pb-1">
                            <button className="pb-2 px-1 font-bold text-white border-b-2 border-[#0A84FF] transition-colors">
                                {filterMode === 'template' ? 'My Workouts' : 'My Plans'}
                            </button>
                            <button className="pb-2 px-1 font-bold text-[#8E8E93] hover:text-white transition-colors">
                                History Log
                            </button>
                            <button className="pb-2 px-1 font-bold text-[#8E8E93] hover:text-white transition-colors">
                                Analytics
                            </button>
                        </div>

                        {/* GRID CONTENT */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-20">

                            {/* TEMPLATES MODE */}
                            {filterMode === 'template' && (
                                <>
                                    {templates.map((tmpl: any) => (
                                        <div
                                            key={tmpl.id}
                                            onClick={() => startEditTemplate(tmpl)}
                                            className="bg-[#1C1C1E] border border-[#2C2C2E] rounded-2xl p-4 hover:bg-[#2C2C2E] transition-all cursor-pointer group relative overflow-hidden"
                                        >
                                            <div className="flex justify-between items-start mb-2">
                                                <div>
                                                    <h3 className="font-bold text-lg text-white leading-tight">{tmpl.name}</h3>
                                                    <p className="text-[#8E8E93] text-xs mt-1">
                                                        {tmpl.workout_template_exercises?.length || 0} exercises
                                                    </p>
                                                </div>
                                            </div>
                                            {/* Visual Preview of Muscle Groups (if available) or just simple badges */}
                                            <div className="flex flex-wrap gap-1.5 mt-4">
                                                <span className="bg-[#2C2C2E] border border-[#3A3A3C] text-[#8E8E93] text-[10px] uppercase font-bold px-2 py-0.5 rounded-md">
                                                    Template
                                                </span>
                                            </div>

                                            {/* Edit Action */}
                                            <button className="absolute top-2 right-2 p-2 bg-[#2C2C2E] rounded-full text-[#0A84FF] opacity-0 group-hover:opacity-100 transition-opacity hover:bg-[#333]">
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                            </button>
                                        </div>
                                    ))}
                                    {templates.length === 0 && (
                                        <div className="col-span-full py-20 text-center text-[#5C5C5E] border-2 border-dashed border-[#2C2C2E] rounded-3xl">
                                            <p className="mb-2 text-3xl">💪</p>
                                            <p>No workout templates yet.</p>
                                            <button onClick={() => { setEditingTemplate(null); setView('edit'); }} className="text-[#0A84FF] font-bold mt-2">Create one</button>
                                        </div>
                                    )}
                                </>
                            )}

                            {/* SCHEDULES MODE */}
                            {filterMode === 'schedule' && (
                                <>
                                    {scheduleDefinitions.map((def: WorkoutScheduleDefinition) => (
                                        <div
                                            key={def.id}
                                            onClick={() => startEditSchedule(def)}
                                            className="bg-[#1C1C1E] border border-[#2C2C2E] rounded-2xl p-4 hover:bg-[#2C2C2E] transition-all cursor-pointer group relative overflow-hidden"
                                        >
                                            <div className="flex justify-between items-start mb-2">
                                                <div>
                                                    <h3 className="font-bold text-lg text-white leading-tight">{def.name}</h3>
                                                    {def.description && <p className="text-[#8E8E93] text-xs mt-1 line-clamp-1">{def.description}</p>}
                                                </div>
                                                <div className={`w-2 h-2 rounded-full ${def.is_active ? 'bg-[#30D158]' : 'bg-[#3A3A3C]'}`} />
                                            </div>

                                            <div className="mt-4 space-y-1">
                                                {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => {
                                                    const hasEntry = def.entries.some(e => e.day_of_week === day);
                                                    return hasEntry ? (
                                                        <div key={day} className="flex items-center justify-between text-[10px] text-[#8E8E93]">
                                                            <span className="uppercase font-bold">{day.slice(0, 3)}</span>
                                                            <div className="w-1.5 h-1.5 bg-[#0A84FF] rounded-full" />
                                                        </div>
                                                    ) : null;
                                                })}
                                                {def.entries.length === 0 && <p className="text-[10px] text-[#5C5C5E] italic">No workouts set</p>}
                                            </div>

                                            {/* Delete Action (Top right) */}
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleDeleteSchedule(def.id); }}
                                                className="absolute top-2 right-2 p-2 bg-[#2C2C2E] rounded-full text-red-500 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500/20"
                                            >
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                            </button>
                                        </div>
                                    ))}
                                    {scheduleDefinitions.length === 0 && (
                                        <div className="col-span-full py-20 text-center text-[#5C5C5E] border-2 border-dashed border-[#2C2C2E] rounded-3xl">
                                            <p className="mb-2 text-3xl">📅</p>
                                            <p>No recurring schedules.</p>
                                            <button onClick={startCreateSchedule} className="text-[#0A84FF] font-bold mt-2">Create a plan</button>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </>
                )}
            </div>

            {/* MODALS */}
            {isScheduleEditorOpen && (
                <WorkoutScheduleEditorModal
                    onClose={() => { setIsScheduleEditorOpen(false); setEditingScheduleId(null); }}
                    onSave={handleSaveSchedule}
                    onDelete={editingScheduleId ? () => handleDeleteSchedule(editingScheduleId) : undefined}
                    initialData={editingScheduleId ? workoutScheduleStorage.getDefinition(session!.user!.id, editingScheduleId) : undefined}
                    availableTemplates={templates}
                />
            )}
        </div>
    );
}

// --- Subcomponent: Edit Form (Reused Logic) ---
// Simplified and styled to match new dark theme UI better if needed, but logic remains.

function EditTemplateForm({ initialData, onSave, onDelete }: { initialData?: any, onSave: () => void, onDelete?: () => void }) {
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

                <div className="flex gap-3 mt-8">
                    {onDelete && (
                        <button
                            onClick={() => { if (confirm("Delete this template?")) onDelete(); }}
                            className="px-6 py-4 bg-red-900/20 text-red-400 hover:bg-red-900/40 rounded-xl font-bold transition-colors"
                        >
                            Delete
                        </button>
                    )}
                    <button
                        onClick={handleSave}
                        disabled={saveMutation.isPending}
                        className="flex-1 py-4 bg-[#3B82F6] hover:bg-[#2563EB] disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-bold shadow-lg shadow-blue-500/20 transition-all"
                    >
                        {saveMutation.isPending ? 'Saving Template...' : 'Save Template'}
                    </button>
                </div>
            </div >
        </div>
    );
}
