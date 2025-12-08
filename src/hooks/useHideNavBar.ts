import { useEffect } from 'react';
import { useNavBarStore } from '../stores/navBarStore';

/**
 * Hook to automatically hide bottom navigation bar on mount and restore it on unmount.
 * Use this in full-screen modals or pages that require immersive focus.
 */
export function useHideNavBar() {
    const { hideNavBar, showNavBar } = useNavBarStore();

    useEffect(() => {
        // Hide on mount
        hideNavBar();

        // Show on unmount
        return () => {
            showNavBar();
        };
    }, [hideNavBar, showNavBar]);
}
