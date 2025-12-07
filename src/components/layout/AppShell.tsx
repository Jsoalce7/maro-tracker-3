import { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { useNavBarStore } from '../../stores/navBarStore';
import { shouldUseFullScreenPages } from '../../utils/platform';
import { BottomNav } from './BottomNav';

interface AppShellProps {
    children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
    const { isVisible } = useNavBarStore();
    const isMobileOrTablet = shouldUseFullScreenPages(); // iOS/Android detection

    // On mobile/tablet, respect the visibility state
    // On desktop, always show nav bar
    const shouldShowNav = !isMobileOrTablet || isVisible;

    return (
        <div className="min-h-screen bg-[#0F0F0F] flex flex-col">
            {/* Main Content */}
            <main className={`flex-1 overflow-y-auto ${shouldShowNav ? 'pb-20' : 'pb-0'}`}>
                {children}
            </main>

            {/* Bottom Navigation - Hidden on mobile/tablet when modals/pages are open */}
            <div className={`
                fixed bottom-0 left-0 right-0 
                transition-transform duration-300 ease-in-out
                ${shouldShowNav ? 'translate-y-0' : 'translate-y-full'}
            `}>
                <BottomNav />
            </div>
        </div>
    );
}
