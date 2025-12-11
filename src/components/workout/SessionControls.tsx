interface SessionControlsProps {
    onNext: () => void;
    onPrev: () => void;
    canGoPrev: boolean;
}

export function SessionControls({ onNext, onPrev, canGoPrev }: SessionControlsProps) {
    return (
        <div className="p-4 bg-[#050505] border-t border-[#262626] safe-bottom">
            <div className="flex gap-3">
                <button
                    onClick={onPrev}
                    disabled={!canGoPrev}
                    className={`px-4 py-4 rounded-xl font-bold flex-1 transition-colors ${canGoPrev
                            ? 'bg-[#1A1D21] text-white hover:bg-[#25282C]'
                            : 'bg-[#141414] text-[#444] cursor-not-allowed'
                        }`}
                >
                    Prev
                </button>
                <button
                    onClick={onNext}
                    className="flex-[3] bg-[#3B82F6] hover:bg-[#2563EB] text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-900/20 active:scale-[0.98] transition-all"
                >
                    Save Set & Next
                </button>
            </div>
        </div>
    );
}
