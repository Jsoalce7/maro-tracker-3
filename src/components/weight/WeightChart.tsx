import React from 'react';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer
} from 'recharts';
import { useWeightStore } from '../../stores/weightStore';
import { format, subDays, parseISO, isValid } from 'date-fns';
import { AddWeightIcon } from '../ui/icons/AddWeightIcon'; // Ensure this matches file path
import { WeightEntryModal } from './WeightEntryModal';

interface WeightChartProps {
    className?: string; // Allow overriding height
    days?: number; // Days to look back
}

export const WeightChart: React.FC<WeightChartProps> = ({ className = "h-64", days = 30 }) => {
    const { weights, get7DayAverage, fetchWeights, loading } = useWeightStore();
    const [isModalOpen, setIsModalOpen] = React.useState(false);

    React.useEffect(() => {
        fetchWeights();
    }, [fetchWeights]);

    // Data Processing
    const processedData = React.useMemo(() => {
        if (!weights.length) return [];

        const today = new Date();
        const data = [];

        // Show last N days
        for (let i = days - 1; i >= 0; i--) {
            const d = subDays(today, i);
            const dateStr = format(d, 'yyyy-MM-dd');

            const entry = weights.find(w => w.date === dateStr);
            const avg = get7DayAverage(dateStr); // This util handles its own window lookup

            data.push({
                date: dateStr,
                displayDate: format(d, 'MMM d'),
                weight: entry ? entry.weight_lb : null,
                average: avg
            });
        }
        return data;
    }, [weights, get7DayAverage, days]);

    const hasData = weights.length > 0;
    const hasEnoughDataForTrend = weights.length >= 7;

    // Y Axis Domain Calculation
    const yDomain = React.useMemo(() => {
        const values = processedData
            .flatMap(d => [d.weight, d.average])
            .filter((v): v is number => typeof v === 'number' && !isNaN(v));

        if (values.length === 0) return [0, 200]; // Default placeholder

        const min = Math.min(...values);
        const max = Math.max(...values);

        // Ensure strictly valid numbers
        if (!isFinite(min) || !isFinite(max)) return [0, 200];

        return [Math.floor(min - 2), Math.ceil(max + 2)];
    }, [processedData]);


    // States
    if (loading && !hasData) {
        return (
            <div className={`${className} bg-zinc-900/50 rounded-xl animate-pulse flex items-center justify-center`}>
                <span className="text-zinc-500 text-sm">Loading chart...</span>
            </div>
        );
    }

    if (!hasData) {
        return (
            <div className={`${className} bg-zinc-900/30 rounded-xl flex flex-col items-center justify-center border border-zinc-800 border-dashed`}>
                <AddWeightIcon />
                <p className="text-zinc-500 text-sm mb-3">No weight data yet.</p>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="text-blue-400 text-xs font-medium hover:text-blue-300 transition-colors"
                >
                    Add First Weight
                </button>
                <WeightEntryModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
            </div>
        );
    }

    return (
        <div className={`${className} w-full relative group`}>
            {/* Info for Sparse Data */}
            {!hasEnoughDataForTrend && weights.length > 1 && (
                <div className="absolute top-2 right-2 bg-zinc-900/80 backdrop-blur px-2 py-1 rounded text-[10px] text-zinc-500 border border-zinc-800 pointer-events-none">
                    Trend needs 7+ entries
                </div>
            )}

            <ResponsiveContainer width="100%" height="100%">
                <LineChart data={processedData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" vertical={false} />
                    <XAxis
                        dataKey="displayDate"
                        stroke="#71717a"
                        tick={{ fontSize: 11, fill: '#d4d4d8' }} // Lighter text color
                        tickMargin={10}
                        minTickGap={30}
                        interval="preserveStartEnd"
                        axisLine={false}
                        tickLine={false}
                    />
                    <YAxis
                        type="number"
                        domain={yDomain}
                        stroke="#71717a"
                        tick={{ fontSize: 11, fill: '#d4d4d8' }} // Lighter text color
                        axisLine={false}
                        tickLine={false}
                        width={40}  // Increased from 35
                        allowDecimals={false}
                    />
                    <Tooltip
                        cursor={{ stroke: '#52525b', strokeWidth: 1, strokeDasharray: '4 4' }}
                        contentStyle={{
                            backgroundColor: '#18181b',
                            border: '1px solid #27272a',
                            borderRadius: '8px',
                            padding: '8px 12px',
                            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.5)'
                        }}
                        itemStyle={{ fontSize: '12px', fontWeight: 500, color: '#fff' }}
                        labelStyle={{ fontSize: '11px', color: '#a1a1aa', marginBottom: '4px' }}
                        formatter={(value: number, name: string) => [
                            `${value} lb`,
                            name === 'average' ? '7-Day Trend' : 'Weight'
                        ]}
                    />

                    {/* Render Trend Line Only if we have enough data */}
                    {hasEnoughDataForTrend && (
                        <Line
                            type="monotone"
                            dataKey="average"
                            stroke="#3b82f6"
                            strokeWidth={2}
                            dot={false}
                            name="average" // Key for tooltip formatter matching
                            connectNulls
                            animationDuration={500}
                            isAnimationActive={false} // Disable animation for instant refresh feel
                        />
                    )}

                    <Line
                        type="monotone"
                        dataKey="weight"
                        stroke="#ffffff"
                        strokeWidth={1.5}
                        dot={{ r: 4, fill: '#18181b', stroke: '#fff', strokeWidth: 2 }}
                        activeDot={{ r: 6, fill: '#fff', strokeWidth: 0 }}
                        name="weight"
                        connectNulls
                        animationDuration={300}
                        isAnimationActive={false} // Snappy updates
                    />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
};
