import { useState, useMemo } from 'react';
import { WorkoutScheduleDefinition, WorkoutScheduleEntry } from '../../services/workoutScheduleStorage';

interface WorkoutTemplate {
    id: string;
    name: string;
}

interface WorkoutScheduleEditorModalProps {
    onClose: () => void;
    onSave: (
        schedule: { name: string, description?: string, is_active: boolean },
        entries: WorkoutScheduleEntry[]
    ) => Promise<void>;
    onDelete?: () => void;
    initialData?: WorkoutScheduleDefinition;
    availableTemplates: WorkoutTemplate[];
}

export function WorkoutScheduleEditorModal({ onClose, onSave, onDelete, initialData, availableTemplates }: WorkoutScheduleEditorModalProps) {
    const [name, setName] = useState(initialData?.name || '');
    const [description, setDescription] = useState(initialData?.description || '');
    // Default to true for new schedules
    const [isActive, setIsActive] = useState(initialData?.is_active ?? true);

    const [entries, setEntries] = useState<WorkoutScheduleEntry[]>(initialData?.entries || []);

    // UI State
    const [selectedDay, setSelectedDay] = useState<string>('Monday');
    const [isAddingEntry, setIsAddingEntry] = useState(false);

    // New Entry Form State
    const [newEntryTemplateId, setNewEntryTemplateId] = useState('');
    const [newEntryTime, setNewEntryTime] = useState('08:00');

    const daysMap = [
        'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'
    ];

    const currentDayEntries = useMemo(() =>
        entries.filter(e => e.day_of_week === selectedDay).sort((a, b) => (a.time || '').localeCompare(b.time || '')),
        [entries, selectedDay]
    );

    const handleAddEntry = () => {
        if (!newEntryTemplateId) return;
        setEntries([...entries, {
            template_id: newEntryTemplateId,
            day_of_week: selectedDay,
            time: newEntryTime
        }]);
        setNewEntryTemplateId('');
        setIsAddingEntry(false);
    };

    const removeEntry = (indexInCurrentDay: number) => {
        const entryToRemove = currentDayEntries[indexInCurrentDay];
        const idx = entries.indexOf(entryToRemove);
        if (idx > -1) {
            const newArr = [...entries];
            newArr.splice(idx, 1);
            setEntries(newArr);
        }
    };

    const handleSave = async () => {
        if (!name) return alert("Schedule Name is required");
        await onSave(
            { name, description, is_active: isActive },
            entries
        );
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-[#1C1C1E] w-full max-w-lg rounded-3xl overflow-hidden flex flex-col shadow-2xl border border-[#2C2C2E] max-h-[90vh]">

                <div className="p-6 border-b border-[#2C2C2E] flex justify-between items-center bg-[#1C1C1E] shrink-0">
                    <h2 className="text-xl font-bold text-white">{initialData ? 'Edit Schedule' : 'New Schedule'}</h2>
                    <button onClick={onClose} className="p-2 bg-[#2C2C2E] rounded-full hover:bg-[#3A3A3C]">
                        <svg className="w-5 h-5 text-[#8E8E93]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar flex-1">

                    {/* Meta Info */}
                    <div className="space-y-4">
                        <div>
                            <label className="block text-[#8E8E93] text-xs font-bold uppercase tracking-wider mb-2">Schedule Name</label>
                            <input
                                autoFocus
                                value={name}
                                onChange={e => setName(e.target.value)}
                                placeholder="e.g. Weekly Split"
                                className="w-full bg-[#2C2C2E] border-none rounded-xl py-3 px-4 text-white placeholder-[#5C5C5E] focus:ring-2 focus:ring-[#0A84FF]"
                            />
                        </div>
                        <div>
                            <label className="block text-[#8E8E93] text-xs font-bold uppercase tracking-wider mb-2">Description (Optional)</label>
                            <input
                                value={description}
                                onChange={e => setDescription(e.target.value)}
                                placeholder="e.g. My primary routine"
                                className="w-full bg-[#2C2C2E] border-none rounded-xl py-3 px-4 text-white placeholder-[#5C5C5E] focus:ring-2 focus:ring-[#0A84FF]"
                            />
                        </div>
                        <div className="flex items-center justify-between bg-[#2C2C2E] p-3 rounded-xl">
                            <span className="text-white font-medium pl-1">Repeat every week</span>
                            <div
                                onClick={() => setIsActive(!isActive)}
                                className={`w-12 h-7 rounded-full transition-colors flex items-center p-1 cursor-pointer ${isActive ? 'bg-[#30D158]' : 'bg-[#3A3A3C]'}`}
                            >
                                <div className={`w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${isActive ? 'translate-x-5' : 'translate-x-0'}`} />
                            </div>
                        </div>
                        <p className="text-xs text-[#5C5C5E] px-1">
                            {isActive ? "Schedule will automatically populate your future workouts." : "Schedule is paused."}
                        </p>
                    </div>

                    <hr className="border-[#2C2C2E]" />

                    {/* Weekly Pattern Editor */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <label className="block text-[#8E8E93] text-xs font-bold uppercase tracking-wider">Weekly Pattern</label>
                            <span className="text-xs text-[#5C5C5E]">{entries.length} workouts scheduled</span>
                        </div>

                        {/* Day Tabs */}
                        <div className="flex bg-[#2C2C2E] p-1 rounded-xl overflow-x-auto no-scrollbar">
                            {daysMap.map(day => (
                                <button
                                    key={day}
                                    onClick={() => setSelectedDay(day)}
                                    className={`flex-1 min-w-[3rem] py-2 rounded-lg font-bold text-xs transition-all ${selectedDay === day
                                        ? 'bg-[#0A84FF] text-white shadow-md'
                                        : 'text-[#8E8E93] hover:text-white'
                                        }`}
                                >
                                    {day.slice(0, 3)}
                                    {entries.some(e => e.day_of_week === day) && (
                                        <div className="w-1 h-1 bg-[#30D158] rounded-full mx-auto mt-1" />
                                    )}
                                </button>
                            ))}
                        </div>

                        {/* Entries for Selected Day */}
                        <div className="min-h-[200px] bg-[#2C2C2E]/30 rounded-2xl p-4 border border-[#2C2C2E]">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="font-bold text-white">
                                    {selectedDay}
                                </h3>
                                {!isAddingEntry && (
                                    <button
                                        onClick={() => setIsAddingEntry(true)}
                                        className="text-[#0A84FF] text-xs font-bold flex items-center gap-1 hover:opacity-80"
                                    >
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                                        ADD WORKOUT
                                    </button>
                                )}
                            </div>

                            <div className="space-y-3">
                                {currentDayEntries.length === 0 && !isAddingEntry && (
                                    <p className="text-center text-[#5C5C5E] text-sm py-8 italic">Rest Day</p>
                                )}

                                {currentDayEntries.map((entry, idx) => {
                                    const tmpl = availableTemplates.find(t => t.id === entry.template_id);
                                    return (
                                        <div key={idx} className="bg-[#2C2C2E] p-3 rounded-xl flex items-center justify-between group">
                                            <div className="flex items-center gap-3">
                                                {entry.time && (
                                                    <div className="bg-[#3A3A3C] px-2 py-1 rounded text-xs font-mono font-bold text-[#0A84FF]">
                                                        {entry.time}
                                                    </div>
                                                )}
                                                <div className="font-bold text-sm text-white">{tmpl?.name || 'Unknown Workout'}</div>
                                            </div>
                                            <button
                                                onClick={() => removeEntry(idx)}
                                                className="opacity-0 group-hover:opacity-100 p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                                            >
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                            </button>
                                        </div>
                                    );
                                })}

                                {isAddingEntry && (
                                    <div className="bg-[#2C2C2E] border border-[#0A84FF] p-3 rounded-xl animate-in fade-in slide-in-from-top-2">
                                        <div className="space-y-3">
                                            <div className="flex gap-2">
                                                <div className="flex-1">
                                                    <label className="text-[10px] uppercase font-bold text-[#8E8E93] block mb-1">Time</label>
                                                    <input
                                                        type="time"
                                                        value={newEntryTime}
                                                        onChange={e => setNewEntryTime(e.target.value)}
                                                        className="w-full bg-[#1C1C1E] rounded-lg px-2 py-2 text-sm text-white border-none focus:ring-1 focus:ring-[#0A84FF]"
                                                    />
                                                </div>
                                                <div className="flex-[2]">
                                                    <label className="text-[10px] uppercase font-bold text-[#8E8E93] block mb-1">Workout Template</label>
                                                    <select
                                                        value={newEntryTemplateId}
                                                        onChange={e => setNewEntryTemplateId(e.target.value)}
                                                        className="w-full bg-[#1C1C1E] rounded-lg px-2 py-2 text-sm text-white border-none focus:ring-1 focus:ring-[#0A84FF]"
                                                    >
                                                        <option value="">Select Workout...</option>
                                                        {availableTemplates.map(t => (
                                                            <option key={t.id} value={t.id}>{t.name}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            </div>
                                            <div className="flex gap-2 pt-1">
                                                <button
                                                    onClick={() => setIsAddingEntry(false)}
                                                    className="flex-1 py-1.5 rounded-lg text-xs font-bold text-[#8E8E93] hover:bg-[#3A3A3C]"
                                                >
                                                    Cancel
                                                </button>
                                                <button
                                                    onClick={handleAddEntry}
                                                    disabled={!newEntryTemplateId}
                                                    className="flex-1 py-1.5 rounded-lg text-xs font-bold bg-[#0A84FF] text-white disabled:opacity-50 hover:bg-[#007AFF]"
                                                >
                                                    Add
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-6 border-t border-[#2C2C2E] flex justify-between bg-[#1C1C1E] shrink-0">
                    <div>
                        {onDelete && (
                            <button onClick={onDelete} className="text-red-500 font-bold text-sm px-2 py-2 hover:bg-red-500/10 rounded-lg transition-colors">
                                Delete Schedule
                            </button>
                        )}
                    </div>
                    <div className="flex gap-3">
                        <button onClick={onClose} className="px-5 py-2 rounded-full font-bold text-[#8E8E93] hover:text-white transition-colors">
                            Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            className="bg-[#0A84FF] hover:bg-[#007AFF] text-white px-6 py-2 rounded-full font-bold transition-all"
                        >
                            Save
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
}
