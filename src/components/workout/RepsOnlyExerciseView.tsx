interface RepsOnlyExerciseViewProps {
    exercise: any;
    currentSetIndex: number;
    targetReps: number;  // Per-set target from template
    inputs: { reps: number };
    onInputChange: (field: string, value: number) => void;
    onLogSet: () => void;
}

export function RepsOnlyExerciseView({
    exercise,
    currentSetIndex,
    targetReps,
    inputs,
    onInputChange,
    onLogSet
}: RepsOnlyExerciseViewProps) {

    const handleCompleteSet = () => {
        onLogSet(); // Parent reads from inputs
    };

    return (
        <div className="flex-1 flex flex-col items-center justify-center p-8">
            {/* Set Number */}
            <div className="text-sm text-[#666] uppercase font-bold tracking-wider mb-2">
                Set {currentSetIndex + 1} of {exercise.default_sets || 3}
            </div>

            {/* Reps Input */}
            <div className="w-full max-w-md">
                <label className="block text-xs text-[#888] uppercase font-bold mb-2 text-center">
                    Reps
                </label>
                <input
                    type="number"
                    value={inputs.reps === 0 ? '' : inputs.reps}
                    onChange={(e) => {
                        const val = e.target.value;
                        onInputChange('reps', val === '' ? 0 : parseInt(val) || 0);
                    }}
                    onFocus={(e) => e.target.select()}
                    className="w-full bg-[#1A1D21] text-white text-6xl font-bold text-center border-2 border-[#333] rounded-2xl py-8 outline-none focus:border-[#3B82F6] transition-colors tabular-nums"
                    placeholder="0"
                />
                <div className="text-center text-sm text-[#666] mt-2">
                    Target: {targetReps} reps
                </div>
            </div>

            {/* Complete Button */}
            <button
                onClick={handleCompleteSet}
                className="mt-8 px-12 py-4 rounded-xl font-bold text-lg bg-[#3B82F6] hover:bg-[#2563EB] text-white transition-all shadow-lg"
            >
                Complete Set
            </button>
        </div>
    );
}
