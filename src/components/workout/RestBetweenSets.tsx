import { RestTimer } from './RestTimer';

interface RestBetweenSetsProps {
    duration: number;
    currentSet: number;
    totalSets: number;
    onComplete: () => void;
    onSkip: () => void;
}

export function RestBetweenSets({ duration, currentSet, totalSets, onComplete, onSkip }: RestBetweenSetsProps) {
    return (
        <RestTimer
            duration={duration}
            onComplete={onComplete}
            onSkip={onSkip}
            title="Rest Between Sets"
            subtitle={`Next: Set ${currentSet + 1} of ${totalSets}`}
        />
    );
}
