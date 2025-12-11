import { useEffect } from 'react';

interface CardDetailModalProps {
    children: React.ReactNode;
    onClose: () => void;
}

export function CardDetailModal({ children, onClose }: CardDetailModalProps) {
    // Prevent background scrolling
    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = 'auto';
        };
    }, []);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
                onClick={onClose}
            />

            {/* Content Container */}
            <div className="relative z-10 w-full max-w-2xl bg-[#050505] rounded-3xl shadow-2xl animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto custom-scrollbar border border-[#262626]">
                {/* Close Button mobile friendly */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 z-20 w-8 h-8 flex items-center justify-center rounded-full bg-[#2A2A2A] text-[#8E8E93] hover:text-white"
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>

                <div className="p-0">
                    {children}
                </div>
            </div>
        </div>
    );
}
