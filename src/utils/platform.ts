/**
 * Platform detection utilities
 * Used to determine iOS vs Android/Desktop for conditional UI rendering
 */

export const isIOS = (): boolean => {
    if (typeof window === 'undefined') return false;

    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIOSDevice = /iphone|ipad|ipod/.test(userAgent);

    // iPad Pro with desktop mode detection
    const isIPadOS = userAgent.includes('macintosh') && 'ontouchend' in document;

    return isIOSDevice || isIPadOS;
};

export const isIOSPWA = (): boolean => {
    if (typeof window === 'undefined') return false;
    return isIOS() && (window.navigator as any).standalone === true;
};

export const shouldUseFullScreenPages = (): boolean => {
    // Use full-screen pages on ALL iOS (PWA and Safari)
    // Android and Desktop will continue using modals
    return isIOS();
};
