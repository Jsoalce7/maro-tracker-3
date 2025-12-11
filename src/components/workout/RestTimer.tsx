import { useState, useEffect } from 'react';

interface RestTimerProps {
    duration: number; // seconds
    onComplete: () => void;
    onSkip: () => void;
    title?: string;
    subtitle?: string;
}

export function RestTimer({ duration, onComplete, onSkip, title = "Rest", subtitle }: RestTimerProps) {
    const [timeLeft, setTimeLeft] = useState(duration);
    const [isRunning, setIsRunning] = useState(false);

    useEffect(() => {
        let interval: number | null = null;

        if (isRunning && timeLeft > 0) {
            interval = window.setInterval(() => {
                setTimeLeft((prev) => {
                    if (prev <= 1) {
                        setIsRunning(false);
                        onComplete();
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        }

        return () => {
            if (interval) clearInterval(interval);
        };
    }, [isRunning, timeLeft, onComplete]);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const progress = ((duration - timeLeft) / duration) * 100;

    return (
        <div className="flex-1 flex flex-col items-center justify-center p-8 bg-[#050505]">
            {/* Title */}
            <div className="text-center mb-8">
                <h2 className="text-3xl font-bold text-white mb-2">{title}</h2>
                {subtitle && <p className="text-[#888] text-lg">{subtitle}</p>}
            </div>

            {/* Circular Timer */}
            <div className="relative w-72 h-72 mb-12">
                {/* Progress Ring */}
                <svg className="w-full h-full transform -rotate-90">
                    <circle
                        cx="144"
                        cy="144"
                        r="136"
                        stroke="#262626"
                        strokeWidth="12"
                        fill="none"
                    />
                    <circle
                        cx="144"
                        cy="144"
                        r="136"
                        stroke="#10B981"
                        strokeWidth="12"
                        fill="none"
                        strokeDasharray={`${2 * Math.PI * 136}`}
                        strokeDashoffset={`${2 * Math.PI * 136 * (1 - progress / 100)}`}
                        className="transition-all duration-1000"
                    />
                </svg>

                {/* Time Display */}
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <div className="text-7xl font-bold text-white tabular-nums">
                        {formatTime(timeLeft)}
                    </div>
                    <div className="text-sm text-[#666] mt-3">
                        {isRunning ? 'Resting...' : 'Paused'}
                    </div>
                </div>
            </div>

            {/* Controls */}
            <div className="flex gap-6">
                <button
                    onClick={() => setIsRunning(!isRunning)}
                    className={`px-10 py-4 rounded-xl font-bold text-lg transition-all shadow-lg ${isRunning
                            ? 'bg-[#F59E0B] hover:bg-[#D97706] text-white'
                            : 'bg-[#10B981] hover:bg-[#059669] text-white'
                        }`}
                >
                    {isRunning ? '⏸ Pause' : '▶ Start'}
                </button>

                <button
                    onClick={onSkip}
                    className="px-10 py-4 rounded-xl font-bold text-lg bg-[#3B82F6] hover:bg-[#2563EB] text-white transition-all shadow-lg"
                >
                    Skip Rest →
                </button>
            </div>

            {/* Hint */}
            <p className="text-[#666] text-sm mt-8">
                Rest helps your muscles recover between efforts
            </p>
        </div>
    );
}
