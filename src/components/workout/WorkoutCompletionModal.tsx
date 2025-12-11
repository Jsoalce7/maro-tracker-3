interface WorkoutCompletionModalProps {
    sessionData: {
        name: string;
        totalSets: number;
        exercises: number;
        duration?: string;
    };
    onReturnToDiary: () => void;
}


export function WorkoutCompletionModal({ sessionData, onReturnToDiary }: WorkoutCompletionModalProps) {
    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className="bg-[#0A0A0A] border border-[#262626] rounded-2xl max-w-md w-full p-8 text-center">
                {/* Success Icon */}
                <div className="mb-6 flex justify-center">
                    <div className="w-24 h-24 bg-gradient-to-br from-[#10B981] to-[#059669] rounded-full flex items-center justify-center text-5xl">
                        🏆
                    </div>
                </div>

                {/* Title */}
                <h2 className="text-3xl font-bold text-white mb-2">
                    Workout Complete!
                </h2>
                <p className="text-[#888] mb-8">
                    Great job finishing {sessionData.name}
                </p>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-4 mb-8">
                    <div className="bg-[#141414] border border-[#262626] rounded-xl p-4">
                        <div className="flex items-center justify-center gap-2 mb-1">
                            <span className="text-xl">✅</span>
                            <span className="text-2xl font-bold text-white">{sessionData.totalSets}</span>
                        </div>
                        <div className="text-xs text-[#666] uppercase">Total Sets</div>
                    </div>

                    <div className="bg-[#141414] border border-[#262626] rounded-xl p-4">
                        <div className="flex items-center justify-center gap-2 mb-1">
                            <span className="text-xl">🔥</span>
                            <span className="text-2xl font-bold text-white">{sessionData.exercises}</span>
                        </div>
                        <div className="text-xs text-[#666] uppercase">Exercises</div>
                    </div>
                </div>

                {/* Actions */}
                <button
                    onClick={onReturnToDiary}
                    className="w-full py-4 px-6 bg-[#3B82F6] hover:bg-[#2563EB] text-white font-bold rounded-xl transition-colors"
                >
                    Return to Diary
                </button>
            </div>
        </div>
    );
}
