import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface SessionHeaderProps {
    title: string;
    subtitle: string;
    startedAt?: string;
    onEndSession: () => void;
}

export function SessionHeader({ title, subtitle, startedAt, onEndSession }: SessionHeaderProps) {
    const navigate = useNavigate();
    const [elapsed, setElapsed] = useState("00:00");

    useEffect(() => {
        if (!startedAt) return;

        const start = new Date(startedAt).getTime();

        const interval = setInterval(() => {
            const now = new Date().getTime();
            const diff = now - start;

            const hours = Math.floor(diff / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((diff % (1000 * 60)) / 1000);

            const str = hours > 0
                ? `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
                : `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

            setElapsed(str);
        }, 1000);

        return () => clearInterval(interval);
    }, [startedAt]);

    return (
        <header className="px-4 py-3 flex items-center justify-between bg-[#050505] sticky top-0 z-50 border-b border-[#262626]">
            <div className="flex items-center gap-3">
                <button
                    onClick={() => navigate(-1)}
                    className="p-2 -ml-2 text-[#8E8E93] hover:text-white"
                >
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                </button>
                <div>
                    <h1 className="text-white font-bold text-lg leading-tight">{title}</h1>
                    <p className="text-[#8E8E93] text-xs">{subtitle} • {elapsed}</p>
                </div>
            </div>

            <button
                onClick={onEndSession}
                className="text-xs font-bold text-red-500 bg-red-500/10 px-3 py-1.5 rounded-lg hover:bg-red-500/20 transition-colors"
            >
                End
            </button>
        </header>
    );
}
