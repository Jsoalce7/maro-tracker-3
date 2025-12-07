import { useNavigate, useSearchParams } from 'react-router-dom';

/**
 * iOS Full-Screen Edit Entry Page
 */
export function EditEntryPage() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const entryId = searchParams.get('id');

    return (
        <div className="min-h-screen min-h-[100dvh] bg-[#0F0F0F] page-container flex flex-col">
            {/* Header */}
            <header className="shrink-0 p-4 pb-safe border-b border-[#2A2A2A] bg-[#141414] modal-header-safe flex items-center justify-between">
                <h1 className="text-white text-xl font-bold">Edit Entry</h1>
                <button
                    onClick={() => navigate(-1)}
                    className="text-white px-4 py-2 bg-[#2A2A2A] hover:bg-[#333] rounded-lg transition-colors"
                >
                    ✕
                </button>
            </header>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4">
                <div className="max-w-md mx-auto">
                    <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg p-4">
                        <p className="text-white">
                            Edit Entry: <span className="text-blue-400">{entryId}</span>
                        </p>
                        <p className="text-gray-400 text-sm mt-2">
                            Phase 2 will add full editing functionality
                        </p>
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div className="shrink-0 p-4 pb-safe border-t border-[#2A2A2A] bg-[#141414]">
                <button
                    onClick={() => navigate(-1)}
                    className="w-full py-3 bg-[#3B82F6] hover:bg-[#2563EB] text-white font-semibold rounded-lg"
                >
                    Back
                </button>
            </div>
        </div>
    );
}
