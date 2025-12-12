import React, { useEffect, useState } from 'react';

interface MacroRingProps {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    size?: number;
    strokeWidth?: number;
    hideText?: boolean;
}

export const MacroRing: React.FC<MacroRingProps> = ({
    calories,
    protein,
    carbs,
    fat,
    size = 70,
    strokeWidth = 6,
    hideText = false
}) => {
    const [animated, setAnimated] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => setAnimated(true), 100);
        return () => clearTimeout(timer);
    }, []);

    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const center = size / 2;

    // Strict Calorie-based visualization (Option B)
    // P=4, C=4, F=9
    const pCals = protein * 4;
    const cCals = carbs * 4;
    const fCals = fat * 9;
    const totalCalcCals = pCals + cCals + fCals || 1;

    // Calculate percentages strictly based on caloric contribution
    const pPct = pCals / totalCalcCals;
    const cPct = cCals / totalCalcCals;
    const fPct = fCals / totalCalcCals;

    // Order: Fat (Yellow) -> Carbs (Green) -> Protein (Red)
    const fatLength = fPct * circumference;
    const carbsLength = cPct * circumference;
    const proteinLength = pPct * circumference;

    return (
        <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
            <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="transform -rotate-90">
                {/* Background Track */}
                <circle cx={center} cy={center} r={radius} fill="none" stroke="#2A2A2A" strokeWidth={strokeWidth} />

                {/* Fat (Yellow) */}
                <circle
                    cx={center} cy={center} r={radius} fill="none" stroke="#FFC44D" strokeWidth={strokeWidth}
                    strokeDasharray={`${fatLength} ${circumference}`}
                    strokeDashoffset={0}
                    strokeLinecap="round"
                    className="transition-all duration-1000 ease-out"
                    style={{ opacity: animated ? 1 : 0, strokeDasharray: animated ? `${fatLength} ${circumference}` : `0 ${circumference}` }}
                />

                {/* Carbs (Green) */}
                <circle
                    cx={center} cy={center} r={radius} fill="none" stroke="#4CD964" strokeWidth={strokeWidth}
                    strokeDasharray={`${carbsLength} ${circumference}`}
                    strokeDashoffset={-fatLength} // Starts after fat
                    strokeLinecap="round"
                    className="transition-all duration-1000 ease-out delay-100"
                    style={{ opacity: animated ? 1 : 0, strokeDasharray: animated ? `${carbsLength} ${circumference}` : `0 ${circumference}` }}
                />

                {/* Protein (Red) */}
                <circle
                    cx={center} cy={center} r={radius} fill="none" stroke="#FF4C4C" strokeWidth={strokeWidth}
                    strokeDasharray={`${proteinLength} ${circumference}`}
                    strokeDashoffset={-(fatLength + carbsLength)} // Starts after fat + carbs
                    strokeLinecap="round"
                    className="transition-all duration-1000 ease-out delay-200"
                    style={{ opacity: animated ? 1 : 0, strokeDasharray: animated ? `${proteinLength} ${circumference}` : `0 ${circumference}` }}
                />
            </svg>

            {/* Centered Calories */}
            {!hideText && (
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span
                        className="text-white font-bold tracking-tight leading-none"
                        style={{ fontSize: Math.max(11, size * 0.28) }}
                    >
                        {Math.round(calories || 0)}
                    </span>
                </div>
            )}
        </div>
    );
};
