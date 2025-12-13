import { useState, useEffect, useRef } from 'react';
import { useZxing } from 'react-zxing';

interface BarcodeScannerProps {
    onDetected: (barcode: string) => void;
    onClose: () => void;
    onManualInput?: () => void; // New prop for fallback
}

export const BarcodeScanner = ({ onDetected, onClose, onManualInput }: BarcodeScannerProps) => {
    const [error, setError] = useState<string | null>(null);
    const [permissionState, setPermissionState] = useState<'pending' | 'granted' | 'denied' | 'unavailable'>('pending');
    const [isHttps, setIsHttps] = useState(true);
    const [torchOn, setTorchOn] = useState(false);
    const [hasTorch, setHasTorch] = useState(false);

    // Check HTTPS
    useEffect(() => {
        const isSecure = window.location.protocol === 'https:' || window.location.hostname === 'localhost';
        setIsHttps(isSecure);
        if (!isSecure) {
            setError('Camera requires HTTPS.');
            setPermissionState('unavailable');
        }
    }, []);

    // Permission Check
    useEffect(() => {
        if (!isHttps) return;
        const checkPermission = async () => {
            try {
                if (!navigator.mediaDevices?.getUserMedia) {
                    throw new Error('Camera not supported');
                }
                const stream = await navigator.mediaDevices.getUserMedia({ video: true });
                setPermissionState('granted');
                stream.getTracks().forEach(t => t.stop());
            } catch (err) {
                const e = err as Error;
                if (e.name === 'NotAllowedError') setPermissionState('denied');
                else setPermissionState('unavailable');
                setError(e.message);
            }
        };
        checkPermission();
    }, [isHttps]);

    const { ref } = useZxing({
        onDecodeResult(result) {
            // Improve debounce or just trust the parent to close
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
                // Force Main Lens considerations:
                // 'environment' usually picks the best rear camera.
                // 1080p 'ideal' resolution helps avoid low-res wide angle on some devices.
                width: { ideal: 1920, min: 1280 },
                height: { ideal: 1080, min: 720 },
                // @ts-ignore - 'advanced' is standard but missing in some TS defs
                advanced: [{
                    // focusMode: 'continuous', // Not supported in standard TS lib yet
                    // zoom: 1.0 // Hint to use main lens (1x)
                }]
            }
        },
        paused: permissionState !== 'granted',
    });

    // Torch Logic
    useEffect(() => {
        const video = ref.current;
        if (!video) return;

        const checkTorch = async () => {
            // Wait for stream to be active
            if (video.srcObject) {
                const stream = video.srcObject as MediaStream;
                const track = stream.getVideoTracks()[0];
                if (track) {
                    const capabilities = track.getCapabilities?.() || {};
                    // @ts-ignore
                    if (capabilities.torch) {
                        setHasTorch(true);
                    }
                }
            }
        };

        video.addEventListener('loadedmetadata', checkTorch);
        return () => video.removeEventListener('loadedmetadata', checkTorch);
    }, [ref, permissionState]);

    const toggleTorch = async () => {
        const video = ref.current;
        if (!video || !video.srcObject) return;

        const stream = video.srcObject as MediaStream;
        const track = stream.getVideoTracks()[0];

        try {
            await track.applyConstraints({
                // @ts-ignore
                advanced: [{ torch: !torchOn }]
            });
            setTorchOn(!torchOn);
        } catch (e) {
            console.error('Failed to toggle torch', e);
        }
    };

    // Error State
    if (error || permissionState === 'denied' || permissionState === 'unavailable') {
        return (
            <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center p-6 text-center">
                <p className="text-red-500 mb-4 text-lg">Camera Error</p>
                <p className="text-gray-400 mb-6">{error || 'Access denied'}</p>
                <div className="flex gap-4">
                    {onManualInput && (
                        <button onClick={onManualInput} className="bg-[#2A2A2A] text-white px-6 py-3 rounded-xl font-medium">
                            Enter Manually
                        </button>
                    )}
                    <button onClick={onClose} className="bg-[#3B82F6] text-white px-6 py-3 rounded-xl font-medium">
                        Close
                    </button>
                </div>
            </div>
        );
    }

    if (permissionState === 'pending') {
        return <div className="fixed inset-0 z-50 bg-black text-white flex items-center justify-center">Initializing Camera...</div>;
    }

    return (
        <div className="relative w-full h-full min-h-[60vh] bg-black rounded-xl overflow-hidden flex items-center justify-center">
            <video ref={ref} className="absolute inset-0 w-full h-full object-cover" />

            {/* Scan Box Overlay */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-10">
                <div className="w-[70%] max-w-[300px] aspect-square border-2 border-white/50 rounded-lg relative overflow-hidden shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]">
                    <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-[#3B82F6] rounded-tl-sm"></div>
                    <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-[#3B82F6] rounded-tr-sm"></div>
                    <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-[#3B82F6] rounded-bl-sm"></div>
                    <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-[#3B82F6] rounded-br-sm"></div>
                    <div className="absolute inset-x-0 h-0.5 bg-red-500/80 animate-[scan_2s_infinite] top-1/2"></div>
                </div>
                <p className="mt-8 text-white/90 text-sm font-medium bg-black/60 px-4 py-2 rounded-full backdrop-blur-sm">
                    Center barcode in box
                </p>
            </div>

            {/* Controls */}
            <div className="absolute bottom-8 inset-x-0 flex justify-center gap-6 z-20">
                {hasTorch && (
                    <button onClick={toggleTorch} className="p-4 rounded-full bg-black/50 backdrop-blur border border-white/20 text-white">
                        {torchOn ? (
                            <svg className="w-6 h-6 text-yellow-500" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2a1 1 0 011 1v18a1 1 0 11-2 0V3a1 1 0 011-1z" /></svg>
                        ) : (
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                        )}
                    </button>
                )}

                {onManualInput && (
                    <button onClick={onManualInput} className="px-6 py-3 rounded-xl bg-black/50 backdrop-blur border border-white/20 text-white font-medium text-sm">
                        Enter Manually
                    </button>
                )}
            </div>

            <button onClick={onClose} className="absolute top-4 right-4 bg-black/50 p-2 rounded-full text-white z-20">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
        </div>
    );
};
