import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';

export function Login() {
    const { session, signInWithEmail, signUpWithEmail, error: authError, clearError } = useAuthStore();
    const navigate = useNavigate();
    const [isSignUp, setIsSignUp] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (session && !session.user.is_anonymous) {
            navigate('/');
        }
    }, [session, navigate]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        if (isSignUp) {
            await signUpWithEmail(email, password);
        } else {
            await signInWithEmail(email, password);
        }
        setLoading(false);
    };

    return (
        <div className="min-h-screen bg-[#0F0F0F] flex flex-col justify-center p-4">
            <div className="w-full max-w-md mx-auto space-y-8">
                <div className="text-center">
                    <h1 className="text-4xl font-bold text-white mb-2">Maro Tracker</h1>
                    <p className="text-[#6B6B6B]">Sign in to sync your data across devices</p>
                </div>

                <Card>
                    <div className="p-4">
                        <div className="flex gap-2 mb-6">
                            <button
                                onClick={() => { setIsSignUp(false); clearError(); }}
                                className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors ${!isSignUp ? 'bg-[#3B82F6] text-white' : 'bg-[#242424] text-[#6B6B6B]'}`}
                            >
                                Sign In
                            </button>
                            <button
                                onClick={() => { setIsSignUp(true); clearError(); }}
                                className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors ${isSignUp ? 'bg-[#3B82F6] text-white' : 'bg-[#242424] text-[#6B6B6B]'}`}
                            >
                                Sign Up
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-xs text-[#6B6B6B] mb-1.5 uppercase tracking-wide">Email</label>
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg p-3.5 text-white placeholder-[#6B6B6B] focus:outline-none focus:border-[#3B82F6] transition-colors"
                                    placeholder="Enter your email"
                                />
                            </div>

                            <div>
                                <label className="block text-xs text-[#6B6B6B] mb-1.5 uppercase tracking-wide">Password</label>
                                <input
                                    type="password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg p-3.5 text-white placeholder-[#6B6B6B] focus:outline-none focus:border-[#3B82F6] transition-colors"
                                    placeholder="Enter password"
                                />
                            </div>

                            {authError && (
                                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                                    <p className="text-red-400 text-sm text-center">{authError}</p>
                                </div>
                            )}

                            <Button
                                type="submit"
                                className="w-full py-3.5 text-base"
                                disabled={loading}
                            >
                                {loading ? (
                                    <div className="flex items-center justify-center gap-2">
                                        <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                        <span>Please wait...</span>
                                    </div>
                                ) : (
                                    isSignUp ? 'Create Account' : 'Sign In'
                                )}
                            </Button>
                        </form>
                    </div>
                </Card>
            </div>
        </div>
    );
}
