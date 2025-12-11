import React, { useState } from 'react';
import { useWeightStore } from '../../stores/weightStore';
import { useAppStore } from '../../stores/appStore';
import { WeightChart } from './WeightChart';
import { WeightEntryModal } from './WeightEntryModal';
import { format, subDays } from 'date-fns';


export const CompactWeightCard: React.FC = () => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const { getLatestWeight, weights, fetchWeights, get7DayAverage } = useWeightStore();
    const { selectedDate } = useAppStore();

    React.useEffect(() => {
        fetchWeights();
    }, [fetchWeights]);

    // 1. Determine Display Weight (Selected Date)
    const displayDateStr = selectedDate || format(new Date(), 'yyyy-MM-dd');
    const selectedWeightEntry = weights.find(w => w.date === displayDateStr);
    const selectedWeight = selectedWeightEntry ? selectedWeightEntry.weight_lb : null;

    // 2. Calculate Delta (vs Yesterday relative to Selected Date)
    const yesterdayStr = format(subDays(new Date(displayDateStr), 1), 'yyyy-MM-dd');
    const yesterdayWeight = weights.find(w => w.date === yesterdayStr)?.weight_lb;

    let delta = null;
    if (selectedWeight && yesterdayWeight) {
        delta = selectedWeight - yesterdayWeight;
    }

    // 3. Calculate Trend (Selected Date 7-day Avg vs Previous Week)
    const currentAvg = get7DayAverage(displayDateStr);
    const prevWeekAvg = get7DayAverage(format(subDays(new Date(displayDateStr), 7), 'yyyy-MM-dd'));

    let trend: 'Up' | 'Down' | 'Stable' | null = null;
    if (currentAvg && prevWeekAvg) {
        const diff = currentAvg - prevWeekAvg;
        if (diff <= -0.5) trend = 'Down';
        else if (diff >= 0.5) trend = 'Up';
        else trend = 'Stable';
    }

    const formatDelta = (val: number | null) => {
        if (val === null) return '—';
        const sign = val > 0 ? '+' : '';
        return `${sign}${val.toFixed(1)} lb`;
    };

    return (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 relative overflow-hidden flex flex-col h-full max-h-[450px]">
            {/* Header (Fixed) */}
            <div className="flex-shrink-0 flex justify-between items-start mb-2 w-full relative z-10">
                <div className="w-full">
                    <div className="flex justify-between items-baseline mb-1">
                        <h3 className="text-sm font-medium text-zinc-400">
                            Weight ({format(new Date(displayDateStr), 'MMM d')})
                        </h3>
                    </div>
                    <div className="text-2xl font-bold text-white">
                        {selectedWeight ? `${selectedWeight} lb` : <span className="text-zinc-500 font-normal text-lg italic">No data</span>}
                    </div>
                </div>
            </div>

            {/* Scrollable Body (Chart + Metrics) */}
            <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar flex flex-col gap-2">
                {/* Chart - balanced spacing */}
                <div className="w-full relative z-0 flex-shrink-0">
                    <WeightChart className="h-40" days={15} />
                </div>

                {/* Metrics Grid */}
                <div className="grid grid-cols-2 gap-3 pb-2 relative z-10 text-center md:text-left flex-shrink-0">
                    <div className="bg-zinc-950 rounded-lg p-3 border border-zinc-800">
                        <div className="text-[10px] uppercase tracking-wider text-zinc-500 mb-1">vs Yesterday</div>
                        <div className={`text-sm font-medium ${delta && delta > 0 ? 'text-red-400' :
                            delta && delta < 0 ? 'text-green-400' : 'text-zinc-300'
                            }`}>
                            {formatDelta(delta)}
                        </div>
                    </div>
                    <div className="bg-zinc-950 rounded-lg p-3 border border-zinc-800">
                        <div className="text-[10px] uppercase tracking-wider text-zinc-500 mb-1">Trend</div>
                        <div className={`text-sm font-medium ${trend === 'Down' ? 'text-green-400' :
                            trend === 'Up' ? 'text-red-400' : 'text-zinc-300'
                            }`}>
                            {trend || 'No data'}
                        </div>
                    </div>
                </div>
            </div>

            {/* Footer (Fixed) */}
            <div className="flex-shrink-0 pt-3 mt-auto relative z-20">
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="w-full bg-zinc-800 hover:bg-zinc-700 text-white text-sm font-medium py-2.5 rounded-lg transition-colors border border-zinc-700 cursor-pointer"
                >
                    Add Weight
                </button>
            </div>

            <WeightEntryModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                initialDate={selectedDate || format(new Date(), 'yyyy-MM-dd')}
            />
        </div>
    );
};
