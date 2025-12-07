import { create } from 'zustand';

interface NavBarState {
    isVisible: boolean;
    hideNavBar: () => void;
    showNavBar: () => void;
}

/**
 * Global store for bottom navigation bar visibility
 * Used to hide nav on mobile/tablet when modals or full-screen pages are open
 */
export const useNavBarStore = create<NavBarState>((set) => ({
    isVisible: true,
    hideNavBar: () => set({ isVisible: false }),
    showNavBar: () => set({ isVisible: true }),
}));
