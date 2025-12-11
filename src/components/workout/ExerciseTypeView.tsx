import { TimeExerciseView } from './TimeExerciseView';
import { WeightRepsExerciseView } from './WeightRepsExerciseView';
import { RepsOnlyExerciseView } from './RepsOnlyExerciseView';

interface ExerciseTypeViewProps {
    exercise: any;
    currentSetIndex: number;
    currentSetConfig: any;  // Per-set config from template
    inputs: { weight: number; reps: number; duration_seconds?: number };
    onInputChange: (field: string, value: number) => void;
    onLogSet: () => void;
}

export function ExerciseTypeView({
    exercise,
    currentSetIndex,
    currentSetConfig,
    inputs,
    onInputChange,
    onLogSet
}: ExerciseTypeViewProps) {
    const exerciseType = exercise.exercise_type || 'weight_reps';

    // Time-based exercise
    if (exerciseType === 'time') {
        return (
            <TimeExerciseView
                exercise={exercise}
                currentSetIndex={currentSetIndex}
                targetDuration={currentSetConfig?.duration_seconds || 60}
                inputs={{ duration_seconds: inputs.duration_seconds || 0 }}
                onInputChange={onInputChange}
                onLogSet={onLogSet}
            />
        );
    }

    // Reps-only exercise
    if (exerciseType === 'reps_only') {
        return (
            <RepsOnlyExerciseView
                exercise={exercise}
                currentSetIndex={currentSetIndex}
                targetReps={currentSetConfig?.reps || 10}
                inputs={{ reps: inputs.reps }}
                onInputChange={onInputChange}
                onLogSet={onLogSet}
            />
        );
    }

    // Weight + reps (default)
    return (
        <WeightRepsExerciseView
            exercise={exercise}
            currentSetIndex={currentSetIndex}
            targetReps={currentSetConfig?.reps || 10}
            targetWeight={currentSetConfig?.weight || 0}
            inputs={inputs}
            onInputChange={onInputChange}
            onLogSet={onLogSet}
        />
    );
}
