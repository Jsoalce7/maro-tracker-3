import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { workoutService } from '../../services/workoutService';
import { useAuthStore } from '../../stores/authStore';

interface StartWorkoutModalProps {
    onClose: () => void;
    onStart: (templateId?: string) => void;
    onManage: () => void;
    currentSession?: any; // If resuming
    onResume?: () => void;
    onEndSession?: () => void;
}

export function StartWorkoutModal({
    onClose,
    onStart,
    onManage,
    currentSession,
    onResume,
    onEndSession
}: StartWorkoutModalProps) {
    const { session } = useAuthStore();
    const { data: templates = [] } = useQuery({
        queryKey: ['workout_templates', session?.user?.id],
        queryFn: () => session?.user?.id ? workoutService.getTemplates(session.user.id) : [],
        enabled: !!session?.user?.id
    });

    const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');

    const handleStart = () => {
        if (!selectedTemplateId) return;
        onStart(selectedTemplateId);
    };

    const handleQuickStart = () => {
        onStart(undefined); // undefined means no template -> quick start
    };

    if (currentSession) {
        return (
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

                <div className="relative z-10 bg-[#141414] w-full max-w-sm rounded-3xl p-6 border border-[#2A2A2A] shadow-2xl animate-in zoom-in-95 duration-200">
                    <div className="text-center mb-6">
                        <div className="w-16 h-16 bg-amber-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-amber-500/20">
                            <span className="text-3xl">💪</span>
                        </div>
                        <h3 className="text-white text-xl font-bold">Workout in Progress</h3>
                        <p className="text-[#888] text-sm mt-1">
                            {currentSession.name || "Quick Workout"} • Started {new Date(currentSession.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                    </div>

                    <div className="space-y-3">
                        <button
                            onClick={onResume}
                            className="w-full py-3 bg-[#3B82F6] hover:bg-[#2563EB] text-white rounded-xl font-bold shadow-lg shadow-blue-500/20 transition-all"
                        >
                            Resume Workout
                        </button>
                        <button
                            onClick={onEndSession} // In real app, maybe confirm first
                            className="w-full py-3 bg-[#1A1D21] hover:bg-[#252525] text-white rounded-xl font-bold border border-[#333] transition-all"
                        >
                            End & Save
                        </button>
                    </div>

                    <button onClick={onClose} className="mt-4 w-full py-2 text-[#666] text-sm hover:text-white">Close</button>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

            <div className="relative z-10 bg-[#141414] w-full max-w-sm rounded-3xl p-6 border border-[#2A2A2A] shadow-2xl animate-in zoom-in-95 duration-200">
                <div className="text-center mb-6">
                    <h3 className="text-white text-xl font-bold">Start Workout</h3>
                    <p className="text-[#888] text-sm mt-1">Select a template or start fresh</p>
                </div>

                <div className="space-y-4">
                    {/* Template Select */}
                    <div>
                        <label className="text-xs font-bold text-[#666] uppercase tracking-wider mb-2 block">Choose Template</label>
                        <select
                            className="w-full bg-[#1A1D21] text-white border border-[#333] rounded-xl p-3 outline-none focus:border-[#3B82F6]"
                            value={selectedTemplateId}
                            onChange={(e) => setSelectedTemplateId(e.target.value)}
                        >
                            <option value="" disabled>Select a template...</option>
                            {templates.map((t: any) => (
                                <option key={t.id} value={t.id}>{t.name}</option>
                            ))}
                        </select>
                    </div>

                    <button
                        onClick={handleStart}
                        disabled={!selectedTemplateId}
                        className="w-full py-3 bg-[#3B82F6] disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#2563EB] text-white rounded-xl font-bold shadow-lg shadow-blue-500/20 transition-all"
                    >
                        Start Selected
                    </button>

                    <div className="flex items-center gap-3">
                        <div className="h-px bg-[#262626] flex-1" />
                        <span className="text-xs text-[#444] font-bold">OR</span>
                        <div className="h-px bg-[#262626] flex-1" />
                    </div>

                    <button
                        onClick={handleQuickStart}
                        className="w-full py-3 bg-[#1A1D21] hover:bg-[#252525] text-white rounded-xl font-bold border border-[#333] transition-all"
                    >
                        Quick Workout (Empty)
                    </button>
                </div>

                <div className="mt-6 pt-4 border-t border-[#262626] flex justify-center">
                    <button onClick={onManage} className="text-[#3B82F6] text-sm font-medium hover:underline">
                        Manage Templates
                    </button>
                </div>
            </div>
        </div>
    );
}
