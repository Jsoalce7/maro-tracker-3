import { ReactNode } from 'react';
import { BottomNav } from './BottomNav';

interface AppShellProps {
    children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
    return (
        <div className="min-h-screen bg-[#0F0F0F] flex flex-col">
            {/* Main Content */}
            <main className="flex-1 overflow-y-auto pb-20">
                {children}
            </main>

            {/* Bottom Navigation */}
            <BottomNav />
        </div>
    );
}
