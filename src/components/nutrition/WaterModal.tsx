import { useState, useEffect } from 'react';
import { useWater } from '../../hooks/useWater';

interface WaterModalProps {
    date: string;
    onClose: () => void;
}

const BOTTLE_SIZES = [
    { label: 'Cup', amount: 8, unit: 'oz' },
    { label: 'Bottle', amount: 16.9, unit: 'oz' },
    { label: 'Large Bottle', amount: 33.8, unit: 'oz' }, // 1L
    { label: 'Gallon', amount: 128, unit: 'oz' },
];

export function WaterModal({ date, onClose }: WaterModalProps) {
    const { addWater, resetWater } = useWater(date);

    // State
    const [customSize, setCustomSize] = useState('');
    const [unit, setUnit] = useState<'oz' | 'ml'>('oz');
    const [isCustomInput, setIsCustomInput] = useState(false);
    const [showResetConfirm, setShowResetConfirm] = useState(false);
    const [customPresets, setCustomPresets] = useState<number[]>([]);

    // Load presets on mount
    useEffect(() => {
        const stored = localStorage.getItem('water_presets');
        if (stored) {
            try {
                setCustomPresets(JSON.parse(stored));
            } catch (e) {
                console.error("Failed to parse water_presets", e);
            }
        }
    }, []);

    const handleAddPreset = () => {
        if (!customSize) return;
        const val = parseFloat(customSize);
        if (!val) return;

        let ml = val;
        if (unit === 'oz') ml = val * 29.5735;

        // Save rounded ml as a new preset (max 3 custom presets)
        const newPresets = [...customPresets, Math.round(ml)].slice(-3);
        setCustomPresets(newPresets);
        localStorage.setItem('water_presets', JSON.stringify(newPresets));
        setCustomSize('');
        setIsCustomInput(false);
    };

    const handleAddWater = (amountMl: number) => {
        addWater(amountMl);
        onClose();
    };

    const handleManualAdd = () => {
        const val = parseFloat(customSize);
        if (!val) return;
        let ml = val;
        if (unit === 'oz') ml = val * 29.5735;
        handleAddWater(Math.round(ml));
    };

    const handleReset = async () => {
        await resetWater();
        setShowResetConfirm(false);
        onClose();
    };

    const handleQuickAdd = (amtOz: number) => {
        const ml = amtOz * 29.5735;
        addWater(Math.round(ml));
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center p-0 sm:p-4" style={{ touchAction: 'none' }}>
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />

            <div className="relative z-10 w-full modal-safe-mobile sm:max-w-sm bg-[#1A1A1A] sm:rounded-2xl p-5 space-y-6 border border-[#2A2A2A]">
                {/* Header */}
                <div className="flex justify-between items-center modal-header-safe">
                    <h2 className="text-xl font-bold text-white">Log Water</h2>
                    <button onClick={onClose} className="text-[#6B6B6B] p-1">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                {/* Quick Add Grid */}
                <div>
                    <div className="grid grid-cols-3 gap-3">
                        {BOTTLE_SIZES.map((size) => (
                            <button
                                key={size.label}
                                onClick={() => handleQuickAdd(size.amount)}
                                className="flex flex-col items-center justify-center p-3 rounded-xl bg-[#242424] hover:bg-[#2A2A2A] text-white transition-colors group"
                            >
                                <span className="text-2xl mb-1">💧</span>
                                <span className="font-medium text-xs">{size.label}</span>
                                <span className="text-[10px] text-[#3B82F6]">{size.amount}{size.unit}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Custom Presets */}
                {customPresets.length > 0 && (
                    <div>
                        <label className="text-xs text-[#6B6B6B] uppercase font-semibold tracking-wider mb-2 block">My Bottles</label>
                        <div className="grid grid-cols-3 gap-3">
                            {customPresets.map((ml, idx) => (
                                <button
                                    key={`custom-${idx}`}
                                    onClick={() => handleAddWater(ml)}
                                    className="flex flex-col items-center justify-center p-3 rounded-xl bg-blue-900/20 hover:bg-blue-900/30 border border-blue-900/50 transition-colors"
                                >
                                    <span className="text-2xl mb-1">🥤</span>
                                    <span className="font-medium text-xs text-blue-100">{Math.round(ml / 29.57)} oz</span>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Manual / Custom Input Toggle */}
                {!isCustomInput ? (
                    <button
                        onClick={() => setIsCustomInput(true)}
                        className="w-full py-3 rounded-xl border border-dashed border-[#2A2A2A] text-[#6B6B6B] hover:text-white hover:border-[#6B6B6B] transition-colors flex items-center justify-center gap-2"
                    >
                        <span>+</span>
                        <span>Add Custom Amount</span>
                    </button>
                ) : (
                    <div className="animate-fade-in bg-[#141414] p-4 rounded-xl border border-[#2A2A2A] space-y-4">
                        <div className="flex gap-2">
                            <input
                                type="number"
                                value={customSize}
                                onChange={e => setCustomSize(e.target.value)}
                                placeholder="Amount"
                                className="flex-1 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg p-3 text-white text-lg focus:outline-none focus:border-[#3B82F6]"
                                autoFocus
                            />
                            <div className="flex bg-[#1A1A1A] rounded-lg border border-[#2A2A2A] overflow-hidden">
                                {(['oz', 'ml'] as const).map(u => (
                                    <button
                                        key={u}
                                        onClick={() => setUnit(u)}
                                        className={`px-3 font-medium transition-colors ${unit === u ? 'bg-[#3B82F6] text-white' : 'text-[#6B6B6B] hover:text-white'}`}
                                    >
                                        {u}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={handleManualAdd}
                                className="flex-1 py-3 bg-[#3B82F6] rounded-lg text-white font-semibold hover:bg-[#2563EB]"
                            >
                                Log
                            </button>
                            <button
                                onClick={handleAddPreset}
                                className="px-4 py-3 bg-[#2A2A2A] rounded-lg text-[#3B82F6] font-medium hover:bg-[#333]"
                            >
                                Save Preset
                            </button>
                        </div>
                    </div>
                )}

                {/* Reset Section */}
                <div className="pt-2 border-t border-[#2A2A2A] mt-2">
                    {!showResetConfirm ? (
                        <button
                            onClick={() => setShowResetConfirm(true)}
                            className="w-full py-2 text-red-500/70 hover:text-red-400 text-xs font-medium transition-colors flex items-center justify-center gap-1"
                        >
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            Reset Today's Water
                        </button>
                    ) : (
                        <div className="space-y-2 animate-fade-in text-center p-2 bg-red-900/10 rounded-xl">
                            <p className="text-red-200 text-xs">Reset water intake to 0?</p>
                            <div className="flex gap-2 justify-center">
                                <button
                                    onClick={() => setShowResetConfirm(false)}
                                    className="px-3 py-1.5 rounded-lg bg-[#2A2A2A] text-white text-xs hover:bg-[#333]"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleReset}
                                    className="px-3 py-1.5 rounded-lg bg-red-500/20 text-red-400 border border-red-500/50 text-xs hover:bg-red-500/30"
                                >
                                    Confirm
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
