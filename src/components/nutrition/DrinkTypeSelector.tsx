import { useState } from 'react';

const DRINK_TYPES = [
    'Water', 'Coffee', 'Tea', 'Soda', 'Juice', 'Smoothie', 'Protein Shake', 'Energy Drink', 'Alcohol', 'Other'
];

interface DrinkTypeSelectorProps {
    value?: string;
    onChange: (type: string) => void;
}

export function DrinkTypeSelector({ value, onChange }: DrinkTypeSelectorProps) {
    return (
        <div className="space-y-2">
            <label className="text-xs text-[#6B6B6B] uppercase font-bold px-1">Drink Type</label>
            <div className="flex flex-wrap gap-2">
                {DRINK_TYPES.map(type => (
                    <button
                        key={type}
                        onClick={() => onChange(type)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors border ${value === type
                                ? 'bg-[#3B82F6] text-white border-[#3B82F6]'
                                : 'bg-[#1A1A1A] text-[#8E8E93] border-transparent hover:border-[#333]'
                            }`}
                    >
                        {type}
                    </button>
                ))}
            </div>
        </div>
    );
}
