import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { formatCalories } from '../../lib/format';

interface RingChartProps {
    consumed: number;
    target: number;
    size?: number;
    strokeWidth?: number;
    className?: string;
}

export function RingChart({
    consumed,
    target,
    size = 180,
    strokeWidth = 12,
    className = ''
}: RingChartProps) {
    // Handle NaN/undefined values
    const safeConsumed = isNaN(consumed) ? 0 : consumed;
    const safeTarget = isNaN(target) || target === 0 ? 1 : target;

    const percentage = Math.min(100, (safeConsumed / safeTarget) * 100);
    const remaining = Math.max(0, 100 - percentage);

    const data = [
        { name: 'consumed', value: percentage },
        { name: 'remaining', value: remaining },
    ];

    // Gradient colors for the consumed portion
    const consumedColor = percentage > 100 ? '#EF4444' : '#3B82F6';
    const remainingColor = '#2A2A2A';

    return (
        <div className={`relative ${className}`} style={{ width: size, height: size, minWidth: size, minHeight: size }}>
            <ResponsiveContainer width="100%" height="100%" minWidth={size} minHeight={size}>
                <PieChart>
                    <Pie
                        data={data}
                        cx="50%"
                        cy="50%"
                        innerRadius={size / 2 - strokeWidth}
                        outerRadius={size / 2}
                        startAngle={90}
                        endAngle={-270}
                        paddingAngle={0}
                        dataKey="value"
                        stroke="none"
                    >
                        <Cell fill={consumedColor} />
                        <Cell fill={remainingColor} />
                    </Pie>
                </PieChart>
            </ResponsiveContainer>

            {/* Center content */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-bold text-white">{formatCalories(safeConsumed)}</span>
                <span className="text-sm text-[#6B6B6B]">kcal</span>
            </div>
        </div>
    );
}

interface RingChartWithLabelsProps extends RingChartProps {
    showLabels?: boolean;
}

export function RingChartWithLabels({
    consumed,
    target,
    size = 180,
    strokeWidth = 12,
    className = ''
}: RingChartWithLabelsProps) {
    // Handle NaN values
    const safeConsumed = isNaN(consumed) ? 0 : consumed;
    const safeTarget = isNaN(target) ? 0 : target;
    const remaining = Math.max(0, safeTarget - safeConsumed);

    return (
        <div className={`flex items-center justify-between ${className}`}>
            {/* Left label - Remaining */}
            <div className="flex flex-col items-center min-w-[70px]">
                <span className="text-xl font-semibold text-white">{formatCalories(remaining)}</span>
                <span className="text-xs text-[#6B6B6B]">Remaining</span>
            </div>

            {/* Ring Chart */}
            <RingChart
                consumed={safeConsumed}
                target={safeTarget}
                size={size}
                strokeWidth={strokeWidth}
            />

            {/* Right label - Target */}
            <div className="flex flex-col items-center min-w-[70px]">
                <span className="text-xl font-semibold text-white">{formatCalories(safeTarget)}</span>
                <span className="text-xs text-[#6B6B6B]">Target</span>
            </div>
        </div>
    );
}
