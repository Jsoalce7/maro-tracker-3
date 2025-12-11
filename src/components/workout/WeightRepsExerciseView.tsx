interface WeightRepsExerciseViewProps {
    exercise: any;
    currentSetIndex: number;
    targetReps: number;  // Per-set target from template
    targetWeight: number;  // Per-set target from template
    inputs: { weight: number; reps: number };
    onInputChange: (field: string, value: number) => void;
    onLogSet: () => void;
}

export function WeightRepsExerciseView({
    exercise,
    currentSetIndex,
    targetReps,
    targetWeight,
    inputs,
    onInputChange,
    onLogSet
}: WeightRepsExerciseViewProps) {
    // Get per_set_config for progression hints
    const perSetConfig = exercise.per_set_config || [];
    const currentSetConfig = perSetConfig.find((config: any) => config.set === currentSetIndex + 1);

    const handleCompleteSet = () => {
        onLogSet(); // Parent reads from inputs state
    };

    return (
        <div className="flex-1 flex flex-col items-center justify-center p-8">
            {/* Set Number */}
            <div className="text-sm text-[#666] uppercase font-bold tracking-wider mb-6">
                Set {currentSetIndex + 1} of {exercise.default_sets || 3}
            </div>

            {/* Input Grid */}
            <div className="w-full max-w-2xl grid grid-cols-2 gap-6 mb-8">
                {/* Weight */}
                <div>
                    <label className="block text-xs text-[#888] uppercase font-bold mb-2 text-center">
                        LBS
                    </label>
                    <input
                        type="number"
                        value={inputs.weight === 0 ? '' : inputs.weight}
                        onChange={(e) => {
                            const val = e.target.value;
                            onInputChange('weight', val === '' ? 0 : parseInt(val) || 0);
                        }}
                        onFocus={(e) => e.target.select()}
                        className="w-full bg-[#1A1D21] text-white text-5xl font-bold text-center border-2 border-[#333] rounded-2xl py-6 outline-none focus:border-[#3B82F6] transition-colors tabular-nums"
                        placeholder="0"
                    />
                    {targetWeight > 0 && (
                        <div className="text-center text-sm text-[#666] mt-2">
                            Target: {targetWeight} lbs
                        </div>
                    )}
                </div>

                {/* Reps */}
                <div>
                    <label className="block text-xs text-[#888] uppercase font-bold mb-2 text-center">
                        REPS
                    </label>
                    <input
                        type="number"
                        value={inputs.reps === 0 ? '' : inputs.reps}
                        onChange={(e) => {
                            const val = e.target.value;
                            onInputChange('reps', val === '' ? 0 : parseInt(val) || 0);
                        }}
                        onFocus={(e) => e.target.select()}
                        className="w-full bg-[#1A1D21] text-white text-5xl font-bold text-center border-2 border-[#333] rounded-2xl py-6 outline-none focus:border-[#3B82F6] transition-colors tabular-nums"
                        placeholder="0"
                    />
                    <div className="text-center text-sm text-[#666] mt-2">
                        Target: {targetReps} reps
                    </div>
                </div>
            </div>

            {/* Progression Hint */}
            {perSetConfig.length > 0 && currentSetIndex < perSetConfig.length - 1 && (
                <div className="text-center text-sm text-[#3B82F6] mb-6">
                    {(() => {
                        const nextSet = perSetConfig[currentSetIndex + 1];
                        if (!nextSet) return null;

                        const weightDiff = (nextSet.weight || 0) - (currentSetConfig?.weight || 0);
                        const repsDiff = (nextSet.reps || 0) - (currentSetConfig?.reps || 0);

                        const hints = [];
                        if (weightDiff > 0) hints.push(`+${weightDiff} lb next set`);
                        else if (weightDiff < 0) hints.push(`${weightDiff} lb next set (lighter)`);

                        if (repsDiff !== 0) hints.push(`${nextSet.reps} reps next set`);

                        return hints.length > 0 ? `Next: ${hints.join(', ')}` : null;
                    })()}
                </div>
            )}

            {/* Complete Button */}
            <button
                onClick={handleCompleteSet}
                className="px-12 py-4 rounded-xl font-bold text-lg bg-[#3B82F6] hover:bg-[#2563EB] text-white transition-all shadow-lg"
            >
                Complete Set
            </button>
        </div>
    );
}
