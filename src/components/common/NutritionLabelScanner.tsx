import { useState, useRef, useCallback, useEffect } from 'react';

interface NutritionLabelScannerProps {
    onCapture: (imageBase64: string) => void;
    onClose: () => void;
    isProcessing?: boolean;
}

export const NutritionLabelScanner = ({ onCapture, onClose, isProcessing }: NutritionLabelScannerProps) => {
    const [error, setError] = useState<string | null>(null);
    const [cameraReady, setCameraReady] = useState(false);
    const [capturedImage, setCapturedImage] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);
    const streamRef = useRef<MediaStream | null>(null);

    // Start camera on mount
    useEffect(() => {
        let mounted = true;

        const startCamera = async () => {
            try {
                console.log('[LabelScanner] Requesting camera...');

                if (!navigator.mediaDevices?.getUserMedia) {
                    setError('Camera not supported');
                    return;
                }

                const stream = await navigator.mediaDevices.getUserMedia({
                    video: {
                        facingMode: 'environment',
                        width: { ideal: 1920 },
                        height: { ideal: 1080 },
                    }
                });

                if (!mounted) {
                    stream.getTracks().forEach(t => t.stop());
                    return;
                }

                streamRef.current = stream;

                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    videoRef.current.onloadedmetadata = () => {
                        if (mounted && videoRef.current) {
                            videoRef.current.play()
                                .then(() => {
                                    if (mounted) setCameraReady(true);
                                    console.log('[LabelScanner] Camera ready');
                                })
                                .catch(err => {
                                    console.error('[LabelScanner] Play error:', err);
                                    if (mounted) setError('Failed to start camera preview');
                                });
                        }
                    };
                }

            } catch (err) {
                console.error('[LabelScanner] Camera error:', err);
                if (!mounted) return;

                const error = err as Error;
                if (error.name === 'NotAllowedError') {
                    setError('Camera permission denied. Please allow camera access.');
                } else if (error.name === 'SecurityError') {
                    setError('Camera requires HTTPS connection.');
                } else if (error.name === 'AbortError') {
                    setError('Camera was interrupted. Please try again.');
                } else {
                    setError(`Camera error: ${error.message}`);
                }
            }
        };

        startCamera();

        return () => {
            mounted = false;
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(t => t.stop());
                streamRef.current = null;
            }
        };
    }, []);

    // Capture photo
    const capturePhoto = useCallback(() => {
        if (!videoRef.current || !cameraReady) return;

        const video = videoRef.current;
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.drawImage(video, 0, 0);
        const imageBase64 = canvas.toDataURL('image/jpeg', 0.9);

        setCapturedImage(imageBase64);

        // Stop camera when we have a capture
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(t => t.stop());
        }

        console.log('[LabelScanner] Photo captured');
    }, [cameraReady]);

    // Confirm and send - this triggers the OCR
    const confirmPhoto = useCallback(() => {
        if (capturedImage && !isSubmitting) {
            console.log('[LabelScanner] Sending image for OCR...');
            setIsSubmitting(true);
            onCapture(capturedImage);
        }
    }, [capturedImage, onCapture, isSubmitting]);

    // Retake - restart camera
    const retakePhoto = useCallback(() => {
        setCapturedImage(null);
        setIsSubmitting(false);
        // Camera will restart via useEffect when we remount
        window.location.reload(); // Simple fix for camera restart
    }, []);

    // Close and cleanup
    const handleClose = useCallback(() => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(t => t.stop());
            streamRef.current = null;
        }
        onClose();
    }, [onClose]);

    // Determine if we're processing
    const showProcessing = isProcessing || isSubmitting;

    // Error state
    if (error) {
        return (
            <div className="w-full h-[70vh] bg-[#1A1A1A] rounded-xl flex flex-col items-center justify-center p-6">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-16 h-16 text-red-500 mb-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
                <p className="text-red-400 text-center text-lg font-medium mb-2">Camera Error</p>
                <p className="text-gray-400 text-center text-sm mb-6">{error}</p>
                <button onClick={handleClose} className="bg-[#3B82F6] text-white px-6 py-3 rounded-xl font-medium">
                    Close
                </button>
            </div>
        );
    }

    // Preview captured image
    if (capturedImage) {
        return (
            <div className="w-full h-[70vh] bg-[#1A1A1A] rounded-xl flex flex-col overflow-hidden">
                {/* Image Preview - takes most of the space */}
                <div className="flex-1 relative overflow-hidden">
                    <img
                        src={capturedImage}
                        alt="Captured label"
                        className="absolute inset-0 w-full h-full object-contain bg-black"
                    />
                </div>

                {/* Action Buttons - fixed at bottom with safe area */}
                <div className="shrink-0 p-4 pb-6 bg-[#1A1A1A] border-t border-[#2A2A2A]">
                    {showProcessing ? (
                        <div className="flex items-center justify-center gap-3 py-4">
                            <div className="w-6 h-6 border-3 border-[#3B82F6] border-t-transparent rounded-full animate-spin"></div>
                            <span className="text-white text-lg">Analyzing nutrition label...</span>
                        </div>
                    ) : (
                        <div className="flex gap-3">
                            <button
                                onClick={retakePhoto}
                                className="flex-1 bg-[#2A2A2A] text-white py-4 rounded-xl font-medium text-lg"
                            >
                                Retake
                            </button>
                            <button
                                onClick={confirmPhoto}
                                className="flex-1 bg-[#3B82F6] text-white py-4 rounded-xl font-medium text-lg"
                            >
                                Analyze Label
                            </button>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // Camera view
    return (
        <div className="relative w-full h-[70vh] bg-black rounded-xl overflow-hidden flex flex-col">
            <video
                ref={videoRef}
                className="absolute inset-0 w-full h-full object-cover"
                playsInline
                muted
            />

            {/* Loading state */}
            {!cameraReady && (
                <div className="absolute inset-0 flex items-center justify-center bg-black z-10">
                    <div className="flex flex-col items-center gap-3">
                        <div className="w-10 h-10 border-3 border-[#3B82F6] border-t-transparent rounded-full animate-spin"></div>
                        <span className="text-white/70 text-sm">Starting camera...</span>
                    </div>
                </div>
            )}

            {/* Overlay guide */}
            {cameraReady && (
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-10">
                    <div className="w-[85%] max-w-[300px] aspect-[3/4] border-2 border-white/60 rounded-lg"></div>
                    <p className="mt-4 text-white/90 text-sm font-medium bg-black/60 px-4 py-2 rounded-full">
                        Align nutrition label in frame
                    </p>
                </div>
            )}

            {/* Bottom Controls */}
            <div className="absolute bottom-0 left-0 right-0 p-6 pb-8 bg-gradient-to-t from-black via-black/80 to-transparent z-20">
                <div className="flex items-center justify-center gap-8">
                    {/* Close button */}
                    <button
                        onClick={handleClose}
                        className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="white" className="w-6 h-6">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>

                    {/* Capture button */}
                    <button
                        onClick={capturePhoto}
                        disabled={!cameraReady}
                        className="w-20 h-20 bg-white rounded-full flex items-center justify-center disabled:opacity-40 shadow-lg"
                    >
                        <div className="w-16 h-16 bg-white border-4 border-black/20 rounded-full"></div>
                    </button>

                    {/* Spacer */}
                    <div className="w-12"></div>
                </div>
            </div>
        </div>
    );
};
