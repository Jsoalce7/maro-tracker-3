import { useState, useEffect } from 'react';
import { Button } from '../ui/Button';
import { UserProfile } from '../../types';

interface EditProfileModalProps {
    profile: UserProfile;
    targets: {
        calories_per_day: number;
        protein_g: number;
        carbs_g: number;
        fat_g: number;
    } | null;
    onClose: () => void;
    onSave: (profile: UserProfile) => void;
}

const activityLabels = {
    sedentary: 'Sedentary (Office job)',
    light: 'Lightly Active (1-3 days)',
    moderate: 'Moderately Active (3-5 days)',
    active: 'Active (6-7 days)',
    very_active: 'Very Active (Physical job)',
};

const goalLabels = {
    lose: 'Lose Weight',
    maintain: 'Maintain Weight',
    gain: 'Gain Weight',
};

export function EditProfileModal({ profile, targets, onClose, onSave }: EditProfileModalProps) {
    const [editProfile, setEditProfile] = useState<UserProfile>(profile);
    const [activeSection, setActiveSection] = useState<'basics' | 'activity' | 'advanced'>('basics');

    // Default fallbacks
    const currentTargets = targets || {
        calories_per_day: 2000,
        protein_g: 150,
        carbs_g: 200,
        fat_g: 70
    };

    const handleSave = () => {
        onSave(editProfile);
        onClose();
    };

    // Lock body scroll when modal is open
    useEffect(() => {
        document.body.classList.add('modal-open');
        return () => {
            document.body.classList.remove('modal-open');
        };
    }, []);

    return (
        <>
            {/* Backdrop */}
            <div
                className="modal-overlay"
                onClick={onClose}
                aria-hidden="true"
            />

            {/* Modal Container */}
            <div className="modal-container" onClick={(e) => e.target === e.currentTarget && onClose()}>
                {/* Modal Content */}
                <div
                    className="modal-content animate-slide-up shadow-2xl ring-1 ring-white/10"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header - Fixed */}
                    <div className="shrink-0 flex items-center justify-between p-4 border-b border-[#2A2A2A]">
                        <h2 className="text-lg font-semibold text-white">Edit Profile</h2>
                        <Button variant="secondary" size="sm" onClick={onClose}>
                            Cancel
                        </Button>
                    </div>

                    {/* Tabs - Fixed */}
                    <div className="shrink-0 flex border-b border-[#2A2A2A] p-1 gap-1">
                        {[
                            { id: 'basics', label: 'Basics' },
                            { id: 'activity', label: 'Activity & Goals' },
                            { id: 'advanced', label: 'Advanced' },
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveSection(tab.id as any)}
                                className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${activeSection === tab.id
                                    ? 'bg-[#3B82F6]/20 text-[#3B82F6]'
                                    : 'text-[#6B6B6B] hover:text-white'
                                    }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    {/* Scrollable Content Area */}
                    <div className="modal-scroll space-y-6">
                        {activeSection === 'basics' && (
                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-xs text-[#6B6B6B] mb-1 block">Height (cm)</label>
                                        <input
                                            type="number"
                                            value={editProfile.height_cm}
                                            onChange={(e) => setEditProfile({ ...editProfile, height_cm: Number(e.target.value) })}
                                            className="w-full bg-[#141414] border border-[#2A2A2A] rounded-xl p-3 text-white focus:outline-none focus:border-[#3B82F6]"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs text-[#6B6B6B] mb-1 block">Weight (kg)</label>
                                        <input
                                            type="number"
                                            value={editProfile.weight_kg}
                                            onChange={(e) => setEditProfile({ ...editProfile, weight_kg: Number(e.target.value) })}
                                            className="w-full bg-[#141414] border border-[#2A2A2A] rounded-xl p-3 text-white focus:outline-none focus:border-[#3B82F6]"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs text-[#6B6B6B] mb-1 block">Age</label>
                                        <input
                                            type="number"
                                            value={editProfile.age}
                                            onChange={(e) => setEditProfile({ ...editProfile, age: Number(e.target.value) })}
                                            className="w-full bg-[#141414] border border-[#2A2A2A] rounded-xl p-3 text-white focus:outline-none focus:border-[#3B82F6]"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs text-[#6B6B6B] mb-1 block">Sex</label>
                                        <select
                                            value={editProfile.sex}
                                            onChange={(e) => setEditProfile({ ...editProfile, sex: e.target.value as 'male' | 'female' })}
                                            className="w-full bg-[#141414] border border-[#2A2A2A] rounded-xl p-3 text-white focus:outline-none focus:border-[#3B82F6]"
                                        >
                                            <option value="male">Male</option>
                                            <option value="female">Female</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeSection === 'activity' && (
                            <div className="space-y-6">
                                <div>
                                    <label className="text-xs text-[#6B6B6B] mb-2 block">Activity Level</label>
                                    <div className="space-y-2">
                                        {(Object.keys(activityLabels) as Array<keyof typeof activityLabels>).map((level) => (
                                            <button
                                                key={level}
                                                onClick={() => setEditProfile({ ...editProfile, activity_level: level })}
                                                className={`w-full p-3 rounded-xl text-left transition-colors ${editProfile.activity_level === level
                                                    ? 'bg-[#3B82F6]/20 border border-[#3B82F6] text-white'
                                                    : 'bg-[#141414] text-[#6B6B6B] border border-transparent'
                                                    }`}
                                            >
                                                {activityLabels[level]}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs text-[#6B6B6B] mb-2 block">Goal</label>
                                    <div className="grid grid-cols-3 gap-2">
                                        {(Object.keys(goalLabels) as Array<keyof typeof goalLabels>).map((goal) => (
                                            <button
                                                key={goal}
                                                onClick={() => setEditProfile({ ...editProfile, goal_type: goal })}
                                                className={`p-3 rounded-xl text-center transition-colors ${editProfile.goal_type === goal
                                                    ? 'bg-[#3B82F6]/20 border border-[#3B82F6] text-white'
                                                    : 'bg-[#141414] text-[#6B6B6B] border border-transparent'
                                                    }`}
                                            >
                                                <span className="text-sm">{goalLabels[goal]}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs text-[#6B6B6B] mb-1 block">Goal Weight (kg)</label>
                                    <input
                                        type="number"
                                        value={editProfile.goal_weight_kg}
                                        onChange={(e) => setEditProfile({ ...editProfile, goal_weight_kg: Number(e.target.value) })}
                                        className="w-full bg-[#141414] border border-[#2A2A2A] rounded-xl p-3 text-white focus:outline-none focus:border-[#3B82F6]"
                                    />
                                </div>
                            </div>
                        )}

                        {activeSection === 'advanced' && (
                            <div className="space-y-4">
                                <div className="bg-[#141414] p-4 rounded-xl border border-[#2A2A2A]">
                                    <div className="flex items-center justify-between mb-4">
                                        <span className="text-white font-medium">Use Custom Targets</span>
                                        <button
                                            onClick={() => setEditProfile({ ...editProfile, use_custom_targets: !editProfile.use_custom_targets })}
                                            className={`w-12 h-6 rounded-full p-1 transition-colors ${editProfile.use_custom_targets ? 'bg-[#3B82F6]' : 'bg-[#2A2A2A]'}`}
                                        >
                                            <div className={`w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${editProfile.use_custom_targets ? 'translate-x-6' : 'translate-x-0'}`} />
                                        </button>
                                    </div>
                                    <p className="text-xs text-[#6B6B6B] mb-4">
                                        Override the automatic calorie and macro calculations with your own values.
                                    </p>

                                    {editProfile.use_custom_targets && (
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="text-xs text-[#6B6B6B] mb-1 block">Calories</label>
                                                <input
                                                    type="number"
                                                    value={editProfile.custom_calories ?? currentTargets.calories_per_day}
                                                    onChange={(e) => setEditProfile({ ...editProfile, custom_calories: Number(e.target.value) })}
                                                    className="w-full bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg py-2 px-3 text-white focus:outline-none focus:border-[#3B82F6]"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-xs text-[#EF4444] mb-1 block">Protein (g)</label>
                                                <input
                                                    type="number"
                                                    value={editProfile.custom_protein ?? currentTargets.protein_g}
                                                    onChange={(e) => setEditProfile({ ...editProfile, custom_protein: Number(e.target.value) })}
                                                    className="w-full bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg py-2 px-3 text-white focus:outline-none focus:border-[#3B82F6]"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-xs text-[#10B981] mb-1 block">Carbs (g)</label>
                                                <input
                                                    type="number"
                                                    value={editProfile.custom_carbs ?? currentTargets.carbs_g}
                                                    onChange={(e) => setEditProfile({ ...editProfile, custom_carbs: Number(e.target.value) })}
                                                    className="w-full bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg py-2 px-3 text-white focus:outline-none focus:border-[#3B82F6]"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-xs text-[#F59E0B] mb-1 block">Fat (g)</label>
                                                <input
                                                    type="number"
                                                    value={editProfile.custom_fat ?? currentTargets.fat_g}
                                                    onChange={(e) => setEditProfile({ ...editProfile, custom_fat: Number(e.target.value) })}
                                                    className="w-full bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg py-2 px-3 text-white focus:outline-none focus:border-[#3B82F6]"
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Footer - Fixed at bottom */}
                    <div className="modal-footer">
                        <Button className="w-full" onClick={handleSave}>
                            Save Changes
                        </Button>
                    </div>
                </div>
            </div>
        </>
    );
}
