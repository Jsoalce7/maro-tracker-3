import { ReactNode } from 'react';
import { NavigationController } from './NavigationController';

interface AppShellProps {
    children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
    return (
        <NavigationController>
            {children}
        </NavigationController>
    );
}
