import { RestTimer } from './RestTimer';

interface RestBetweenExercisesProps {
    duration: number;
    nextExerciseName: string;
    onComplete: () => void;
    onSkip: () => void;
}

export function RestBetweenExercises({ duration, nextExerciseName, onComplete, onSkip }: RestBetweenExercisesProps) {
    return (
        <RestTimer
            duration={duration}
            onComplete={onComplete}
            onSkip={onSkip}
            title="Rest Before Next Exercise"
            subtitle={`Next: ${nextExerciseName}`}
        />
    );
}
