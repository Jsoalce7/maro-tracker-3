import { useState } from 'react';
import { SetConfig, ExerciseType, ProgressionType } from '../../types/workout';

interface SetConfigEditorProps {
    exerciseType: ExerciseType;
    setCount: number;
    perSetConfig: SetConfig[];
    progressionType: ProgressionType;
    onChange: (config: SetConfig[]) => void;
}

export function SetConfigEditor({
    exerciseType,
    setCount,
    perSetConfig,
    progressionType,
    onChange
}: SetConfigEditorProps) {

    // Auto-generate configs when set count changes
    const ensureConfigCount = () => {
        if (perSetConfig.length === setCount) return perSetConfig;

        const newConfigs: SetConfig[] = [];
        for (let i = 0; i < setCount; i++) {
            if (perSetConfig[i]) {
                newConfigs.push(perSetConfig[i]);
            } else {
                // Create default config based on exercise type
                newConfigs.push({
                    set: i + 1,
                    reps: exerciseType.includes('reps') ? 10 : undefined,
                    weight: exerciseType.includes('weight') ? 0 : undefined,
                    duration_seconds: exerciseType === 'time' ? 60 : undefined
                });
            }
        }
        return newConfigs;
    };

    const configs = ensureConfigCount();

    const handleSetChange = (setIndex: number, field: keyof SetConfig, value: number) => {
        const updated = [...configs];
        updated[setIndex] = { ...updated[setIndex], [field]: value };
        onChange(updated);
    };

    const handleAddSet = () => {
        // Copy last set or use defaults
        const lastSet = configs[configs.length - 1];
        const newSet: SetConfig = {
            set: configs.length + 1,
            reps: lastSet?.reps || (exerciseType.includes('reps') ? 10 : undefined),
            weight: lastSet?.weight || (exerciseType.includes('weight') ? 0 : undefined),
            duration_seconds: lastSet?.duration_seconds || (exerciseType === 'time' ? 60 : undefined)
        };
        onChange([...configs, newSet]);
    };

    const handleDeleteSet = (setIndex: number) => {
        if (configs.length <= 1) return; // Don't allow deleting last set

        const updated = configs.filter((_, idx) => idx !== setIndex);
        // Re-index set numbers
        const reindexed = updated.map((config, idx) => ({ ...config, set: idx + 1 }));
        onChange(reindexed);
    };

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-[#666] uppercase">
                    Set Configuration
                </label>
                {progressionType !== 'none' && (
                    <span className="text-xs text-[#3B82F6]">
                        {progressionType === 'increase' && '📈 Increasing'}
                        {progressionType === 'decrease' && '📉 Drop Sets'}
                        {progressionType === 'pyramid' && '⛰️ Pyramid'}
                    </span>
                )}
            </div>

            <div className="space-y-2">
                {configs.map((config, idx) => (
                    <div
                        key={idx}
                        className="flex items-center gap-2 p-3 bg-[#1A1A1A] border border-[#262626] rounded-xl"
                    >
                        {/* Set Number */}
                        <div className="w-12 text-sm font-bold text-[#888]">
                            Set {config.set}
                        </div>

                        {/* Reps Input */}
                        {
                            exerciseType.includes('reps') && (
                                <div className="flex-1">
                                    <input
                                        type="number"
                                        value={config.reps || ''}
                                        onChange={(e) => handleSetChange(idx, 'reps', parseInt(e.target.value) || 0)}
                                        placeholder="Reps"
                                        className="w-full px-3 py-2 bg-[#0A0A0A] border border-[#333] rounded-lg text-white text-sm focus:border-[#3B82F6] focus:outline-none"
                                    />
                                    <label className="text-xs text-[#666] mt-1 block">Reps</label>
                                </div>
                            )
                        }

                        {/* Weight Input */}
                        {
                            exerciseType.includes('weight') && (
                                <div className="flex-1">
                                    <input
                                        type="number"
                                        value={config.weight || ''}
                                        onChange={(e) => handleSetChange(idx, 'weight', parseFloat(e.target.value) || 0)}
                                        placeholder="Weight"
                                        className="w-full px-3 py-2 bg-[#0A0A0A] border border-[#333] rounded-lg text-white text-sm focus:border-[#3B82F6] focus:outline-none"
                                    />
                                    <label className="text-xs text-[#666] mt-1 block">lbs</label>
                                </div>
                            )
                        }

                        {/* Duration Input */}
                        {exerciseType === 'time' && (
                            <div className="flex-1">
                                <input
                                    type="number"
                                    value={config.duration_seconds || ''}
                                    onChange={(e) => handleSetChange(idx, 'duration_seconds', parseInt(e.target.value) || 0)}
                                    placeholder="Seconds"
                                    className="w-full px-3 py-2 bg-[#0A0A0A] border border-[#333] rounded-lg text-white text-sm focus:border-[#3B82F6] focus:outline-none"
                                />
                                <label className="text-xs text-[#666] mt-1 block">sec</label>
                            </div>
                        )}

                        {/* Delete Button */}
                        {configs.length > 1 && (
                            <button
                                onClick={() => handleDeleteSet(idx)}
                                className="w-8 h-8 flex items-center justify-center text-red-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                                title="Delete set"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        )}
                    </div>
                ))}

                {/* Add Set Button */}
                <button
                    onClick={handleAddSet}
                    className="w-full py-2 border-2 border-dashed border-[#444] rounded-xl text-[#888] hover:text-white hover:border-[#666] transition-colors flex items-center justify-center gap-2"
                >
                    <span className="text-lg">+</span>
                    <span className="text-sm">Add Set</span>
                </button>
            </div>

            {/* Quick fill buttons */}
            <div className="flex gap-2 pt-2">
                <button
                    onClick={() => {
                        // Copy first set to all
                        const first = configs[0];
                        onChange(configs.map((c, i) => ({ ...first, set: i + 1 })));
                    }}
                    className="text-xs px-3 py-1.5 bg-[#1A1A1A] border border-[#333] rounded-lg text-[#888] hover:text-white hover:border-[#3B82F6]"
                >
                    Same for All
                </button>

                {exerciseType.includes('weight') && (
                    <button
                        onClick={() => {
                            // Auto-increment weight
                            const base = configs[0].weight || 0;
                            onChange(configs.map((c, i) => ({
                                ...c,
                                weight: base + (i * 10)
                            })));
                        }}
                        className="text-xs px-3 py-1.5 bg-[#1A1A1A] border border-[#333] rounded-lg text-[#888] hover:text-white hover:border-[#3B82F6]"
                    >
                        +10 lbs each
                    </button>
                )}
            </div>
        </div >
    );
}
