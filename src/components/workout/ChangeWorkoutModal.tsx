import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { workoutService } from '../../services/workoutService';
import { useAuthStore } from '../../stores/authStore';

interface ChangeWorkoutModalProps {
    date: string;
    currentTemplateId?: string;
    onClose: () => void;
}

export function ChangeWorkoutModal({ date, currentTemplateId, onClose }: ChangeWorkoutModalProps) {
    const { session } = useAuthStore();
    const queryClient = useQueryClient();
    const [selectedTemplateId, setSelectedTemplateId] = useState(currentTemplateId || '');

    // Fetch all templates
    const { data: templates = [] } = useQuery({
        queryKey: ['templates', session?.user?.id],
        queryFn: () => workoutService.getTemplates(session!.user!.id),
        enabled: !!session?.user?.id
    });

    // Mutation to change scheduled workout
    const updateScheduleMutation = useMutation({
        mutationFn: async (templateId: string) => {
            if (!session?.user?.id) throw new Error('No user session');
            return await workoutService.changeScheduledWorkout(
                session.user.id,
                date,
                templateId
            );
        },
        onSuccess: () => {
            // Invalidate workout state to refresh Diary card
            queryClient.invalidateQueries({ queryKey: ['workoutState'] });
            queryClient.invalidateQueries({ queryKey: ['workouts'] });
            onClose();
        },
        onError: (error) => {
            console.error('Failed to change workout:', error);
            alert('Failed to change workout. Please try again.');
        }
    });

    const handleSave = () => {
        if (!selectedTemplateId) {
            alert('Please select a workout template');
            return;
        }
        updateScheduleMutation.mutate(selectedTemplateId);
    };

    const formattedDate = new Date(date).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric'
    });

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className="bg-[#0A0A0A] border border-[#262626] rounded-2xl max-w-md w-full p-6">
                {/* Header */}
                <div className="mb-6">
                    <h2 className="text-2xl font-bold text-white mb-1">
                        Change Workout
                    </h2>
                    <p className="text-[#888] text-sm">
                        {formattedDate}
                    </p>
                </div>

                {/* Template List */}
                <div className="mb-6 max-h-[400px] overflow-y-auto space-y-2">
                    {templates.map((template: any) => (
                        <button
                            key={template.id}
                            onClick={() => setSelectedTemplateId(template.id)}
                            className={`w-full p-4 rounded-xl border-2 text-left transition-colors ${selectedTemplateId === template.id
                                ? 'border-[#3B82F6] bg-[#3B82F6]/10'
                                : 'border-[#262626] bg-[#141414] hover:border-[#333]'
                                }`}
                        >
                            <div className="font-semibold text-white mb-1">
                                {template.name}
                            </div>
                            <div className="text-xs text-[#666]">
                                {template.workout_template_exercises?.length || 0} exercises
                            </div>
                        </button>
                    ))}

                    {templates.length === 0 && (
                        <div className="text-center text-[#666] py-8">
                            No templates available. Create one first.
                        </div>
                    )}
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                    <button
                        onClick={onClose}
                        disabled={updateScheduleMutation.isPending}
                        className="flex-1 py-3 px-4 bg-[#141414] hover:bg-[#1A1A1A] text-white font-semibold rounded-xl transition-colors disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={!selectedTemplateId || updateScheduleMutation.isPending}
                        className="flex-1 py-3 px-4 bg-[#3B82F6] hover:bg-[#2563EB] text-white font-semibold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {updateScheduleMutation.isPending ? 'Saving...' : 'Save'}
                    </button>
                </div>
            </div>
        </div>
    );
}
