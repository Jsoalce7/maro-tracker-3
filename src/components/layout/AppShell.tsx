import { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { useNavBarStore } from '../../stores/navBarStore';
import { shouldUseFullScreenPages } from '../../utils/platform';
import { BottomNav } from './BottomNav';

interface AppShellProps {
    children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
    const location = useLocation();
    const { isVisible } = useNavBarStore();
    const isMobileOrTablet = shouldUseFullScreenPages(); // iOS/Android detection

    // Routes where bottom nav should ALWAYS be hidden
    const HIDDEN_ROUTES = [
        '/food-database',
        '/add-food',
        '/create-food',
        '/create-recipe'
    ];
    const isHiddenRoute = HIDDEN_ROUTES.some(route => location.pathname.startsWith(route));

    // Consistently hide bottom nav if explicitly hidden (by modal) OR if on a hidden route
    // This applies to ALL devices (Mobile, Tablet, Desktop)
    const shouldShowNav = !isHiddenRoute && isVisible;

    return (
        <div className="min-h-screen bg-[#050505] flex flex-col">
            {/* Main Content */}
            <main className={`flex-1 overflow-y-auto ${shouldShowNav ? 'pb-20' : 'pb-0'}`}>
                {children}
            </main>

            {/* Bottom Navigation - Hidden on mobile/tablet when modals/pages are open */}
            <div className={`
                fixed bottom-0 left-0 right-0 z-50
                transition-transform duration-300 ease-in-out
                ${shouldShowNav ? 'translate-y-0' : 'translate-y-full'}
            `}>
                <BottomNav />
            </div>
        </div>
    );
}
