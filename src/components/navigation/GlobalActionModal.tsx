import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';

interface GlobalActionModalProps {
    onClose: () => void;
    onStartWorkout: () => void;
    onManageWorkouts: () => void;
    onManageMedications: () => void;
}

export function GlobalActionModal({ onClose, onStartWorkout, onManageWorkouts, onManageMedications }: GlobalActionModalProps) {
    const navigate = useNavigate();
    const [mode, setMode] = useState<'log' | 'manage'>('log');

    const handleAction = (action: string) => {
        onClose(); // Close modal first

        switch (action) {
            case 'log_meal_breakfast': navigate('/add-food?mealType=breakfast'); break;
            case 'log_meal_lunch': navigate('/add-food?mealType=lunch'); break;
            case 'log_meal_dinner': navigate('/add-food?mealType=dinner'); break;
            case 'log_meal_snack': navigate('/add-food?mealType=snacks'); break;
            case 'log_water': navigate('/log-water'); break;
            case 'log_workout': onStartWorkout(); break;
            // Placeholders for now
            case 'manage_food': navigate('/add-food?mode=manage'); break;
            case 'manage_workouts': onManageWorkouts(); break;
            case 'manage_medications': onManageMedications(); break;
            default: break;
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-end justify-center md:items-center p-4 animate-in fade-in duration-200">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

            <div className="relative z-10 bg-[#141414] w-full max-w-sm rounded-3xl p-5 space-y-5 border border-[#2A2A2A] shadow-2xl animate-in slide-in-from-bottom-4 duration-300">

                {/* Header & Toggle */}
                <div className="space-y-4">
                    <h3 className="text-white font-bold text-center text-lg">
                        {mode === 'log' ? 'What do you want to log?' : 'What do you want to manage?'}
                    </h3>

                    <div className="bg-[#2A2A2A] p-1 rounded-xl flex">
                        <button
                            onClick={() => setMode('log')}
                            className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${mode === 'log' ? 'bg-[#3B82F6] text-white shadow-lg' : 'text-[#6B6B6B] hover:text-white'
                                }`}
                        >
                            Log
                        </button>
                        <button
                            onClick={() => setMode('manage')}
                            className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${mode === 'manage' ? 'bg-[#3B82F6] text-white shadow-lg' : 'text-[#6B6B6B] hover:text-white'
                                }`}
                        >
                            Manage
                        </button>
                    </div>
                </div>

                {/* List Items */}
                <div className="space-y-2 max-h-[60vh] overflow-y-auto custom-scrollbar">
                    {mode === 'log' ? (
                        <>
                            <div className="space-y-1">
                                <p className="text-xs uppercase tracking-wider text-[#666] font-bold px-2 mb-2">Meals</p>
                                <ActionItem icon="🍳" title="Breakfast" subtitle="Log your morning meal" onClick={() => handleAction('log_meal_breakfast')} />
                                <ActionItem icon="🥗" title="Lunch" subtitle="Log your midday meal" onClick={() => handleAction('log_meal_lunch')} />
                                <ActionItem icon="🥘" title="Dinner" subtitle="Log your evening meal" onClick={() => handleAction('log_meal_dinner')} />
                                <ActionItem icon="🥨" title="Snack" subtitle="Log a quick bite" onClick={() => handleAction('log_meal_snack')} />
                            </div>

                            <div className="h-px bg-[#262626] my-2" />

                            <ActionItem icon="💧" title="Water" subtitle="Log hydration" onClick={() => handleAction('log_water')} color="text-blue-400" />
                            <ActionItem icon="💪" title="Workout" subtitle="Log a session" onClick={() => handleAction('log_workout')} color="text-amber-500" />
                            <ActionItem icon="💊" title="Medication" subtitle="Log meds" onClick={() => handleAction('manage_medications')} />
                            <ActionItem icon="❤️" title="Vitals" subtitle="Log health stats" isStub />
                        </>
                    ) : (
                        <>
                            <ActionItem icon="🥗" title="Meals & Foods" subtitle="Edit custom foods/meals" onClick={() => handleAction('manage_food')} />
                            <ActionItem icon="🏋️‍♂️" title="Workouts" subtitle="Edit templates" onClick={() => handleAction('manage_workouts')} />
                            <ActionItem icon="💊" title="Medications" subtitle="Manage schedule" onClick={() => handleAction('manage_medications')} />
                            <ActionItem icon="❤️" title="Vitals" subtitle="Configure tracking" isStub />
                        </>
                    )}
                </div>

                {/* Cancel */}
                <button
                    onClick={onClose}
                    className="w-full py-3 text-[#6B6B6B] hover:text-white font-medium hover:bg-[#1A1D21] rounded-xl transition-colors"
                >
                    Cancel
                </button>
            </div>
        </div>
    );
}

function ActionItem({
    icon,
    title,
    subtitle,
    onClick,
    color = "text-white",
    isStub = false
}: {
    icon: string,
    title: string,
    subtitle: string,
    onClick?: () => void,
    color?: string,
    isStub?: boolean
}) {
    return (
        <button
            onClick={onClick}
            disabled={isStub}
            className={`w-full text-left p-3 rounded-xl bg-[#1A1D21] hover:bg-[#252525] active:scale-[0.98] transition-all flex items-center justify-between group ${isStub ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
            <div className="flex items-center gap-3">
                <span className="text-xl">{icon}</span>
                <div className="flex flex-col">
                    <span className={`font-medium ${color}`}>{title}</span>
                    <span className="text-xs text-[#6B6B6B] group-hover:text-[#888]">{subtitle}</span>
                </div>
            </div>
            {!isStub && (
                <svg className="w-5 h-5 text-[#444] group-hover:text-white transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
            )}
        </button>
    );
}
