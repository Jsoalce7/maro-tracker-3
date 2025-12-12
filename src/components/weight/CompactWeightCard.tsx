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
        <div className="bg-[#141414] border border-[#222] rounded-[24px] p-5 relative overflow-hidden flex flex-col h-full max-h-[450px]">
            {/* Header (Fixed) */}
            <div className="flex-shrink-0 flex justify-between items-start mb-4 w-full relative z-10">
                <div className="w-full">
                    <div className="flex items-center gap-3 mb-1">
                        <div className="w-8 h-8 rounded-full bg-[#2A2A2A] flex items-center justify-center">
                            <span className="text-sm">⚖️</span>
                        </div>
                        <h3 className="text-[15px] font-bold text-white tracking-wide uppercase">Weight</h3>
                    </div>
                    <div className="flex items-baseline gap-2 mt-2">
                        <span className="text-[32px] font-bold text-white tracking-tighter leading-none">
                            {selectedWeight ? selectedWeight : '--'}
                        </span>
                        <span className="text-[15px] font-medium text-[#666] tracking-tight">lb</span>
                    </div>
                </div>
            </div>

            {/* Scrollable Body (Chart + Metrics) */}
            <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar flex flex-col gap-4">
                {/* Chart */}
                <div className="w-full relative z-0 flex-shrink-0 h-32">
                    <WeightChart className="h-full" days={15} />
                </div>

                {/* Metrics Grid */}
                <div className="grid grid-cols-2 gap-2 pb-2 relative z-10 flex-shrink-0">
                    <div className="bg-[#1A1A1A] rounded-xl p-3 border border-[#262626] flex flex-col">
                        <span className="text-[10px] text-[#666] font-bold uppercase tracking-wider mb-1">vs Yesterday</span>
                        <span className={`text-[14px] font-bold ${delta && delta > 0 ? 'text-[#FF4C4C]' :
                                delta && delta < 0 ? 'text-[#4CD964]' : 'text-[#8E8E93]'
                            }`}>
                            {formatDelta(delta)}
                        </span>
                    </div>
                    <div className="bg-[#1A1A1A] rounded-xl p-3 border border-[#262626] flex flex-col">
                        <span className="text-[10px] text-[#666] font-bold uppercase tracking-wider mb-1">Trend</span>
                        <span className={`text-[14px] font-bold ${trend === 'Down' ? 'text-[#4CD964]' :
                                trend === 'Up' ? 'text-[#FF4C4C]' : 'text-[#8E8E93]'
                            }`}>
                            {trend || '--'}
                        </span>
                    </div>
                </div>
            </div>

            {/* Footer (Fixed) */}
            <div className="flex-shrink-0 pt-3 mt-auto relative z-20">
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="w-full bg-[#2A2A2A] hover:bg-[#333] text-white text-[13px] font-bold py-3 rounded-xl transition-colors border border-[#333] cursor-pointer"
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
