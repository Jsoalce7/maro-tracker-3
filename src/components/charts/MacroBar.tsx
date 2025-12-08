import { getPercentage } from '../../lib/calculations';

interface MacroBarProps {
    label: string;
    consumed: number;
    target: number;
    color: 'protein' | 'fat' | 'carbs';
    unit?: string;
    showRemaining?: boolean;
}

const colorClasses = {
    protein: 'bg-[#FF4C4C]',
    fat: 'bg-[#FFC44D]',
    carbs: 'bg-[#4CD964]',
};

const textColorClasses = {
    protein: 'text-[#FF4C4C]',
    fat: 'text-[#FFC44D]',
    carbs: 'text-[#4CD964]',
};

export function MacroBar({
    label,
    consumed,
    target,
    color,
    unit = 'g',
    showRemaining = false
}: MacroBarProps) {
    const percentage = getPercentage(consumed, target);
    const remaining = Math.max(0, target - consumed);
    const isOver = consumed > target;

    const displayValue = showRemaining ? remaining : consumed;
    const displayLabel = showRemaining ? 'left' : '';

    return (
        <div className="mb-4 last:mb-0">
            {/* Header row */}
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                    <span className="text-[13px] text-[#F5F5F7] font-medium tracking-wide">{label}</span>
                </div>
                <div className="flex items-center gap-1">
                    <span className={`text-[13px] font-semibold ${isOver ? 'text-[#FF4C4C]' : 'text-[#F5F5F7]'}`}>
                        {Math.round(displayValue)}
                    </span>
                    <span className="text-[11px] text-[#8A8F99] font-medium">
                        / {target}{unit}
                    </span>
                </div>
            </div>

            {/* Progress bar */}
            <div className="h-[4px] bg-[#262932] rounded-full overflow-hidden">
                <div
                    className={`h-full rounded-full transition-all duration-500 ease-out ${isOver ? 'bg-[#FF4C4C]' : colorClasses[color]}`}
                    style={{ width: `${Math.min(percentage, 100)}%` }}
                />
            </div>
        </div>
    );
}

interface MacrosSectionProps {
    protein: { consumed: number; target: number };
    fat: { consumed: number; target: number };
    carbs: { consumed: number; target: number };
    showRemaining?: boolean;
}

export function MacrosSection({ protein, fat, carbs, showRemaining = false }: MacrosSectionProps) {
    return (
        <div className="space-y-4">
            <MacroBar
                label="Protein"
                consumed={protein.consumed}
                target={protein.target}
                color="protein"
                showRemaining={showRemaining}
            />
            <MacroBar
                label="Fat"
                consumed={fat.consumed}
                target={fat.target}
                color="fat"
                showRemaining={showRemaining}
            />
            <MacroBar
                label="Carbs"
                consumed={carbs.consumed}
                target={carbs.target}
                color="carbs"
                showRemaining={showRemaining}
            />
        </div>
    );
}
