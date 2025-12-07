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
    protein: 'bg-[#EF4444]',
    fat: 'bg-[#F59E0B]',
    carbs: 'bg-[#10B981]',
};

const textColorClasses = {
    protein: 'text-[#EF4444]',
    fat: 'text-[#F59E0B]',
    carbs: 'text-[#10B981]',
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
        <div className="space-y-2">
            {/* Header row */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${colorClasses[color]}`} />
                    <span className="text-sm text-white font-medium">{label}</span>
                </div>
                <div className="flex items-center gap-1">
                    <span className={`text-sm font-semibold ${isOver ? 'text-[#EF4444]' : 'text-white'}`}>
                        {displayValue}
                    </span>
                    <span className="text-sm text-[#6B6B6B]">
                        / {target}{unit} {displayLabel}
                    </span>
                </div>
            </div>

            {/* Progress bar */}
            <div className="h-1 bg-[#2A2A2A] rounded-full overflow-hidden">
                <div
                    className={`h-full rounded-full transition-all duration-500 ease-out ${isOver ? 'bg-[#EF4444]' : colorClasses[color]}`}
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
