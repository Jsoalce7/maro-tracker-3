import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMedication } from '../hooks/useMedication';
import { MedicationFormModal } from '../components/medication/MedicationFormModal';
import { ScheduleEditorModal, ScheduleEntryInput } from '../components/medication/ScheduleEditorModal';
import { MedicationProfile } from '../types/medication';
import { medicationService } from '../services/medicationService';
import { useAuthStore } from '../stores/authStore';

export function MedicationManagerPage() {
    const navigate = useNavigate();
    const today = new Date().toISOString().split('T')[0];
    const {
        profiles,
        customSchedules,
        stats,
        logDose,
        deleteLog,
        addMedication,
        updateMedicationProfile,
        deleteMedication,
        createSchedule,
        updateSchedule,
        deleteSchedule,
        assignMedsToSchedule,
        saveComplexSchedule,
        isAdding
    } = useMedication(today);

    // UI State
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editId, setEditId] = useState<string | undefined>(undefined);

    // Filters
    const [filterMode, setFilterMode] = useState<'category' | 'schedule'>('category');
    const [categoryFilter, setCategoryFilter] = useState<string>('All');
    const [scheduleFilter, setScheduleFilter] = useState<string>('All'); // 'All' | scheduleId | 'Unassigned' | 'Daily'

    // Add to Daily Modal
    const [isAddToDailyOpen, setIsAddToDailyOpen] = useState(false);

    // Schedule Management UI
    const [isScheduleEditorOpen, setIsScheduleEditorOpen] = useState(false);
    const [editingScheduleId, setEditingScheduleId] = useState<string | null>(null);
    const [isMobileScheduleSheetOpen, setIsMobileScheduleSheetOpen] = useState(false);


    const startCreateSchedule = () => {
        setEditingScheduleId(null);
        setIsScheduleEditorOpen(true);
    };

    const startEditSchedule = (id: string, e?: React.MouseEvent) => {
        e?.stopPropagation();
        setEditingScheduleId(id);
        setIsScheduleEditorOpen(true);
    };

    const handleDeleteSchedule = async (id: string) => {
        if (confirm("Delete this schedule? Medications will be unassigned.")) {
            await deleteSchedule(id);
            if (scheduleFilter === id) setScheduleFilter('All');
        }
    };

    const handleSaveSchedule = async (
        meta: { name: string, description?: string, is_active?: boolean },
        entries: ScheduleEntryInput[]
    ) => {
        // Prepare Data for Phase 5 Save
        const scheduleData = {
            id: editingScheduleId || undefined,
            name: meta.name,
            description: meta.description,
            is_active: meta.is_active
        };

        // Convert UI Entries to Service Entries (add medication_id to each if needed, but UI gives ample info)
        // Service expects: { medication_id, day_of_week, time, dose_override }
        // UI provides exactly that in ScheduleEntryInput

        await saveComplexSchedule({
            userId: session?.user?.id || '',
            scheduleData,
            entries
        });

        setIsScheduleEditorOpen(false);
    };

    // Filter Logic
    const filteredProfiles = useMemo(() => {
        if (!profiles) return [];
        let filtered = profiles;

        // MODE 1: Category Mode
        if (filterMode === 'category') {
            if (categoryFilter !== 'All') {
                filtered = filtered.filter(p => p.category_tags?.includes(categoryFilter));
            }
            return filtered;
        }

        // MODE 2: Schedule Mode
        // Ignore categoryFilter completely here.
        if (scheduleFilter === 'Daily') {
            // Show "Take Daily" meds ONLY
            filtered = filtered.filter(p => p.take_daily);
            // Phase 5: Favorites Sorting for Daily
            filtered = [...filtered].sort((a, b) => {
                if (a.is_favorite === b.is_favorite) return a.name.localeCompare(b.name);
                return (a.is_favorite ? -1 : 1);
            });
        } else if (scheduleFilter === 'Scheduled') {
            // "Schedules" view -> Show ONLY meds in custom schedules
            filtered = filtered.filter(p => {
                // Strict: Must be in a custom schedule. take_daily doesn't count.
                return customSchedules.some((s: any) =>
                    s.medication_assignments?.some((ma: any) => ma.medication_id === p.id) ||
                    s.entries?.some((e: any) => e.medication_id === p.id)
                );
            });
        } else {
            // Specific Custom Schedule
            const sche = customSchedules.find((s: any) => s.id === scheduleFilter);
            if (!sche) return [];
            filtered = filtered.filter(p =>
                sche.medication_assignments?.some((ma: any) => ma.medication_id === p.id) ||
                sche.entries?.some((e: any) => e.medication_id === p.id)
            );
        }

        return filtered;
    }, [profiles, filterMode, categoryFilter, scheduleFilter, customSchedules]);

    // History Logic
    const { session } = useAuthStore(); // Need session for history fetch
    const [activeTab, setActiveTab] = useState<'medications' | 'history' | 'analytics'>('medications'); // Phase 3
    const [historyLogs, setHistoryLogs] = useState<any[]>([]);

    useEffect(() => {
        if ((activeTab === 'history' || activeTab === 'analytics') && session?.user?.id) {
            medicationService.getRecentLogs(session.user.id, 100).then(logs => {
                setHistoryLogs(logs);
            });
        }
    }, [activeTab, session]);

    // Analytics Logic (Simple)
    const analytics = useMemo(() => {
        if (historyLogs.length === 0) return { adherence: 0, totalTaken: 0 };
        const taken = historyLogs.filter(l => l.status === 'taken').length;
        const total = historyLogs.length; // Crude total (should be taken + missed)
        return {
            adherence: Math.round((taken / total) * 100),
            totalTaken: taken
        };
    }, [historyLogs]);

    const handleEdit = (id: string) => {
        setEditId(id);
        setIsFormOpen(true);
    };

    const handleDelete = async (id: string, name: string) => {
        if (confirm(`Delete ${name}? This will remove all history.`)) {
            await deleteMedication(id);
        }
    };



    return (
        <div className="min-h-screen bg-black text-white flex flex-col md:flex-row ios-pwa-layout-fix">

            {/* LEFT SIDEBAR (Desktop Only) */}
            <div className="hidden md:flex w-64 bg-[#1C1C1E] border-r border-[#2C2C2E] flex-col h-screen sticky top-0 z-10">
                <div className="p-4 border-b border-[#2C2C2E] flex items-center gap-3">
                    <button onClick={() => navigate(-1)} className="p-2 hover:bg-[#2C2C2E] rounded-full text-[#8E8E93]">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                    </button>
                    <h1 className="text-lg font-bold">Medications</h1>
                </div>

                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                    {/* Category Filter */}
                    <div className="mb-8">
                        <h3 className="text-[#8E8E93] text-xs font-bold uppercase tracking-wider mb-3">Categories</h3>
                        <div className="space-y-1">
                            {['All', 'Prescription', 'Supplement', 'Vitamin', 'Painkiller', 'Antibiotic', 'OTC'].map(cat => (
                                <button
                                    key={cat}
                                    onClick={() => { setFilterMode('category'); setCategoryFilter(cat); }}
                                    className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${filterMode === 'category' && categoryFilter === cat ? 'bg-[#0A84FF] text-white' : 'text-[#8E8E93] hover:bg-[#2C2C2E] hover:text-white'
                                        }`}
                                >
                                    {cat}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Schedule Filter */}
                    <div>
                        <div className="flex justify-between items-center mb-3">
                            <h3 className="text-[#8E8E93] text-xs font-bold uppercase tracking-wider">Schedules</h3>
                            <button onClick={startCreateSchedule} className="text-[#0A84FF] hover:bg-[#0A84FF]/10 p-1 rounded">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                            </button>
                        </div>

                        <div className="space-y-1">
                            <button
                                onClick={() => { setFilterMode('schedule'); setScheduleFilter('Scheduled'); }}
                                className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${filterMode === 'schedule' && scheduleFilter === 'Scheduled' ? 'bg-[#0A84FF] text-white' : 'text-[#8E8E93] hover:bg-[#2C2C2E] hover:text-white'
                                    }`}
                            >
                                Schedules
                            </button>

                            {/* Daily Plan Group */}
                            <button
                                onClick={() => { setFilterMode('schedule'); setScheduleFilter('Daily'); }}
                                className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors flex justify-between ${filterMode === 'schedule' && scheduleFilter === 'Daily' ? 'bg-[#0A84FF] text-white' : 'text-[#8E8E93] hover:bg-[#2C2C2E] hover:text-white'
                                    }`}
                            >
                                <span>Take Daily</span>
                            </button>

                            {/* Custom Schedules */}
                            {customSchedules?.map((sche: any) => (
                                <div key={sche.id} className="group relative flex items-center">
                                    <button
                                        onClick={() => { setFilterMode('schedule'); setScheduleFilter(sche.id); }}
                                        className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors pr-16 truncate ${filterMode === 'schedule' && scheduleFilter === sche.id ? 'bg-[#0A84FF] text-white' : 'text-[#8E8E93] hover:bg-[#2C2C2E] hover:text-white'
                                            }`}
                                    >
                                        <div className="flex flex-col">
                                            <span>{sche.name}</span>
                                            <span className="text-[10px] opacity-70">{sche.time}</span>
                                        </div>
                                    </button>
                                    {/* Edit/Delete Actions */}
                                    <div className="absolute right-1 hidden group-hover:flex gap-1">
                                        <button onClick={(e) => startEditSchedule(sche.id, e)} className="p-1 text-[#8E8E93] hover:text-white"><svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* MOBILE HEADER (Mobile Only) */}
            <div className="md:hidden bg-[#1C1C1E] border-b border-[#2C2C2E] sticky top-0 z-50 flex flex-col animate-in slide-in-from-top-2 duration-200">
                {/* Row 1: Nav & Segmented Control */}
                <div className="p-4 pb-2 space-y-3">
                    <div className="flex items-center gap-3">
                        <button onClick={() => navigate(-1)} className="p-2 hover:bg-[#2C2C2E] rounded-full text-[#8E8E93]">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                        </button>
                        <h1 className="text-lg font-bold">Medications</h1>
                    </div>
                    <div className="flex bg-[#2C2C2E] p-1 rounded-xl">
                        <button
                            onClick={() => setFilterMode('category')}
                            className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${filterMode === 'category' ? 'bg-[#0A84FF] text-white shadow-lg' : 'text-[#8E8E93]'}`}
                        >
                            Categories
                        </button>
                        <button
                            onClick={() => setFilterMode('schedule')}
                            className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${filterMode === 'schedule' ? 'bg-[#0A84FF] text-white shadow-lg' : 'text-[#8E8E93]'}`}
                        >
                            Schedules
                        </button>
                    </div>
                </div>

                {/* Row 2: Secondary Nav (Horizontal Chips or Sheet Trigger) */}
                <div className="px-4 pb-3">
                    {filterMode === 'category' ? (
                        <div className="flex gap-2 overflow-x-auto custom-scrollbar pb-1 no-scrollbar-mobile">
                            {['All', 'Prescription', 'Supplement', 'Vitamin', 'Painkiller', 'Antibiotic', 'OTC'].map(cat => (
                                <button
                                    key={cat}
                                    onClick={() => setCategoryFilter(cat)}
                                    className={`whitespace-nowrap px-4 py-2 rounded-full text-xs font-bold border transition-all ${categoryFilter === cat
                                        ? 'bg-[#0A84FF] border-[#0A84FF] text-white'
                                        : 'bg-[#1C1C1E] border-[#333] text-[#8E8E93] hover:border-[#666]'
                                        }`}
                                >
                                    {cat}
                                </button>
                            ))}
                        </div>
                    ) : (
                        <button
                            onClick={() => setIsMobileScheduleSheetOpen(true)}
                            className="w-full bg-[#2C2C2E] hover:bg-[#333] py-2.5 px-4 rounded-xl text-sm font-medium text-white flex justify-between items-center transition-colors"
                        >
                            <span className="flex items-center gap-2">
                                <span className="text-[#8E8E93]">Showing:</span>
                                {scheduleFilter === 'Scheduled' ? 'All Scheduled' :
                                    scheduleFilter === 'Daily' ? 'Take Daily' :
                                        customSchedules.find((s: any) => s.id === scheduleFilter)?.name || 'Select Schedule'}
                            </span>
                            <svg className="w-4 h-4 text-[#8E8E93]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                        </button>
                    )}
                </div>
            </div>

            {/* RIGHT CONTENT */}
            <div className="flex-1 h-screen overflow-y-auto bg-black p-4 md:p-8 custom-scrollbar">

                {/* Top Bar (Mobile Back is in sidebar, here we just have Add) */}
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h2 className="text-2xl font-bold">
                            {filterMode === 'category'
                                ? (categoryFilter === 'All' ? 'All Medications' : categoryFilter)
                                : (scheduleFilter === 'Scheduled' ? 'Schedules' :
                                    scheduleFilter === 'Daily' ? 'Take Daily' :
                                        customSchedules.find((s: any) => s.id === scheduleFilter)?.name || 'By Schedule')
                            }
                            <span className="text-[#8E8E93] text-sm font-normal ml-3">
                                {filteredProfiles.length} {filteredProfiles.length === 1 ? 'item' : 'items'}
                            </span>
                        </h2>
                        {filterMode === 'schedule' && scheduleFilter !== 'Scheduled' && (
                            <p className="text-sm text-[#0A84FF]">
                                {scheduleFilter === 'Unassigned'
                                    ? 'Unassigned / Custom'
                                    : scheduleFilter === 'Daily'
                                        ? 'Tasks set to "Take Daily"'
                                        : `In "${customSchedules.find((d: any) => d.id === scheduleFilter)?.name}"`
                                }
                            </p>
                        )}
                    </div>
                    <div className="flex gap-2">
                        {filterMode === 'schedule' && scheduleFilter === 'Daily' && (
                            <button
                                onClick={() => setIsAddToDailyOpen(true)}
                                className="bg-[#1C1C1E] border border-[#2C2C2E] hover:bg-[#2C2C2E] text-white px-4 py-2 rounded-full font-bold flex items-center gap-2 transition-colors"
                            >
                                <svg className="w-5 h-5 text-[#0A84FF]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                                Add to Daily
                            </button>
                        )}

                        {filterMode === 'schedule' && scheduleFilter === 'Scheduled' ? (
                            <button
                                onClick={startCreateSchedule}
                                className="bg-[#0A84FF] hover:bg-[#007AFF] text-white px-4 py-2 rounded-full font-bold flex items-center gap-2 transition-colors"
                            >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                                Add Schedule
                            </button>
                        ) : (
                            (filterMode !== 'schedule' || (scheduleFilter !== 'Daily')) && (
                                <button
                                    onClick={() => { setEditId(undefined); setIsFormOpen(true); }}
                                    className="bg-[#0A84FF] hover:bg-[#007AFF] text-white px-4 py-2 rounded-full font-bold flex items-center gap-2 transition-colors"
                                >
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                                    Add Medication
                                </button>
                            )
                        )}
                    </div>
                </div>

                {/* TABS */}
                <div className="flex gap-4 mb-6 border-b border-[#2C2C2E] pb-1">
                    <button
                        onClick={() => setActiveTab('medications')}
                        className={`pb-2 px-1 font-bold transition-colors ${activeTab === 'medications' ? 'text-white border-b-2 border-[#0A84FF]' : 'text-[#8E8E93] hover:text-white'}`}
                    >
                        My Medications
                    </button>
                    <button
                        onClick={() => setActiveTab('history')}
                        className={`pb-2 px-1 font-bold transition-colors ${activeTab === 'history' ? 'text-white border-b-2 border-[#0A84FF]' : 'text-[#8E8E93] hover:text-white'}`}
                    >
                        History Log
                    </button>
                    <button
                        onClick={() => setActiveTab('analytics')}
                        className={`pb-2 px-1 font-bold transition-colors ${activeTab === 'analytics' ? 'text-white border-b-2 border-[#0A84FF]' : 'text-[#8E8E93] hover:text-white'}`}
                    >
                        Analytics
                    </button>
                </div>

                {/* CONTENT: MEDICATIONS GRID */}
                {activeTab === 'medications' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {filteredProfiles.map(profile => (
                            <div
                                key={profile.id}
                                onClick={() => handleEdit(profile.id)}
                                className="bg-[#1C1C1E] border border-[#2C2C2E] rounded-2xl p-4 hover:bg-[#2C2C2E] transition-all cursor-pointer group relative overflow-hidden"
                            >
                                {/* Low Stock Indicator - Phase 5 Fix (Strict Null Checks) */}
                                {(profile.current_stock !== undefined && profile.current_stock !== null &&
                                    profile.low_stock_threshold !== undefined && profile.low_stock_threshold !== null &&
                                    profile.current_stock <= profile.low_stock_threshold) && (
                                        <div className="absolute top-0 right-0 bg-red-500/20 text-red-500 text-[10px] uppercase font-bold px-2 py-0.5 rounded-bl-xl border-l border-b border-red-500/20">
                                            Low Stock ({profile.current_stock})
                                        </div>
                                    )}

                                {/* Favorite Toggle (Phase 5) */}
                                {filterMode === 'schedule' && scheduleFilter === 'Daily' && (
                                    <button
                                        onClick={(e) => { e.stopPropagation(); updateMedicationProfile({ id: profile.id, profileUpdates: { is_favorite: !profile.is_favorite } }); }}
                                        className="absolute top-2 left-2 p-1 text-white hover:scale-110 transition-transform z-10"
                                    >
                                        <svg className={`w-5 h-5 ${profile.is_favorite ? 'text-yellow-400 fill-yellow-400' : 'text-[#5C5C5E]'}`} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                                        </svg>
                                    </button>
                                )}

                                {/* Card Content */}
                                <div className="flex justify-between items-start mb-2">
                                    <div>
                                        <h3 className="font-bold text-lg text-white leading-tight">{profile.name}</h3>
                                        {profile.brand && <p className="text-[#8E8E93] text-sm">{profile.brand}</p>}
                                    </div>
                                    <div className="text-right">
                                        <span className="text-xs font-bold text-[#8E8E93] block">{profile.strength_value} {profile.strength_unit}</span>
                                        <span className="text-[10px] text-[#5C5C5E] uppercase tracking-wider">{profile.form}</span>
                                    </div>
                                </div>

                                {/* Tags/Chips */}
                                <div className="flex flex-wrap gap-1.5 mt-3">
                                    {profile.category_tags?.slice(0, 3).map(tag => (
                                        <span key={tag} className="bg-[#2C2C2E] border border-[#3A3A3C] text-[#8E8E93] text-[10px] uppercase font-bold px-2 py-0.5 rounded-md">
                                            {tag}
                                        </span>
                                    ))}
                                    {(profile.category_tags?.length || 0) > 3 && (
                                        <span className="text-[#5C5C5E] text-[10px] px-1">...</span>
                                    )}
                                    {profile.medication_tags?.map(tag => (
                                        <span key={tag} className="bg-amber-500/10 border border-amber-500/20 text-amber-500 text-[10px] uppercase font-bold px-2 py-0.5 rounded-md">
                                            {tag}
                                        </span>
                                    ))}
                                </div>

                                {/* Delete Button (Visible on Hover) */}
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (filterMode === 'schedule' && scheduleFilter === 'Daily') {
                                            // Take Daily: Just remove flag
                                            updateMedicationProfile({ id: profile.id, profileUpdates: { take_daily: false } });
                                        } else {
                                            // Other views: Delete Medication
                                            handleDelete(profile.id, profile.name);
                                        }
                                    }}
                                    className="absolute top-2 right-2 p-2 bg-[#2C2C2E] rounded-full text-red-400 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500/20"
                                >
                                    {filterMode === 'schedule' && scheduleFilter === 'Daily' ? (
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                    ) : (
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                    )}
                                </button>
                            </div>
                        ))}

                        {filteredProfiles.length === 0 && (
                            <div className="col-span-full py-20 text-center text-[#5C5C5E] border-2 border-dashed border-[#2C2C2E] rounded-3xl">
                                <p className="mb-2 text-3xl">💊</p>
                                <p>No medications found in this category.</p>
                            </div>
                        )}
                    </div>
                )}


                {/* CONTENT: ANALYTICS - Phase 3 (Basic) */}
                {activeTab === 'analytics' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-[#1C1C1E] border border-[#2C2C2E] p-6 rounded-2xl flex flex-col items-center justify-center">
                            <h4 className="text-[#8E8E93] uppercase font-bold text-xs tracking-wider mb-2">Overall Adherence</h4>
                            <div className="text-5xl font-bold text-white mb-2">{analytics.adherence}%</div>
                            <p className="text-xs text-[#5C5C5E]">Based on last {historyLogs.length} logs</p>
                        </div>
                        <div className="bg-[#1C1C1E] border border-[#2C2C2E] p-6 rounded-2xl flex flex-col items-center justify-center">
                            <h4 className="text-[#8E8E93] uppercase font-bold text-xs tracking-wider mb-2">Total Doses Taken</h4>
                            <div className="text-5xl font-bold text-[#30D158] mb-2">{analytics.totalTaken}</div>
                            <p className="text-xs text-[#5C5C5E]">All time</p>
                        </div>
                        <div className="col-span-full bg-[#1C1C1E] border border-[#2C2C2E] p-6 rounded-2xl">
                            <h4 className="text-[#8E8E93] uppercase font-bold text-xs tracking-wider mb-4">Stock Status</h4>
                            <div className="space-y-3">
                                {profiles.filter(p => p.current_stock !== undefined).map(p => {
                                    const isLow = (p.current_stock || 0) <= (p.low_stock_threshold || 5);
                                    const percent = Math.min(100, ((p.current_stock || 0) / 30) * 100); // Assume 30 roughly max for vis
                                    return (
                                        <div key={p.id} className="flex items-center gap-3">
                                            <span className="w-24 truncate text-sm font-bold">{p.name}</span>
                                            <div className="flex-1 bg-[#2C2C2E] h-2 rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full ${isLow ? 'bg-red-500' : 'bg-[#0A84FF]'}`}
                                                    style={{ width: `${percent}%` }}
                                                />
                                            </div>
                                            <span className={`text-xs font-mono w-8 text-right ${isLow ? 'text-red-500 font-bold' : 'text-[#8E8E93]'}`}>
                                                {p.current_stock}
                                            </span>
                                        </div>
                                    );
                                })}
                                {profiles.filter(p => p.current_stock !== undefined).length === 0 && (
                                    <p className="text-[#5C5C5E] text-sm italic text-center">No inventory tracked yet.</p>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* CONTENT: HISTORY LOG */}
                {activeTab === 'history' && (
                    <div className="space-y-2">
                        {historyLogs.length === 0 ? (
                            <p className="text-[#5C5C5E] italic">No logs found.</p>
                        ) : (
                            historyLogs.map(log => {
                                const profile = profiles.find(p => p.id === log.medication_id);
                                return (
                                    <div key={log.id} className="flex justify-between items-center bg-[#1C1C1E] border border-[#2C2C2E] p-4 rounded-xl">
                                        <div className="flex items-center gap-4">
                                            <div className={`w-2 h-2 rounded-full ${log.status === 'taken' ? 'bg-[#30D158]' : (log.status === 'missed' ? 'bg-red-500' : 'bg-gray-500')}`} />
                                            <div>
                                                <p className="font-bold text-white">{profile?.name || 'Unknown Medication'}</p>
                                                <p className="text-xs text-[#8E8E93]">
                                                    {new Date(log.taken_at || log.created_at).toLocaleDateString()} • {new Date(log.taken_at || log.created_at).toLocaleTimeString()}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <span className={`text-xs font-bold uppercase px-2 py-1 rounded ${log.status === 'taken' ? 'bg-[#30D158]/20 text-[#30D158]' : 'bg-red-500/20 text-red-500'}`}>
                                                {log.status}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                )}

            </div>

            {isFormOpen && (
                <MedicationFormModal
                    onClose={() => { setIsFormOpen(false); setEditId(undefined); }}
                    editMedicationId={editId}
                />
            )}

            {isScheduleEditorOpen && profiles && (
                <ScheduleEditorModal
                    onClose={() => { setIsScheduleEditorOpen(false); setEditingScheduleId(null); }}
                    onSave={handleSaveSchedule}
                    onDelete={editingScheduleId ? () => handleDeleteSchedule(editingScheduleId) : undefined}
                    initialData={editingScheduleId ? (() => {
                        const sche = customSchedules.find((s: any) => s.id === editingScheduleId);
                        if (!sche) return undefined;
                        return {
                            name: sche.name,
                            description: sche.description,
                            is_active: sche.is_active,
                            entries: sche.entries || [], // Phase 5
                            // Legacy fallback
                            time: sche.time,
                            days_of_week: sche.days_of_week,
                            assignedMedIds: sche.medication_assignments?.map((ma: any) => ma.medication_id) || []
                        };
                    })() : undefined}
                    availableMeds={profiles}
                />
            )}

            {/* Add to Daily Modal */}
            {isAddToDailyOpen && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    {/* ... existing modal ... */}
                    <div className="bg-[#1C1C1E] w-full max-w-sm rounded-2xl overflow-hidden border border-[#2C2C2E] flex flex-col max-h-[80vh]">
                        <div className="p-4 border-b border-[#2C2C2E] flex justify-between items-center bg-[#131518]">
                            <h3 className="font-bold text-white">Add to Take Daily</h3>
                            <button onClick={() => setIsAddToDailyOpen(false)} className="p-1 hover:bg-[#2C2C2E] rounded-full"><svg className="w-5 h-5 text-[#8E8E93]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
                        </div>
                        <div className="overflow-y-auto p-2 custom-scrollbar">
                            {profiles.filter(p => !p.take_daily).map(p => (
                                <button
                                    key={p.id}
                                    onClick={() => {
                                        updateMedicationProfile({ id: p.id, profileUpdates: { take_daily: true } });
                                        setIsAddToDailyOpen(false);
                                    }}
                                    className="w-full text-left p-3 hover:bg-[#2C2C2E] rounded-xl flex items-center justify-between group transition-colors"
                                >
                                    <span className="font-bold text-white">{p.name}</span>
                                    <span className="text-xs text-[#0A84FF] opacity-0 group-hover:opacity-100 transition-opacity font-bold">ADD</span>
                                </button>
                            ))}
                            {profiles.filter(p => !p.take_daily).length === 0 && (
                                <div className="p-8 text-center text-[#5C5C5E]">
                                    <p>All medications are already in Daily List.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* MOBILE SCHEDULE SHEET (Mobile Only) */}
            {isMobileScheduleSheetOpen && (
                <div className="fixed inset-0 z-[60] flex items-end justify-center md:hidden animate-in fade-in duration-200">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsMobileScheduleSheetOpen(false)} />

                    <div className="relative z-10 bg-[#1C1C1E] w-full max-h-[80vh] rounded-t-3xl border-t border-[#333] flex flex-col animate-in slide-in-from-bottom-full duration-300">
                        {/* Handle */}
                        <div className="flex justify-center pt-3 pb-1">
                            <div className="w-12 h-1.5 bg-[#333] rounded-full" />
                        </div>

                        <div className="p-5 overflow-y-auto custom-scrollbar">
                            <h3 className="text-lg font-bold text-white mb-4 px-1">Select Schedule</h3>

                            <div className="space-y-2">
                                <button
                                    onClick={() => { setScheduleFilter('Scheduled'); setIsMobileScheduleSheetOpen(false); }}
                                    className={`w-full text-left px-5 py-4 rounded-xl font-bold flex items-center justify-between ${scheduleFilter === 'Scheduled' ? 'bg-[#0A84FF] text-white' : 'bg-[#262626] text-[#BBB]'}`}
                                >
                                    <span>All Scheduled</span>
                                    {scheduleFilter === 'Scheduled' && <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>}
                                </button>

                                <button
                                    onClick={() => { setScheduleFilter('Daily'); setIsMobileScheduleSheetOpen(false); }}
                                    className={`w-full text-left px-5 py-4 rounded-xl font-bold flex items-center justify-between ${scheduleFilter === 'Daily' ? 'bg-[#0A84FF] text-white' : 'bg-[#262626] text-[#BBB]'}`}
                                >
                                    <span>Take Daily</span>
                                    {scheduleFilter === 'Daily' && <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>}
                                </button>

                                <div className="h-px bg-[#333] my-2" />
                                <p className="text-xs text-[#666] uppercase font-bold px-2 mb-2">My Plans</p>

                                {customSchedules?.map((sche: any) => (
                                    <button
                                        key={sche.id}
                                        onClick={() => { setScheduleFilter(sche.id); setIsMobileScheduleSheetOpen(false); }}
                                        className={`w-full text-left px-5 py-4 rounded-xl font-bold flex items-center justify-between ${scheduleFilter === sche.id ? 'bg-[#0A84FF] text-white' : 'bg-[#262626] text-[#BBB]'}`}
                                    >
                                        <div className="flex flex-col">
                                            <span>{sche.name}</span>
                                            <span className={`text-xs font-normal opacity-70`}>{sche.time}</span>
                                        </div>
                                        {scheduleFilter === sche.id && <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>}
                                    </button>
                                ))}
                            </div>

                            <button
                                onClick={() => { setIsMobileScheduleSheetOpen(false); startCreateSchedule(); }}
                                className="w-full mt-6 py-4 border border-dashed border-[#444] rounded-xl text-[#0A84FF] font-bold hover:bg-[#0A84FF]/10 transition-colors"
                            >
                                + Create New Schedule
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}
