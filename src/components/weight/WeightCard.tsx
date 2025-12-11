import React, { useState } from 'react';
import { useWeightStore } from '../../stores/weightStore';
import { WeightChart } from './WeightChart';
import { WeightEntryModal } from './WeightEntryModal';
import { format, subDays } from 'date-fns';

export const WeightCard: React.FC = () => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const { getLatestWeight, get7DayAverage, weights, fetchWeights } = useWeightStore();

    React.useEffect(() => {
        fetchWeights();
    }, [fetchWeights]);

    const latestWeight = getLatestWeight();
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const yesterdayStr = format(subDays(new Date(), 1), 'yyyy-MM-dd');

    // Calculate Delta vs Yesterday
    const yesterdayWeight = weights.find(w => w.date === yesterdayStr)?.weight_lb;
    let deltaYesterday = null;
    if (latestWeight && yesterdayWeight) {
        deltaYesterday = latestWeight - yesterdayWeight;
    }

    // Calculate Trend (Current 7-Day Avg vs Previous 7-Day Avg)
    const currentAvg = get7DayAverage(todayStr);
    const prevWeekAvg = get7DayAverage(format(subDays(new Date(), 7), 'yyyy-MM-dd'));

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

    // Find date of latest weight
    const lastUpdatedDate = weights.length > 0 ? weights[0].updated_at : null;
    const lastUpdatedStr = lastUpdatedDate ? format(new Date(lastUpdatedDate), 'MMM d, yyyy') : 'Never';

    return (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
            <div className="flex justify-between items-start mb-6 w-full">
                <div className="w-full">
                    <div className="flex justify-between items-baseline mb-1">
                        <h2 className="text-lg font-semibold text-white">Weight Tracker</h2>
                        <span className="text-[10px] text-zinc-500 font-medium uppercase tracking-wider">
                            Last: {lastUpdatedStr}
                        </span>
                    </div>
                    <div className="text-3xl font-bold text-white mt-2">
                        {latestWeight ? `${latestWeight} lb` : '—'}
                    </div>
                </div>
            </div>

            <div className="mb-6">
                <WeightChart />
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-zinc-950 rounded-lg p-3 border border-zinc-800">
                    <div className="text-xs text-zinc-500 mb-1">vs Yesterday</div>
                    <div className={`text-sm font-medium ${deltaYesterday && deltaYesterday > 0 ? 'text-red-400' :
                        deltaYesterday && deltaYesterday < 0 ? 'text-green-400' : 'text-zinc-300'
                        }`}>
                        {formatDelta(deltaYesterday)}
                    </div>
                </div>
                <div className="bg-zinc-950 rounded-lg p-3 border border-zinc-800">
                    <div className="text-xs text-zinc-500 mb-1">Trend</div>
                    <div className={`text-sm font-medium ${trend === 'Down' ? 'text-green-400' :
                        trend === 'Up' ? 'text-red-400' : 'text-zinc-300'
                        }`}>
                        {trend || 'Not enough data'}
                    </div>
                </div>
            </div>

            <button
                onClick={() => setIsModalOpen(true)}
                className="w-full bg-zinc-800 hover:bg-zinc-700 text-white font-medium py-3 rounded-lg transition-colors border border-zinc-700"
            >
                Add Weight
            </button>

            <WeightEntryModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
        </div>
    );
};
