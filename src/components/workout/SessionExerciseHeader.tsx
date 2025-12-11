interface SessionExerciseHeaderProps {
    exerciseName: string;
    currentSet: number;
    totalSets: number;
    progressionType?: string;
    mode: string;
}

export function SessionExerciseHeader({
    exerciseName,
    currentSet,
    totalSets,
    progressionType,
    mode
}: SessionExerciseHeaderProps) {

    const getSubtitle = () => {
        const setInfo = `Set ${currentSet} of ${totalSets}`;

        if (mode === 'time') {
            return `${setInfo} – Time-Based`;
        }

        // Map internal progression types to user-friendly labels
        switch (progressionType) {
            case 'increase':
                return `${setInfo} – Increasing Weight`;
            case 'decrease':
                return `${setInfo} – Drop Sets`;
            case 'pyramid':
                return `${setInfo} – Pyramid`;
            case 'none':
            default:
                return `${setInfo} – Fixed`;
        }
    };

    return (
        <div className="bg-[#0A0A0A] border-b border-[#262626] px-6 py-4">
            <h1 className="text-3xl font-bold text-white mb-1">
                {exerciseName}
            </h1>
            <p className="text-[#888] text-sm">
                {getSubtitle()}
            </p>
        </div>
    );
}
