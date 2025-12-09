import { useState } from 'react';
import { Card, CardHeader } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { useProfile } from '../hooks/useProfile';
import { useAuthStore } from '../stores/authStore';
import { calculateBMI, calculateBMR, calculateTDEE } from '../lib/calculations';
import { UserProfile } from '../types';
import { SettingsMenu } from '../components/profile/SettingsMenu';
import { EditProfileModal } from '../components/profile/EditProfileModal';
import { FoodDatabaseModal } from '../components/profile/FoodDatabaseModal';

import { useNavigate } from 'react-router-dom';

export function Profile() {
    const navigate = useNavigate();
    const { profile, targets, updateProfile, isLoading } = useProfile();
    const { session, signInWithEmail, signUpWithEmail, signOut, error: authError, clearError } = useAuthStore();
    const [showEditProfile, setShowEditProfile] = useState(false);
    const [showLogin, setShowLogin] = useState(false);
    const [isSignUp, setIsSignUp] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [authLoading, setAuthLoading] = useState(false);

    // Loading state
    if (isLoading) {
        return (
            <div className="min-h-screen bg-[#0F0F0F] flex items-center justify-center text-white">
                <div className="flex flex-col items-center gap-3">
                    <div className="w-8 h-8 border-2 border-[#3B82F6] border-t-transparent rounded-full animate-spin"></div>
                    <p>Loading profile...</p>
                </div>
            </div>
        );
    }

    // No profile - show setup screen
    if (!profile) {
        return (
            <div className="min-h-screen bg-[#0F0F0F] p-4 pb-24">
                <header className="py-2 mb-6">
                    <h1 className="text-2xl font-bold text-white">Profile</h1>
                    <p className="text-[#6B6B6B] text-sm">Set up your profile to get started</p>
                </header>

                <Card>
                    <div className="text-center py-8">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-16 h-16 text-[#3B82F6] mx-auto mb-4">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                        </svg>
                        <h2 className="text-xl font-semibold text-white mb-2">Welcome to Maro Tracker!</h2>
                        <p className="text-[#6B6B6B] mb-6">Set up your profile to calculate your personalized nutrition targets.</p>
                        <Button onClick={() => setShowEditProfile(true)}>
                            Create Profile
                        </Button>
                    </div>
                </Card>

                {showEditProfile && (
                    <EditProfileModal
                        profile={{
                            id: '',
                            height_cm: 170,
                            weight_kg: 70,
                            age: 30,
                            sex: 'male',
                            activity_level: 'moderate',
                            goal_weight_kg: 70,
                            goal_type: 'maintain',
                        }}
                        targets={null}
                        onClose={() => setShowEditProfile(false)}
                        onSave={(updated) => {
                            // Remove empty id before saving - let useProfile use the userId
                            const { id, ...profileData } = updated;
                            updateProfile(profileData);
                            setShowEditProfile(false);
                        }}
                    />
                )}
            </div>
        );
    }

    // Default calculations if no targets yet
    const currentTargets = targets || {
        calories_per_day: 2000,
        protein_g: 150,
        carbs_g: 200,
        fat_g: 70,
        bmr: 0,
        tdee: 0
    };

    const bmi = calculateBMI(profile.weight_kg, profile.height_cm);
    const bmr = calculateBMR(profile);
    const tdee = calculateTDEE(bmr, profile.activity_level);

    const getBmiCategory = (bmi: number) => {
        if (bmi < 18.5) return { label: 'Underweight', color: 'text-[#F59E0B]' };
        if (bmi < 25) return { label: 'Normal', color: 'text-[#10B981]' };
        if (bmi < 30) return { label: 'Overweight', color: 'text-[#F59E0B]' };
        return { label: 'Obese', color: 'text-[#EF4444]' };
    };

    const bmiCategory = getBmiCategory(bmi);

    const handleSaveProfile = (updated: UserProfile) => {
        updateProfile(updated);
    };

    return (
        <div className="min-h-screen bg-[#0F0F0F] p-4 space-y-4 pb-24">
            {/* Header */}
            <header className="py-2 flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white">Profile</h1>
                    <p className="text-[#6B6B6B] text-sm">Your personal settings</p>
                </div>
                <SettingsMenu
                    onEditProfile={() => setShowEditProfile(true)}
                    onManageFood={() => navigate('/add-food?mode=manage')}
                />
            </header>

            {/* Personal Info Card (Read Only) */}
            <Card>
                <CardHeader title="Personal Info" />
                <div className="grid grid-cols-2 gap-4 mt-2">
                    <div>
                        <label className="text-xs text-[#6B6B6B]">Height</label>
                        <p className="text-white font-medium">{profile.height_cm} cm</p>
                    </div>
                    <div>
                        <label className="text-xs text-[#6B6B6B]">Weight</label>
                        <p className="text-white font-medium">{profile.weight_kg} kg</p>
                    </div>
                    <div>
                        <label className="text-xs text-[#6B6B6B]">Age</label>
                        <p className="text-white font-medium">{profile.age} years</p>
                    </div>
                    <div>
                        <label className="text-xs text-[#6B6B6B]">Sex</label>
                        <p className="text-white font-medium capitalize">{profile.sex}</p>
                    </div>
                </div>
            </Card>

            {/* Calculated Stats (Read Only) */}
            <Card>
                <CardHeader title="Your Stats" subtitle="Auto-calculated" />
                <div className="grid grid-cols-2 gap-4 mt-2">
                    {/* BMI */}
                    <div className="bg-[#141414] rounded-xl p-4">
                        <p className="text-xs text-[#6B6B6B]">BMI</p>
                        <p className="text-2xl font-bold text-white">{bmi.toFixed(1)}</p>
                        <p className={`text-xs ${bmiCategory.color}`}>{bmiCategory.label}</p>
                    </div>

                    {/* BMR */}
                    <div className="bg-[#141414] rounded-xl p-4">
                        <p className="text-xs text-[#6B6B6B]">BMR</p>
                        <p className="text-2xl font-bold text-white">{Math.round(bmr)}</p>
                        <p className="text-xs text-[#6B6B6B]">kcal/day</p>
                    </div>

                    {/* TDEE */}
                    <div className="bg-[#141414] rounded-xl p-4">
                        <p className="text-xs text-[#6B6B6B]">TDEE</p>
                        <p className="text-2xl font-bold text-white">{Math.round(tdee)}</p>
                        <p className="text-xs text-[#6B6B6B]">kcal/day</p>
                    </div>

                    {/* Daily Target */}
                    <div className="bg-[#141414] rounded-xl p-4">
                        <p className="text-xs text-[#6B6B6B]">Daily Target</p>
                        <p className="text-2xl font-bold text-[#3B82F6]">{currentTargets.calories_per_day}</p>
                        <p className="text-xs text-[#6B6B6B]">kcal/day</p>
                    </div>
                </div>
            </Card>

            {/* Macro Targets (Read Only) */}
            <Card>
                <CardHeader title="Daily Macro Targets" />
                <div className="grid grid-cols-3 gap-4 mt-2">
                    <div className="bg-[#141414] rounded-xl p-4 text-center">
                        <div className="w-3 h-3 rounded-full bg-[#EF4444] mx-auto mb-2" />
                        <p className="text-2xl font-bold text-white">{currentTargets.protein_g}g</p>
                        <p className="text-xs text-[#6B6B6B]">Protein</p>
                    </div>
                    <div className="bg-[#141414] rounded-xl p-4 text-center">
                        <div className="w-3 h-3 rounded-full bg-[#10B981] mx-auto mb-2" />
                        <p className="text-2xl font-bold text-white">{currentTargets.carbs_g}g</p>
                        <p className="text-xs text-[#6B6B6B]">Carbs</p>
                    </div>
                    <div className="bg-[#141414] rounded-xl p-4 text-center">
                        <div className="w-3 h-3 rounded-full bg-[#F59E0B] mx-auto mb-2" />
                        <p className="text-2xl font-bold text-white">{currentTargets.fat_g}g</p>
                        <p className="text-xs text-[#6B6B6B]">Fat</p>
                    </div>
                </div>
            </Card>

            {/* Account Card */}
            <Card>
                <CardHeader title="Account" subtitle="Sync data across devices" />
                <div className="mt-2">
                    {session?.user?.email ? (
                        // Logged in with email
                        <div className="space-y-3">
                            <div className="bg-[#141414] rounded-xl p-4">
                                <p className="text-xs text-[#6B6B6B]">Logged in as</p>
                                <p className="text-white font-medium">{session.user.email}</p>
                                <p className="text-xs text-[#10B981] mt-1">✓ Data syncs across all devices</p>
                            </div>
                            <Button variant="secondary" className="w-full" onClick={signOut}>
                                Sign Out
                            </Button>
                        </div>
                    ) : (
                        // Anonymous or not logged in
                        <div className="space-y-3">
                            <div className="bg-[#141414] rounded-xl p-4">
                                <p className="text-xs text-[#6B6B6B]">Current Mode</p>
                                <p className="text-white font-medium">Guest (Anonymous)</p>
                                <p className="text-xs text-[#F59E0B] mt-1">⚠ Data only saved on this device</p>
                            </div>

                            {!showLogin ? (
                                <Button className="w-full" onClick={() => { setShowLogin(true); clearError(); }}>
                                    Sign In / Sign Up
                                </Button>
                            ) : (
                                <div className="space-y-3 bg-[#141414] rounded-xl p-4">
                                    <div className="flex gap-2 mb-4">
                                        <button
                                            onClick={() => setIsSignUp(false)}
                                            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${!isSignUp ? 'bg-[#3B82F6] text-white' : 'bg-[#242424] text-[#6B6B6B]'}`}
                                        >
                                            Sign In
                                        </button>
                                        <button
                                            onClick={() => setIsSignUp(true)}
                                            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${isSignUp ? 'bg-[#3B82F6] text-white' : 'bg-[#242424] text-[#6B6B6B]'}`}
                                        >
                                            Sign Up
                                        </button>
                                    </div>

                                    <input
                                        type="email"
                                        placeholder="Email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="w-full bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg p-3 text-white placeholder-[#6B6B6B] focus:outline-none focus:border-[#3B82F6]"
                                    />
                                    <input
                                        type="password"
                                        placeholder="Password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="w-full bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg p-3 text-white placeholder-[#6B6B6B] focus:outline-none focus:border-[#3B82F6]"
                                    />

                                    {authError && (
                                        <p className="text-[#EF4444] text-sm">{authError}</p>
                                    )}

                                    <div className="flex gap-2">
                                        <Button
                                            variant="secondary"
                                            className="flex-1"
                                            onClick={() => { setShowLogin(false); clearError(); setEmail(''); setPassword(''); }}
                                        >
                                            Cancel
                                        </Button>
                                        <Button
                                            className="flex-1"
                                            disabled={authLoading || !email || !password}
                                            onClick={async () => {
                                                setAuthLoading(true);
                                                if (isSignUp) {
                                                    await signUpWithEmail(email, password);
                                                } else {
                                                    await signInWithEmail(email, password);
                                                }
                                                setAuthLoading(false);
                                            }}
                                        >
                                            {authLoading ? '...' : (isSignUp ? 'Sign Up' : 'Sign In')}
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </Card>

            {showEditProfile && (
                <EditProfileModal
                    profile={profile}
                    targets={targets || null}
                    onClose={() => setShowEditProfile(false)}
                    onSave={handleSaveProfile}
                />
            )}

            {showEditProfile && (
                <EditProfileModal
                    profile={profile}
                    targets={targets || null}
                    onClose={() => setShowEditProfile(false)}
                    onSave={handleSaveProfile}
                />
            )}

            {/* FoodDatabaseModal removed. Replaced by navigation in SettingsMenu or direct link */}
        </div>
    );
}
