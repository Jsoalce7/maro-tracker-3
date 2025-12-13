import { useState, ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useBreakpoints } from '../../hooks/useBreakpoints';
import { Sidebar } from './Sidebar';
import { MobileBottomNav } from './MobileBottomNav';
import { GlobalActionModal } from '../navigation/GlobalActionModal';
// Import dependent modals for GlobalAction
import { StartWorkoutModal } from '../workout/StartWorkoutModal';
import { WorkoutManager } from '../workout/WorkoutManager';
import { workoutService } from '../../services/workoutService';
import { useAuthStore } from '../../stores/authStore';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getTodayLocal } from '../../utils/date';

interface NavigationControllerProps {
    children: ReactNode;
}

export function NavigationController({ children }: NavigationControllerProps) {
    const { isMobile, isDesktop, isTablet } = useBreakpoints();
    const location = useLocation();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { session } = useAuthStore();
    const today = getTodayLocal();

    // -- State for Modals managed globally via FAB --
    const [showGlobalAction, setShowGlobalAction] = useState(false);
    const [showStartWorkout, setShowStartWorkout] = useState(false);
    const [showWorkoutManager, setShowWorkoutManager] = useState(false);

    // Workout Data for Modals
    const { data: workoutData = { sessions: [], scheduled: [] } } = useQuery({
        queryKey: ['workouts', today, session?.user?.id],
        queryFn: () => {
            if (!session?.user?.id) return { sessions: [], scheduled: [] };
            return workoutService.getWorkoutsForDate(session.user.id, today);
        },
        enabled: !!session?.user?.id && (showGlobalAction || showStartWorkout) // Only fetch if needed
    });
    const activeSession = workoutData.sessions[0];

    // Determine if we should hide nav
    // Hide on auth, specialized full-screen flows
    const hideNavRoutes = ['/login', '/workout/session', '/add-food', '/create-food', '/create-recipe', '/log-water'];
    const shouldHideNav = hideNavRoutes.some(route => location.pathname.startsWith(route));

    // Layout Classes
    // Mobile: Padding Bottom for BottomNav
    // Desktop/Tablet: Padding Left for Sidebar
    // Collapsible logic means padding left might need to be dynamic or we just use flex row.
    // Flex row is safer for Desktop/Tablet.

    // Desktop Sidebar State Reader (local only for initial class, but Sidebar handles its own width)
    // We need to know sidebar width to offset content? 
    // Easier approach: Sidebar is fixed, Main Content has margin-left. 
    // BUT Sidebar is variable width. 
    // Best approach: Sidebar is NOT fixed position, but sticky or just flex item?
    // User requirement: "Left: Sidebar navigation, Right: Main content area".
    // If we use Flexbox, the content naturally fills remaining space.

    // HOWEVER, Sidebar component currently uses `fixed` position. 
    // I should probably update Sidebar to be static/sticky OR use context to communicate width.
    // Let's refactor Sidebar in a separate step if needed, or just assume a margin.
    // Actually, simply rendering Sidebar + Main in a flex row is best. 
    // Sidebar needs to retain `h-screen sticky top-0`.

    // For this implementation, I will wrapping them in a flex container for Desktop/Tablet.

    if (shouldHideNav) {
        return <>{children}</>;
    }

    return (
        <div className={`min-h-screen bg-[#050505] ios-pwa-layout-fix flex ${isMobile ? 'flex-col' : 'flex-row'}`}>

            {/* Desktop/Tablet Sidebar */}
            {!isMobile && (
                <div className="shrink-0 relative z-50">
                    <Sidebar onManageWorkouts={() => setShowWorkoutManager(true)} />
                    {/* Placeholder div to occupy space because Sidebar is fixed? 
                        Wait, my Sidebar implementation used `fixed`. 
                        If I leave it fixed, I need to know the width to add margin to content.
                        Sidebar width toggles (w-20 vs w-64).
                        
                        Better to Make Sidebar NOT fixed but `sticky top-0 h-screen` or just static height.
                        Let's try to override Sidebar styles via a wrapper or assume we'll fix Sidebar to be relative/sticky.
                        
                        Actually, existing Sidebar uses `fixed`. I should probably change it to `sticky` 
                        so it pushes content naturally. 
                    */}
                </div>
            )}

            {/* Main Content Area */}
            <main className={`flex-1 relative w-full ${isMobile ? 'pb-24' : ''} ${!isMobile ? 'ml-0' : ''}`}>
                {/* 
                    Issue: If Sidebar is fixed, content goes under it.
                    If I change Sidebar to be relative/sticky in next step, it works.
                    I will update Sidebar to be `sticky` in a subsequent edit or right now via overriding class if possible.
                    Actually, in the `Sidebar` component I wrote `fixed top-0 left-0`.
                    I should change that to `sticky top-0 h-screen` for better layout management.
                 */}
                {children}
            </main>

            {/* Mobile Bottom Nav */}
            {isMobile && (
                <MobileBottomNav onFabClick={() => setShowGlobalAction(true)} />
            )}

            {/* Global Modals */}
            {showGlobalAction && (
                <GlobalActionModal
                    onClose={() => setShowGlobalAction(false)}
                    onStartWorkout={() => {
                        setShowGlobalAction(false);
                        setShowStartWorkout(true);
                    }}
                    onManageWorkouts={() => {
                        setShowGlobalAction(false);
                        setShowWorkoutManager(true);
                    }}
                    onManageMedications={() => {
                        setShowGlobalAction(false);
                        navigate('/medications');
                    }}
                />
            )}

            {showStartWorkout && (
                <StartWorkoutModal
                    onClose={() => setShowStartWorkout(false)}
                    currentSession={activeSession}
                    onStart={async (templateId) => {
                        try {
                            if (templateId) {
                                const { session: newSession } = await workoutService.startWorkoutFromTemplate(session!.user!.id, templateId);
                                navigate(`/workout/session/${newSession.id}`);
                            } else {
                                const newSession = await workoutService.startEmptySession(session!.user!.id);
                                navigate(`/workout/session/${newSession.id}`);
                            }
                        } catch (e) { console.error(e); alert("Failed to start workout"); }
                    }}
                    onManage={() => {
                        setShowStartWorkout(false);
                        setShowWorkoutManager(true);
                    }}
                    onResume={() => {
                        if (activeSession) navigate(`/workout/session/${activeSession.id}`);
                    }}
                    onEndSession={async () => {
                        if (!activeSession) return;
                        await workoutService.completeWorkout(activeSession.id);
                        queryClient.invalidateQueries({ queryKey: ['workouts'] });
                        setShowStartWorkout(false);
                    }}
                />
            )}

            {showWorkoutManager && (
                <WorkoutManager onClose={() => setShowWorkoutManager(false)} />
            )}
        </div>
    );
}
