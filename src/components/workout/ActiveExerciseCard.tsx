import { WorkoutExerciseLog, WorkoutSetTemplate } from '../../stores/mockWorkoutStore';

interface ActiveExerciseCardProps {
    exercise: WorkoutExerciseLog;
    currentSetIndex: number;
    targets: WorkoutSetTemplate[];
    setLogs: { reps: number; weight: number; }[]; // Local state values
    onInputChange: (index: number, field: 'reps' | 'weight', value: number) => void;
}

export function ActiveExerciseCard({ exercise, currentSetIndex, targets, setLogs, onInputChange }: ActiveExerciseCardProps) {
    return (
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
            {/* Header */}
            <div>
                <h2 className="text-2xl font-bold text-white mb-2">{exercise.name}</h2>
                {/* Mock tags for now, or pass from template */}
                <div className="flex gap-2">
                    <span className="text-xs font-medium text-[#3B82F6] bg-[#3B82F6]/10 px-2 py-1 rounded">Strength</span>
                </div>
            </div>

            {/* Main Active Set Input */}
            <div className="bg-[#141414] rounded-2xl p-6 border border-[#2A2A2A] shadow-xl">
                <div className="flex justify-between items-center mb-6">
                    <span className="text-[#8E8E93] text-sm font-medium uppercase tracking-wider">Set {currentSetIndex + 1}</span>
                    <span className="text-[#6B6B6B] text-xs">Target: {targets[currentSetIndex]?.targetReps} reps • {targets[currentSetIndex]?.suggestedWeightLb} lbs</span>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    {/* Weight Input */}
                    <div className="space-y-2">
                        <label className="text-[#8E8E93] text-xs font-bold uppercase block text-center">Lbs</label>
                        <input
                            type="number"
                            inputMode="decimal"
                            value={setLogs[currentSetIndex]?.weight || ''}
                            onChange={(e) => onInputChange(currentSetIndex, 'weight', parseFloat(e.target.value))}
                            className="w-full bg-[#0A0A0A] border border-[#333] rounded-xl py-4 text-center text-3xl font-bold text-white focus:outline-none focus:border-[#3B82F6] transition-colors"
                        />
                    </div>
                    {/* Reps Input */}
                    <div className="space-y-2">
                        <label className="text-[#8E8E93] text-xs font-bold uppercase block text-center">Reps</label>
                        <input
                            type="number"
                            inputMode="decimal"
                            value={setLogs[currentSetIndex]?.reps || ''}
                            onChange={(e) => onInputChange(currentSetIndex, 'reps', parseFloat(e.target.value))}
                            className="w-full bg-[#0A0A0A] border border-[#333] rounded-xl py-4 text-center text-3xl font-bold text-white focus:outline-none focus:border-[#3B82F6] transition-colors"
                        />
                    </div>
                </div>
            </div>

            {/* Sets History List */}
            <div className="space-y-2">
                <h3 className="text-[#6B6B6B] text-xs font-bold uppercase tracking-wider mb-3">Set History</h3>
                {exercise.logs.map((log, idx) => {
                    const isActive = idx === currentSetIndex;
                    const isCompleted = log.isCompleted;

                    return (
                        <div
                            key={log.id}
                            className={`flex items-center justify-between p-4 rounded-xl border transition-colors ${isActive
                                    ? 'bg-[#3B82F6]/10 border-[#3B82F6] ring-1 ring-[#3B82F6]/50'
                                    : isCompleted
                                        ? 'bg-[#1A1D21] border-[#2A2A2A] opacity-60'
                                        : 'bg-[#141414] border-[#262626]'
                                }`}
                        >
                            <div className="flex items-center gap-4">
                                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${isCompleted ? 'bg-[#10B981] text-black' : isActive ? 'bg-[#3B82F6] text-white' : 'bg-[#333] text-[#8E8E93]'
                                    }`}>
                                    {idx + 1}
                                </div>
                                <div className="text-sm text-[#8E8E93]">
                                    {targets[idx]?.targetReps} x {targets[idx]?.suggestedWeightLb} lbs
                                </div>
                            </div>

                            <div className="text-white font-mono font-medium">
                                {isCompleted ? (
                                    <span>{log.repsDone} x {log.weightLb}</span>
                                ) : (
                                    <span className="text-[#444]">-</span>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
