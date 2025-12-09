import { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { useNavBarStore } from '../../stores/navBarStore';
import { shouldUseFullScreenPages } from '../../utils/platform';
import { BottomNav } from './BottomNav';

interface AppShellProps {
    children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
    // AppShell is now ONLY used for the Main Layout (Home, Diary, Profile).
    // The "Add Food" / "Create" pages use a separate layout without AppShell.
    // Therefore, BottomNav is always visible here.

    return (
        <div className="min-h-screen bg-[#050505] flex flex-col">
            {/* Main Content */}
            <main className="flex-1 overflow-y-auto pb-20">
                {children}
            </main>

            {/* Bottom Navigation */}
            <div className="fixed bottom-0 left-0 right-0 z-50">
                <BottomNav />
            </div>
        </div>
    );
}
