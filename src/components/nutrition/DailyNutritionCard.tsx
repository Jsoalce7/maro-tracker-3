import { useState } from 'react';
import { Card, CardHeader } from '../ui/Card';
import { RingChartWithLabels } from '../charts/RingChart';


interface DailyNutritionCardProps {
    calories: { consumed: number; target: number };
    protein: { consumed: number; target: number };
    fat: { consumed: number; target: number };
    carbs: { consumed: number; target: number };
    water?: number;
    caffeine?: number;
}

// Helper for Linear Progress Bar
const LinearProgressBar = ({ label, value, target, colorClass, bgClass, unit = 'g' }: { label: string, value: number, target: number, colorClass: string, bgClass: string, unit?: string }) => {
    const safeTarget = target || 1; // avoid divide by zero
    const pct = Math.min(Math.max((value / safeTarget) * 100, 0), 100);

    return (
        <div className="flex flex-col gap-1.5 w-full">
            <div className="flex items-center justify-between text-[13px]">
                <span className="font-semibold text-white tracking-tight">{label}</span>
                <div className="flex items-center gap-1">
                    <span className="font-bold text-white">{Math.round(value)}</span>
                    <span className="text-[#666] font-medium">/ {Math.round(target)}{unit}</span>
                </div>
            </div>
            <div className={`w-full h-2 rounded-full overflow-hidden ${bgClass}`}>
                <div
                    className={`h-full rounded-full transition-all duration-500 ease-out ${colorClass}`}
                    style={{ width: `${pct}%` }}
                />
            </div>
        </div>
    );
};

export function DailyNutritionCard({
    calories,
    protein,
    fat,
    carbs,
    water,
    caffeine
}: DailyNutritionCardProps) {
    const [showRemaining, setShowRemaining] = useState(false);
    const remainingCals = Math.max(calories.target - calories.consumed, 0);

    return (
        <Card className="animate-slide-up bg-[#141414] border border-[#222] rounded-[24px] shadow-sm p-5 flex flex-col">
            {/* Header Row */}
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h2 className="text-[17px] font-bold text-white tracking-tight leading-none mb-1">Today</h2>
                    <p className="text-[12px] text-[#666] font-medium tracking-wide uppercase">Daily Stats</p>
                </div>
                <button
                    onClick={() => setShowRemaining(!showRemaining)}
                    className="px-3 py-1 bg-[#2A2A2A] rounded-full text-[11px] font-bold text-[#A1A1A1] hover:text-white transition-colors"
                >
                    {showRemaining ? 'Remaining' : 'Consumed'}
                </button>
            </div>

            {/* Calories Ring */}
            <div className="my-4">
                <RingChartWithLabels
                    consumed={calories.consumed}
                    target={calories.target}
                    size={160}
                    strokeWidth={12}
                    className="mx-auto"
                />
            </div>

            {/* Macros Stack */}
            <div className="flex flex-col gap-4 mb-5">
                <LinearProgressBar
                    label="Protein"
                    value={protein.consumed}
                    target={protein.target}
                    colorClass="bg-[#FF4C4C]"
                    bgClass="bg-[#2A1515]"
                />
                <LinearProgressBar
                    label="Carbs"
                    value={carbs.consumed}
                    target={carbs.target}
                    colorClass="bg-[#4CD964]"
                    bgClass="bg-[#102915]"
                />
                <LinearProgressBar
                    label="Fat"
                    value={fat.consumed}
                    target={fat.target}
                    colorClass="bg-[#FFC44D]"
                    bgClass="bg-[#2A2210]"
                />
            </div>

            {/* Footer Metrics (Water & Caffeine) */}
            <div className="grid grid-cols-2 gap-3 mt-1">
                {/* Water Pill */}
                <div className="bg-[#1A1D21] border border-[#262626] rounded-xl p-3 flex items-center justify-between">
                    <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-[#666] uppercase tracking-wider mb-0.5">Water</span>
                        <span className="text-[14px] font-bold text-[#4C8DFF]">{water || 0}<span className="text-[11px] text-[#444] ml-0.5">ml</span></span>
                    </div>
                    <svg className="w-5 h-5 text-[#4C8DFF] opacity-80" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C8.5 6.5 5 11 5 14.5a7 7 0 1014 0C19 11 15.5 6.5 12 2zm0 17.5c-1.93 0-3.5-1.57-3.5-3.5 0-1.93 3.5-6.5 3.5-6.5s3.5 4.57 3.5 6.5c0 1.93-1.57 3.5-3.5 3.5z" /></svg>
                </div>

                {/* Caffeine Pill */}
                <div className="bg-[#1A1D21] border border-[#262626] rounded-xl p-3 flex items-center justify-between">
                    <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-[#666] uppercase tracking-wider mb-0.5">Caf.</span>
                        <span className="text-[14px] font-bold text-[#FFC44D]">{caffeine || 0}<span className="text-[11px] text-[#444] ml-0.5">mg</span></span>
                    </div>
                    <svg className="w-5 h-5 text-[#FFC44D] opacity-80" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                </div>
            </div>
        </Card>
    );
}
