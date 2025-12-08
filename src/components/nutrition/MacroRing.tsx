import React, { useEffect, useState } from 'react';

interface MacroRingProps {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    size?: number;
    strokeWidth?: number;
}

export const MacroRing: React.FC<MacroRingProps> = ({
    calories,
    protein,
    carbs,
    fat,
    size = 70,
    strokeWidth = 6
}) => {
    const [animated, setAnimated] = useState(false);

    useEffect(() => {
        // Trigger animation after mount
        const timer = setTimeout(() => setAnimated(true), 100);
        return () => clearTimeout(timer);
    }, []);

    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const center = size / 2;

    // Calculate caloric contribution usually, or gram contribution.
    // Standard visual is often caloric: P*4, C*4, F*9.
    const pCals = protein * 4;
    const cCals = carbs * 4;
    const fCals = fat * 9;
    const totalCalcCals = pCals + cCals + fCals || 1; // avoid divide by 0

    const pPct = pCals / totalCalcCals;
    const cPct = cCals / totalCalcCals;
    const fPct = fCals / totalCalcCals;

    // Segments
    // Order: Fat (Yellow) -> Carbs (Green) -> Protein (Red)
    // You can choose any order.

    // 1. Fat
    const fatLength = fPct * circumference;
    const fatOffset = 0; // Starts at top (-90deg handled by svg rotation)

    // 2. Carbs
    const carbsLength = cPct * circumference;
    const carbsOffset = -fatLength; // Starts where Fat ends

    // 3. Protein
    const proteinLength = pPct * circumference;
    const proteinOffset = -(fatLength + carbsLength); // Starts where Carbs ends

    return (
        <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
            <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="transform -rotate-90">
                {/* Background Track */}
                <circle
                    cx={center}
                    cy={center}
                    r={radius}
                    fill="none"
                    stroke="#2A2A2A"
                    strokeWidth={strokeWidth}
                />

                {/* Fat Segment (Yellow) */}
                <circle
                    cx={center}
                    cy={center}
                    r={radius}
                    fill="none"
                    stroke="#FFC44D"
                    strokeWidth={strokeWidth}
                    strokeDasharray={`${fatLength} ${circumference}`}
                    strokeDashoffset={0}
                    strokeLinecap="round"
                    className="transition-all duration-1000 ease-out"
                    style={{
                        opacity: animated ? 1 : 0,
                        strokeDasharray: animated ? `${fatLength} ${circumference}` : `0 ${circumference}`
                    }}
                />

                {/* Carbs Segment (Green) */}
                <circle
                    cx={center}
                    cy={center}
                    r={radius}
                    fill="none"
                    stroke="#4CD964"
                    strokeWidth={strokeWidth}
                    strokeDasharray={`${carbsLength} ${circumference}`}
                    strokeDashoffset={-fatLength}
                    strokeLinecap="round"
                    className="transition-all duration-1000 ease-out delay-100"
                    style={{
                        opacity: animated ? 1 : 0,
                        strokeDasharray: animated ? `${carbsLength} ${circumference}` : `0 ${circumference}`
                    }}
                />

                {/* Protein Segment (Red) */}
                <circle
                    cx={center}
                    cy={center}
                    r={radius}
                    fill="none"
                    stroke="#FF4C4C"
                    strokeWidth={strokeWidth}
                    strokeDasharray={`${proteinLength} ${circumference}`}
                    strokeDashoffset={-(fatLength + carbsLength)}
                    strokeLinecap="round"
                    className="transition-all duration-1000 ease-out delay-200"
                    style={{
                        opacity: animated ? 1 : 0,
                        strokeDasharray: animated ? `${proteinLength} ${circumference}` : `0 ${circumference}`
                    }}
                />
            </svg>

            {/* Centered Calories */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-white font-bold text-sm tracking-tight leading-none">
                    {Math.round(calories)}
                </span>
            </div>
        </div>
    );
};
