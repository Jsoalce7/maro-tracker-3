import { useState, useEffect } from 'react';

interface TimeExerciseViewProps {
    exercise: any;
    currentSetIndex: number;
    targetDuration: number;  // Per-set target from template
    inputs: { duration_seconds: number };
    onInputChange: (field: string, value: number) => void;
    onLogSet: () => void;
}

export function TimeExerciseView({ exercise, currentSetIndex, targetDuration, inputs, onInputChange, onLogSet }: TimeExerciseViewProps) {
    const [timeLeft, setTimeLeft] = useState(targetDuration);
    const [isRunning, setIsRunning] = useState(false);
    const [actualDuration, setActualDuration] = useState(0);

    // Reset timer when targetDuration or set changes
    useEffect(() => {
        setTimeLeft(targetDuration);
        setActualDuration(0);
        setIsRunning(false);
    }, [targetDuration, currentSetIndex]);

    useEffect(() => {
        let interval: number | null = null;

        if (isRunning && timeLeft > 0) {
            interval = window.setInterval(() => {
                setTimeLeft((prev: number) => {
                    if (prev <= 1) {
                        setIsRunning(false);
                        // Timer complete - update parent state
                        const finalDuration = actualDuration + 1;
                        onInputChange('duration_seconds', finalDuration);
                        // Auto-advance to next set
                        setTimeout(() => onLogSet(), 500);
                        return 0;
                    }
                    return prev - 1;
                });
                setActualDuration((prev: number) => prev + 1);
            }, 1000);
        }

        return () => {
            if (interval) clearInterval(interval);
        };
    }, [isRunning, timeLeft, actualDuration, onInputChange, onLogSet]);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const handleReset = () => {
        setTimeLeft(targetDuration);
        setActualDuration(0);
        setIsRunning(false);
    };

    const handleCompleteSet = () => {
        const finalDuration = actualDuration > 0 ? actualDuration : targetDuration - timeLeft;
        onInputChange('duration_seconds', finalDuration);
        onLogSet();
        handleReset();
    };

    const progress = ((targetDuration - timeLeft) / targetDuration) * 100;

    return (
        <div className="flex-1 flex flex-col items-center justify-center p-8">
            {/* Timer Display */}
            <div className="relative w-64 h-64 mb-8">
                {/* Progress Ring */}
                <svg className="w-full h-full transform -rotate-90">
                    <circle
                        cx="128"
                        cy="128"
                        r="120"
                        stroke="#262626"
                        strokeWidth="8"
                        fill="none"
                    />
                    <circle
                        cx="128"
                        cy="128"
                        r="120"
                        stroke="#3B82F6"
                        strokeWidth="8"
                        fill="none"
                        strokeDasharray={`${2 * Math.PI * 120}`}
                        strokeDashoffset={`${2 * Math.PI * 120 * (1 - progress / 100)}`}
                        className="transition-all duration-1000"
                    />
                </svg>

                {/* Time Text */}
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <div className="text-6xl font-bold text-white tabular-nums">
                        {formatTime(timeLeft)}
                    </div>
                    <div className="text-sm text-[#666] mt-2">
                        Target: {formatTime(targetDuration)}
                    </div>
                </div>
            </div>

            {/* Controls */}
            <div className="flex gap-4">
                <button
                    onClick={() => setIsRunning(!isRunning)}
                    className={`px-8 py-4 rounded-xl font-bold text-lg transition-all ${isRunning
                        ? 'bg-[#F59E0B] hover:bg-[#D97706] text-white'
                        : 'bg-[#3B82F6] hover:bg-[#2563EB] text-white'
                        }`}
                >
                    {isRunning ? 'Pause' : timeLeft === targetDuration ? 'Start' : 'Resume'}
                </button>

                <button
                    onClick={handleReset}
                    disabled={timeLeft === targetDuration && !isRunning}
                    className="px-8 py-4 rounded-xl font-bold text-lg bg-[#262626] hover:bg-[#333] text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                    Reset
                </button>

                <button
                    onClick={handleCompleteSet}
                    className="px-8 py-4 rounded-xl font-bold text-lg bg-[#10B981] hover:bg-[#059669] text-white transition-all"
                >
                    Complete Set
                </button>
            </div>

            {/* Set Info */}
            <div className="mt-6 text-sm text-[#888]">
                Set {currentSetIndex + 1} of {exercise.default_sets || 3}
            </div>
        </div>
    );
}
