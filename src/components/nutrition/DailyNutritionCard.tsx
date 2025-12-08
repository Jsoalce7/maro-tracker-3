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

        <Card className="animate-slide-up border border-[#262932] bg-[#13151A] rounded-[24px] shadow-sm p-6">
            <CardHeader
                title="Daily Nutrition"
                subtitle="Today"
                action={
                    <button
                        onClick={() => setShowRemaining(!showRemaining)}
                        className="text-[11px] font-medium tracking-wide px-3 py-1.5 rounded-full bg-[#1F2128] text-[#8A8F99] hover:text-white hover:bg-[#262830] transition-colors border border-[#2A2D36]"
                    >
                        {showRemaining ? 'Remaining' : 'Consumed'}
                    </button>
                }
            />

            {/* Calories Ring */}
            <div className="my-8 relative">
                {/* Clean, no-glow ring container */}
                <RingChartWithLabels
                    consumed={calories.consumed}
                    target={calories.target}
                    size={200}
                    strokeWidth={14}
                    className="relative z-10"
                />
            </div>

            {/* Divider */}
            <div className="h-px bg-[#262932] my-6" />

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
                    <div className="h-px bg-[#262932] my-6" />
                    <div className="grid grid-cols-2 gap-4">
                        {/* Water */}
                        <div className="bg-[#17191F] p-4 rounded-[20px] border border-[#262932] flex items-center justify-between group hover:bg-[#1C1E24] transition-colors">
                            <div>
                                <div className="text-[11px] uppercase tracking-wider text-[#8A8F99] font-bold mb-1">Water</div>
                                <div className="text-xl font-bold text-[#4C8DFF]">{water || 0}<span className="text-[11px] font-medium text-[#555] ml-1">ml</span></div>
                            </div>
                            <div className="text-[#4C8DFF] opacity-80">
                                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C8.5 6.5 5 11 5 14.5a7 7 0 1014 0C19 11 15.5 6.5 12 2zm0 17.5c-1.93 0-3.5-1.57-3.5-3.5 0-1.93 3.5-6.5 3.5-6.5s3.5 4.57 3.5 6.5c0 1.93-1.57 3.5-3.5 3.5z" /></svg>
                            </div>
                        </div>

                        {/* Caffeine */}
                        <div className="bg-[#17191F] p-4 rounded-[20px] border border-[#262932] flex items-center justify-between group hover:bg-[#1C1E24] transition-colors">
                            <div>
                                <div className="text-[11px] uppercase tracking-wider text-[#8A8F99] font-bold mb-1">Caffeine</div>
                                <div className="text-xl font-bold text-[#FFC44D]">{caffeine || 0}<span className="text-[11px] font-medium text-[#555] ml-1">mg</span></div>
                            </div>
                            <div className="text-[#FFC44D] opacity-80">
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </Card>
    );
}
