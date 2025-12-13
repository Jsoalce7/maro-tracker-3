import { useState, useEffect } from 'react';

type Breakpoint = 'mobile' | 'tablet' | 'desktop';

interface Breakpoints {
    isMobile: boolean;
    isTablet: boolean;
    isDesktop: boolean;
    active: Breakpoint;
}

export function useBreakpoints(): Breakpoints {
    const [breakpoints, setBreakpoints] = useState<Breakpoints>({
        isMobile: false,
        isTablet: false,
        isDesktop: true, // Default to desktop for SSR/Initial render safety
        active: 'desktop',
    });

    useEffect(() => {
        const handleResize = () => {
            const width = window.innerWidth;
            const isMobile = width < 768;
            const isTablet = width >= 768 && width <= 1024;
            const isDesktop = width > 1024;

            let active: Breakpoint = 'desktop';
            if (isMobile) active = 'mobile';
            if (isTablet) active = 'tablet';

            setBreakpoints({
                isMobile,
                isTablet,
                isDesktop,
                active,
            });
        };

        // Initial check
        handleResize();

        // Listen for resize
        window.addEventListener('resize', handleResize);

        // Cleanup
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    return breakpoints;
}
