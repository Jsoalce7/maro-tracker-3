import { useState } from 'react';
import { Card, CardHeader } from '../ui/Card';
import { RingChartWithLabels } from '../charts/RingChart';
import { MacrosSection } from '../charts/MacroBar';

interface DailyNutritionCardProps {
    calories: { consumed: number; target: number };
    protein: { consumed: number; target: number };
    fat: { consumed: number; target: number };
    carbs: { consumed: number; target: number };
    water?: number;
    caffeine?: number;
}

export function DailyNutritionCard({
    calories,
    protein,
    fat,
    carbs,
    water,
    caffeine
}: DailyNutritionCardProps) {
    const [showRemaining, setShowRemaining] = useState(false);

    return (
        <Card className="animate-slide-up">
            <CardHeader
                title="Daily Nutrition"
                subtitle="Today"
                action={
                    <button
                        onClick={() => setShowRemaining(!showRemaining)}
                        className="text-xs px-3 py-1 rounded-full bg-[#242424] text-[#A1A1A1] hover:bg-[#2A2A2A] transition-colors"
                    >
                        {showRemaining ? 'Remaining' : 'Consumed'}
                    </button>
                }
            />

            {/* Calories Ring */}
            <div className="my-6">
                <RingChartWithLabels
                    consumed={calories.consumed}
                    target={calories.target}
                    size={160}
                    strokeWidth={10}
                />
            </div>

            {/* Divider */}
            <div className="h-px bg-[#2A2A2A] my-4" />

            {/* Macros */}
            <MacrosSection
                protein={protein}
                fat={fat}
                carbs={carbs}
                showRemaining={showRemaining}
            />

            {/* Extra Metrics (Water & Caffeine) */}
            {(caffeine !== undefined || water !== undefined) && (
                <>
                    <div className="h-px bg-[#2A2A2A] my-4" />
                    <div className="grid grid-cols-2 gap-4">
                        {/* Water */}
                        <div className="bg-[#1A1A1A] p-3 rounded-xl border border-[#2A2A2A] flex items-center justify-between">
                            <div>
                                <div className="text-xs text-[#6B6B6B] font-medium mb-1">Water</div>
                                <div className="text-xl font-bold text-blue-400">{water || 0}<span className="text-xs font-normal text-[#6B6B6B] ml-1">ml</span></div>
                            </div>
                            <div className="text-blue-500/20">
                                <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C8.5 6.5 5 11 5 14.5a7 7 0 1014 0C19 11 15.5 6.5 12 2zm0 17.5c-1.93 0-3.5-1.57-3.5-3.5 0-1.93 3.5-6.5 3.5-6.5s3.5 4.57 3.5 6.5c0 1.93-1.57 3.5-3.5 3.5z" /></svg>
                            </div>
                        </div>

                        {/* Caffeine */}
                        <div className="bg-[#1A1A1A] p-3 rounded-xl border border-[#2A2A2A] flex items-center justify-between">
                            <div>
                                <div className="text-xs text-[#6B6B6B] font-medium mb-1">Caffeine</div>
                                <div className="text-xl font-bold text-amber-500">{caffeine || 0}<span className="text-xs font-normal text-[#6B6B6B] ml-1">mg</span></div>
                            </div>
                            <div className="text-amber-500/20">
                                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </Card>
    );
}
