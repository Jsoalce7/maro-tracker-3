import { NavLink } from 'react-router-dom';

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

export function BottomNav() {
    return (
        <nav className="fixed bottom-0 left-0 right-0 bg-[#141414] border-t border-[#2A2A2A] px-6 py-2 z-50">
            <div className="max-w-lg mx-auto flex items-center justify-around">
                {navItems.map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        className={({ isActive }) =>
                            `flex flex-col items-center gap-1 py-2 px-4 rounded-xl transition-colors ${isActive
                                ? 'text-[#3B82F6]'
                                : 'text-[#6B6B6B] hover:text-[#A1A1A1]'
                            }`
                        }
                    >
                        {item.icon}
                        <span className="text-xs font-medium">{item.label}</span>
                    </NavLink>
                ))}
            </div>
        </nav>
    );
}
