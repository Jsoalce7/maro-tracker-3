import { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useBreakpoints } from '../../hooks/useBreakpoints';

// Navigation Items with Icons
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

export function Sidebar({ onManageWorkouts }: { onManageWorkouts: () => void }) {
    const { isTablet } = useBreakpoints();
    const location = useLocation();

    // Icons Only Sidebar - No Collapse/Expand Toggle preferred by User request for "Icons Only"
    // "Remove header/logo/text... The sidebar should display icons only."
    // We will fix the width to be narrow.

    const items = [
        {
            path: '/',
            label: 'Home',
            icon: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
        },
        {
            path: '/diary',
            label: 'Diary',
            icon: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
        },
        {
            path: '/add-food',
            label: 'Food',
            icon: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
        },
        {
            path: '/add-food?mode=manage',
            label: 'Database',
            icon: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" /></svg>
        },
        {
            path: '/medications',
            label: 'Meds',
            icon: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
        },
        {
            // WORKOUTS - Button Action
            label: 'Workouts',
            action: onManageWorkouts,
            icon: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        },
        {
            path: '/profile',
            label: 'Profile',
            icon: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
        }
    ];

    return (
        <aside
            className={`sticky top-0 h-screen bg-[#141414] border-r border-[#2A2A2A] z-50 flex flex-col w-20 justify-center items-center py-6 transition-all`}
        >
            <nav className="flex flex-col gap-4 w-full items-center">
                {items.map((item, idx) => {
                    const isActive = item.path ? location.pathname === item.path || location.pathname + location.search === item.path : false;
                    // Loose matching for add-food helpers if needed, but specific paths provided.

                    if (item.action) {
                        return (
                            <button
                                key={idx}
                                onClick={item.action}
                                className="p-3 text-[#8E8E93] hover:text-white hover:bg-[#2A2A2A] rounded-xl transition-all group relative"
                                title={item.label}
                            >
                                {item.icon}
                                {/* Tooltip */}
                                <div className="absolute left-full ml-3 px-2 py-1 bg-[#2A2A2A] text-white text-xs font-bold rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-[60] transition-opacity">
                                    {item.label}
                                </div>
                            </button>
                        );
                    }

                    return (
                        <NavLink
                            key={idx}
                            to={item.path!}
                            className={({ isActive: linkActive }) => `
                                p-3 rounded-xl transition-all group relative flex items-center justify-center
                                ${linkActive ? 'bg-[#0A84FF]/10 text-[#0A84FF]' : 'text-[#8E8E93] hover:text-white hover:bg-[#2A2A2A]'}
                            `}
                            title={item.label}
                        >
                            {/* Active Dot */}
                            {isActive && (
                                <div className="absolute left-1 w-1 h-1 bg-[#0A84FF] rounded-full" />
                            )}

                            {item.icon}

                            {/* Tooltip */}
                            <div className="absolute left-full ml-3 px-2 py-1 bg-[#2A2A2A] text-white text-xs font-bold rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-[60] transition-opacity">
                                {item.label}
                            </div>
                        </NavLink>
                    );
                })}
            </nav>
        </aside>
    );
}
