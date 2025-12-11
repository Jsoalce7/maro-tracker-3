import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useWeightStore } from '../../stores/weightStore';

import { getTodayLocal } from '../../utils/date';

interface WeightEntryModalProps {
    onClose: () => void;
    isOpen: boolean;
    initialDate?: string;
}

export const WeightEntryModal: React.FC<WeightEntryModalProps> = ({ onClose, isOpen, initialDate }) => {
    const [date, setDate] = useState(initialDate || getTodayLocal());
    const [weight, setWeight] = useState('');
    const { addWeight, weights } = useWeightStore();

    useEffect(() => {
        if (isOpen && initialDate) {
            setDate(initialDate);
        } else if (isOpen && !initialDate) {
            setDate(getTodayLocal());
        }
    }, [isOpen, initialDate]);

    useEffect(() => {
        // If we have an entry for this date, pre-fill it
        const existingEntry = weights.find(w => w.date === date);
        if (existingEntry) {
            setWeight(existingEntry.weight_lb.toString());
        } else {
            setWeight('');
        }
    }, [date, weights]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!date || !weight) return;

        await addWeight(date, parseFloat(weight));
        onClose();
    };

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[9999]">
            <div className="bg-zinc-900 rounded-2xl p-6 w-full max-w-md border border-zinc-800 shadow-xl" onClick={(e) => e.stopPropagation()}>
                <h2 className="text-xl font-bold text-white mb-4">Add Weight</h2>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-zinc-400 mb-1">Date</label>
                        <input
                            type="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-zinc-400 mb-1">Weight (lb)</label>
                        <input
                            type="number"
                            step="0.1"
                            value={weight}
                            onChange={(e) => setWeight(e.target.value)}
                            placeholder="0.0"
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                            autoFocus
                        />
                        <p className="text-xs text-zinc-500 mt-1">
                            For best accuracy, weigh yourself in the morning before eating or drinking.
                        </p>
                    </div>

                    <div className="flex gap-3 mt-6">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2 rounded-lg bg-zinc-800 text-white font-medium hover:bg-zinc-700 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="flex-1 px-4 py-2 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-500 transition-colors"
                        >
                            Save
                        </button>
                    </div>
                </form>
            </div>
        </div>,
        document.body
    );
};
