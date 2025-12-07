import { useState, useEffect, useRef } from 'react';
import { useZxing } from 'react-zxing';

interface BarcodeScannerProps {
    onDetected: (barcode: string) => void;
    onClose: () => void;
}

export const BarcodeScanner = ({ onDetected, onClose }: BarcodeScannerProps) => {
    const [error, setError] = useState<string | null>(null);
    const [permissionState, setPermissionState] = useState<'pending' | 'granted' | 'denied' | 'unavailable'>('pending');
    const [isHttps, setIsHttps] = useState(true);

    // Check HTTPS requirement
    useEffect(() => {
        const isSecure = window.location.protocol === 'https:' || window.location.hostname === 'localhost';
        setIsHttps(isSecure);
        if (!isSecure) {
            setError('Camera requires HTTPS. Please access via https:// or localhost.');
            setPermissionState('unavailable');
        }
    }, []);

    // Request camera permission explicitly on mount
    useEffect(() => {
        if (!isHttps) return;

        const requestPermission = async () => {
            try {
                console.log('[BarcodeScanner] Requesting camera permission...');

                // Check if mediaDevices is available
                if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                    console.error('[BarcodeScanner] getUserMedia not supported');
                    setError('Camera not supported on this browser');
                    setPermissionState('unavailable');
                    return;
                }

                // Request permission with mobile-optimized constraints
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: {
                        facingMode: { ideal: 'environment' }, // Prefer rear camera
                        width: { ideal: 1280 },
                        height: { ideal: 720 },
                    }
                });

                console.log('[BarcodeScanner] Camera permission granted');
                setPermissionState('granted');

                // Stop the test stream - useZxing will create its own
                stream.getTracks().forEach(track => track.stop());

            } catch (err) {
                console.error('[BarcodeScanner] Permission error:', err);
                const error = err as Error;

                if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
                    setError('Camera permission denied. Please allow camera access in your browser settings.');
                    setPermissionState('denied');
                } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
                    setError('No camera found on this device.');
                    setPermissionState('unavailable');
                } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
                    setError('Camera is in use by another application.');
                    setPermissionState('unavailable');
                } else if (error.name === 'OverconstrainedError') {
                    setError('Camera does not meet requirements.');
                    setPermissionState('unavailable');
                } else if (error.name === 'SecurityError') {
                    setError('Camera blocked due to insecure connection (requires HTTPS).');
                    setPermissionState('unavailable');
                } else {
                    setError(`Camera error: ${error.message || 'Unknown error'}`);
                    setPermissionState('unavailable');
                }
            }
        };

        requestPermission();
    }, [isHttps]);

    const { ref } = useZxing({
        onDecodeResult(result) {
            console.log('[BarcodeScanner] Barcode detected:', result.getText());
            onDetected(result.getText());
        },
        onError(err: unknown) {
            const error = err as Error;
            // Only log non-routine scanning errors
            if (error?.message && !error.message.includes('No MultiFormat Readers')) {
                console.warn('[BarcodeScanner] Scan error:', error.message);
            }
        },
        constraints: {
            video: {
                facingMode: { ideal: 'environment' },
                width: { ideal: 1280, min: 640 },
                height: { ideal: 720, min: 480 },
            }
        },
        paused: permissionState !== 'granted',
    });

    // Show error state
    if (error || permissionState === 'denied' || permissionState === 'unavailable') {
        return (
            <div className="w-full h-full min-h-[60vh] bg-black rounded-xl flex flex-col items-center justify-center p-6">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-16 h-16 text-red-500 mb-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
                <p className="text-red-400 text-center text-lg font-medium mb-2">Camera Access Failed</p>
                <p className="text-gray-400 text-center text-sm mb-6 max-w-xs">{error}</p>

                {!isHttps && (
                    <div className="bg-yellow-900/30 border border-yellow-600/50 rounded-lg p-4 mb-4 max-w-xs">
                        <p className="text-yellow-400 text-xs text-center">
                            <strong>Tip:</strong> On mobile, camera requires HTTPS. Try accessing via localhost on desktop, or deploy to a secure server.
                        </p>
                    </div>
                )}

                <button
                    onClick={onClose}
                    className="bg-[#3B82F6] hover:bg-[#2563EB] text-white px-6 py-3 rounded-xl font-medium transition-colors"
                >
                    Close Scanner
                </button>
            </div>
        );
    }

    // Show loading state while requesting permission
    if (permissionState === 'pending') {
        return (
            <div className="w-full h-full min-h-[60vh] bg-black rounded-xl flex flex-col items-center justify-center p-6">
                <div className="w-12 h-12 border-4 border-[#3B82F6] border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="text-white text-center">Requesting camera access...</p>
                <p className="text-gray-400 text-sm text-center mt-2">Please allow camera permission when prompted</p>
            </div>
        );
    }

    return (
        <div className="relative w-full h-full min-h-[60vh] bg-black rounded-xl overflow-hidden flex items-center justify-center">
            {/* Video Stream - Full responsive sizing */}
            <video
                ref={ref}
                className="absolute inset-0 w-full h-full object-cover"
                playsInline
                autoPlay
                muted
            />

            {/* Overlay UI */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-10">
                {/* Scanning Frame */}
                <div className="w-[80%] max-w-[300px] aspect-[4/3] border-2 border-primary/70 rounded-lg relative">
                    {/* Corner accents */}
                    <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-[#3B82F6] -mt-0.5 -ml-0.5 rounded-tl"></div>
                    <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-[#3B82F6] -mt-0.5 -mr-0.5 rounded-tr"></div>
                    <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-[#3B82F6] -mb-0.5 -ml-0.5 rounded-bl"></div>
                    <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-[#3B82F6] -mb-0.5 -mr-0.5 rounded-br"></div>

                    {/* Scanning line animation */}
                    <div className="absolute inset-x-2 h-0.5 bg-[#3B82F6]/80 animate-pulse top-1/2 -translate-y-1/2"></div>
                </div>

                <p className="mt-6 text-white/90 text-sm font-medium bg-black/60 px-4 py-2 rounded-full backdrop-blur-sm">
                    Point camera at barcode
                </p>
            </div>

            {/* Close Button */}
            <button
                onClick={onClose}
                className="absolute top-4 right-4 bg-black/60 hover:bg-black/80 text-white rounded-full p-3 transition-colors z-20 backdrop-blur-sm"
            >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-6 h-6">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>
        </div>
    );
};
