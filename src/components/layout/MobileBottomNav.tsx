import { NavLink, useLocation } from 'react-router-dom';

interface MobileBottomNavProps {
    onFabClick: () => void;
}

const navItems = [
    {
        path: '/',
        label: 'Home',
        icon: (
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
        ),
    },
    {
        path: '/diary',
        label: 'Diary',
        icon: (
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
        ),
    },
    // Center spacing handled by logic below
    {
        path: '/medications',
        label: 'Meds',
        icon: (
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
            </svg>
        ),
    },
    {
        path: '/profile',
        label: 'Profile',
        icon: (
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
        ),
    },
];

export function MobileBottomNav({ onFabClick }: MobileBottomNavProps) {
    const location = useLocation();

    // Split items for left/right of FAB
    const leftItems = navItems.slice(0, 2);
    const rightItems = navItems.slice(2, 4);

    return (
        <nav className="fixed bottom-6 left-4 right-4 bg-[#141414] border border-[#2A2A2A] rounded-full shadow-2xl z-50 h-16 flex items-center justify-between px-6 safe-bottom">
            {/* Left Items */}
            <div className="flex gap-8">
                {leftItems.map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        className={({ isActive }) =>
                            `flex flex-col items-center justify-center transition-colors ${isActive
                                ? 'text-[#3B82F6]'
                                : 'text-[#6B6B6B] hover:text-[#A1A1A1]'
                            }`
                        }
                    >
                        {item.icon}
                    </NavLink>
                ))}
            </div>

            {/* Center FAB - Floating slightly above or inline? */}
            <div className="absolute left-1/2 -translate-x-1/2 -top-5">
                <button
                    onClick={onFabClick}
                    className="w-14 h-14 bg-[#3B82F6] rounded-full flex items-center justify-center text-white shadow-lg shadow-blue-500/30 hover:scale-105 active:scale-95 transition-transform border-[4px] border-[#050505]"
                >
                    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                </button>
            </div>

            {/* Right Items */}
            <div className="flex gap-8">
                {rightItems.map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        className={({ isActive }) =>
                            `flex flex-col items-center justify-center transition-colors ${isActive
                                ? 'text-[#3B82F6]'
                                : 'text-[#6B6B6B] hover:text-[#A1A1A1]'
                            }`
                        }
                    >
                        {item.icon}
                    </NavLink>
                ))}
            </div>
        </nav>
    );
}
