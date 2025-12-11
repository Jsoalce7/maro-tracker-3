import { ProgressionType } from '../../types/workout';

interface ProgressionDisplayProps {
    type: ProgressionType;
    perSetConfig: Array<{ set: number; weight?: number; reps?: number }>;
}

export function ProgressionDisplay({ type, perSetConfig }: ProgressionDisplayProps) {
    if (type === 'none') return null;

    const getProgressionLabel = () => {
        switch (type) {
            case 'increase':
                return '📈 Increasing Weight';
            case 'decrease':
                return '📉 Drop Sets';
            case 'pyramid':
                return '⛰️ Pyramid';
            default:
                return null;
        }
    };

    const getTargetDisplay = () => {
        if (!perSetConfig || perSetConfig.length === 0) return '';

        return perSetConfig
            .map(s => {
                // Show weight progression if weights vary OR mode is weight_reps
                // Show reps progression if reps vary OR mode is reps_only
                const hasWeight = s.weight !== undefined && s.weight > 0;
                const hasReps = s.reps !== undefined && s.reps > 0;

                if (hasWeight && hasReps) {
                    return `${s.reps}×${s.weight}lb`;
                } else if (hasWeight) {
                    return `${s.weight}lb`;
                } else if (hasReps) {
                    return `${s.reps} reps`;
                }
                return '';
            })
            .filter(Boolean)
            .join(' → ');
    };

    return (
        <div className="bg-[#1A1D21] border border-[#262626] rounded-xl p-4 mb-4">
            <div className="flex items-center justify-between">
                <div>
                    <div className="text-xs font-bold text-[#888] uppercase mb-1">Progression</div>
                    <div className="text-lg font-bold text-white">{getProgressionLabel()}</div>
                </div>
                <div className="text-right">
                    <div className="text-xs font-bold text-[#888] uppercase mb-1">Set Targets</div>
                    <div className="text-sm text-[#3B82F6] font-mono">{getTargetDisplay()}</div>
                </div>
            </div>
        </div>
    );
}
