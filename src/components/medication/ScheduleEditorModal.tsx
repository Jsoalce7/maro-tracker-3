import { useState, useMemo } from 'react';
import { MedicationProfile } from '../../types/medication';

// Phase 5: Advanced Entry Type
export interface ScheduleEntryInput {
    medication_id: string;
    day_of_week: number;
    time: string;
    dose_override?: string;
}

interface ScheduleEditorModalProps {
    onClose: () => void;
    onSave: (
        schedule: { name: string, description?: string, is_active?: boolean },
        entries: ScheduleEntryInput[]
    ) => Promise<void>;
    onDelete?: () => void;
    initialData?: {
        name: string;
        description?: string;
        is_active?: boolean;
        entries?: ScheduleEntryInput[]; // Phase 5 native
        // Legacy fallback support
        time?: string;
        days_of_week?: number[];
        assignedMedIds?: string[];
    };
    availableMeds: MedicationProfile[];
}

export function ScheduleEditorModal({ onClose, onSave, onDelete, initialData, availableMeds }: ScheduleEditorModalProps) {
    const [name, setName] = useState(initialData?.name || '');
    const [description, setDescription] = useState(initialData?.description || '');
    const [isActive, setIsActive] = useState(initialData?.is_active ?? true); // "Repeat every week" map

    // State: entries
    // Initialize complex entries:
    const [entries, setEntries] = useState<ScheduleEntryInput[]>(() => {
        if (initialData?.entries && initialData.entries.length > 0) {
            return initialData.entries;
        }
        // Fallback: Convert legacy simple schedule to entries
        if (initialData?.assignedMedIds && initialData.assignedMedIds.length > 0) {
            const time = initialData.time || '08:00';
            const days = initialData.days_of_week || [0, 1, 2, 3, 4, 5, 6]; // Default daily if legacy unset
            const newEntries: ScheduleEntryInput[] = [];
            days.forEach(day => {
                initialData.assignedMedIds!.forEach(medId => {
                    newEntries.push({
                        medication_id: medId,
                        day_of_week: day,
                        time: time,
                        dose_override: ''
                    });
                });
            });
            return newEntries;
        }
        return [];
    });

    // UI State
    const [selectedDay, setSelectedDay] = useState<number>(new Date().getDay()); // Default to today
    const [isAddingEntry, setIsAddingEntry] = useState(false);

    // New Entry Form State
    const [newEntryMedId, setNewEntryMedId] = useState('');
    const [newEntryTime, setNewEntryTime] = useState('08:00');
    const [newEntryDose, setNewEntryDose] = useState('');

    const daysMap = [
        { val: 1, label: 'Mon' },
        { val: 2, label: 'Tue' },
        { val: 3, label: 'Wed' },
        { val: 4, label: 'Thu' },
        { val: 5, label: 'Fri' },
        { val: 6, label: 'Sat' },
        { val: 0, label: 'Sun' },
    ];

    const currentDayEntries = useMemo(() =>
        entries.filter(e => e.day_of_week === selectedDay).sort((a, b) => a.time.localeCompare(b.time)),
        [entries, selectedDay]
    );

    const handleAddEntry = () => {
        if (!newEntryMedId) return;
        setEntries([...entries, {
            medication_id: newEntryMedId,
            day_of_week: selectedDay,
            time: newEntryTime,
            dose_override: newEntryDose
        }]);
        // Reset form but keep time for convenience?
        setNewEntryMedId('');
        setNewEntryDose('');
        setIsAddingEntry(false);
    };

    const removeEntry = (indexInCurrentDay: number) => {
        const entryToRemove = currentDayEntries[indexInCurrentDay];
        // Filter out ONE matching instance (in case of duplicates, strictly we match obj ref if we had it, but value match is ok here)
        // Better: use direct index from full list? No, filtering makes it hard.
        // Let's filter out by value match.
        // Actually, creating a temp ID would be safer, but for now:
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
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
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
                                placeholder="e.g. Morning Stack"
                                className="w-full bg-[#2C2C2E] border-none rounded-xl py-3 px-4 text-white placeholder-[#5C5C5E] focus:ring-2 focus:ring-[#0A84FF]"
                            />
                        </div>
                        <div>
                            <label className="block text-[#8E8E93] text-xs font-bold uppercase tracking-wider mb-2">Description / Notes (Optional)</label>
                            <input
                                value={description}
                                onChange={e => setDescription(e.target.value)}
                                placeholder="e.g. Take with food"
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
                            {isActive ? "Schedule is active and will generate tasks." : "Schedule is paused. No tasks will be generated."}
                        </p>
                    </div>

                    <hr className="border-[#2C2C2E]" />

                    {/* Weekly Pattern Editor */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <label className="block text-[#8E8E93] text-xs font-bold uppercase tracking-wider">Weekly Pattern</label>
                            <span className="text-xs text-[#5C5C5E]">{entries.length} items total</span>
                        </div>

                        {/* Day Tabs */}
                        <div className="flex bg-[#2C2C2E] p-1 rounded-xl overflow-x-auto no-scrollbar">
                            {daysMap.map(day => (
                                <button
                                    key={day.val}
                                    onClick={() => setSelectedDay(day.val)}
                                    className={`flex-1 min-w-[3rem] py-2 rounded-lg font-bold text-xs transition-all ${selectedDay === day.val
                                            ? 'bg-[#0A84FF] text-white shadow-md'
                                            : 'text-[#8E8E93] hover:text-white'
                                        }`}
                                >
                                    {day.label}
                                    {entries.some(e => e.day_of_week === day.val) && (
                                        <div className="w-1 h-1 bg-[#30D158] rounded-full mx-auto mt-1" />
                                    )}
                                </button>
                            ))}
                        </div>

                        {/* Entries for Selected Day */}
                        <div className="min-h-[200px] bg-[#2C2C2E]/30 rounded-2xl p-4 border border-[#2C2C2E]">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="font-bold text-white">
                                    {daysMap.find(d => d.val === selectedDay)?.label} Schedule
                                </h3>
                                {!isAddingEntry && (
                                    <button
                                        onClick={() => setIsAddingEntry(true)}
                                        className="text-[#0A84FF] text-xs font-bold flex items-center gap-1 hover:opacity-80"
                                    >
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                                        ADD ENTRY
                                    </button>
                                )}
                            </div>

                            <div className="space-y-3">
                                {currentDayEntries.length === 0 && !isAddingEntry && (
                                    <p className="text-center text-[#5C5C5E] text-sm py-8 italic">No medications scheduled for this day.</p>
                                )}

                                {currentDayEntries.map((entry, idx) => {
                                    const med = availableMeds.find(m => m.id === entry.medication_id);
                                    return (
                                        <div key={idx} className="bg-[#2C2C2E] p-3 rounded-xl flex items-center justify-between group">
                                            <div className="flex items-center gap-3">
                                                <div className="bg-[#3A3A3C] px-2 py-1 rounded text-xs font-mono font-bold text-[#0A84FF]">
                                                    {entry.time}
                                                </div>
                                                <div>
                                                    <div className="font-bold text-sm text-white">{med?.name || 'Unknown Med'}</div>
                                                    {entry.dose_override && (
                                                        <div className="text-xs text-[#8E8E93]">{entry.dose_override}</div>
                                                    )}
                                                </div>
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
                                                    <label className="text-[10px] uppercase font-bold text-[#8E8E93] block mb-1">Medication</label>
                                                    <select
                                                        value={newEntryMedId}
                                                        onChange={e => setNewEntryMedId(e.target.value)}
                                                        className="w-full bg-[#1C1C1E] rounded-lg px-2 py-2 text-sm text-white border-none focus:ring-1 focus:ring-[#0A84FF]"
                                                    >
                                                        <option value="">Select Med...</option>
                                                        {availableMeds.map(m => (
                                                            <option key={m.id} value={m.id}>{m.name}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            </div>
                                            <div>
                                                <label className="text-[10px] uppercase font-bold text-[#8E8E93] block mb-1">Dose (Optional)</label>
                                                <input
                                                    value={newEntryDose}
                                                    onChange={e => setNewEntryDose(e.target.value)}
                                                    placeholder="e.g. 1 pill"
                                                    className="w-full bg-[#1C1C1E] rounded-lg px-2 py-2 text-sm text-white border-none focus:ring-1 focus:ring-[#0A84FF]"
                                                />
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
                                                    disabled={!newEntryMedId}
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
