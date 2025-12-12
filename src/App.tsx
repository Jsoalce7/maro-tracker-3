import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, Outlet } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AppShell } from './components/layout/AppShell';
import { Home } from './pages/Home';
import { Diary } from './pages/Diary';
import { AddFood } from './pages/AddFood';
import { LogWater } from './pages/LogWater';
import { Profile } from './pages/Profile';
import { Login } from './pages/Login';
import { CreateFood } from './pages/CreateFood';
import { WorkoutSession } from './pages/WorkoutSession';
import { CreateRecipe } from './pages/CreateRecipe';
// import { CreateMealPage } from './pages/CreateMealPage';
// import { FoodDatabasePage } from './pages/FoodDatabasePage';
import { MedicationManagerPage } from './pages/MedicationManagerPage';
import { useAuthStore } from './stores/authStore';

// Create a client
const queryClient = new QueryClient();

// Protected Route wrapper
function RequireAuth({ children, withShell = true }: { children: React.ReactNode, withShell?: boolean }) {
  const { session, isLoading } = useAuthStore();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0F0F0F] flex items-center justify-center text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-[#3B82F6] border-t-transparent rounded-full animate-spin"></div>
          <p>Loading session...</p>
        </div>
      </div>
    );
  }

  if (!session || session.user.is_anonymous) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return withShell ? <AppShell>{children || <Outlet />}</AppShell> : <>{children || <Outlet />}</>;
}

function App() {
  const { initialize } = useAuthStore();

  useEffect(() => {
    initialize();

    // iOS PWA Detection
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;

    if (isIOS && isStandalone) {
      document.body.classList.add('ios-pwa');
    }
  }, [initialize]);

  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />

          {/* Main Layout (With Layout & BottomNav) */}
          <Route element={<RequireAuth withShell={true}><Outlet /></RequireAuth>}>
            <Route path="/" element={<Home />} />
            <Route path="/diary" element={<Diary />} />
            <Route path="/profile" element={<Profile />} />
            {/* <Route path="/log-water" element={<LogWater />} /> Moved to Full Screen Layout */}
          </Route>

          {/* Full Screen Layout (No BottomNav) */}
          <Route element={<RequireAuth withShell={false}><Outlet /></RequireAuth>}>
            <Route path="/workout/session/:sessionId" element={<WorkoutSession />} /> {/* Full-screen workout */}
            <Route path="/add-food" element={<AddFood />} />
            <Route path="/log-water" element={<LogWater />} />
            <Route path="/create-food" element={<CreateFood />} />
            <Route path="/create-recipe" element={<CreateRecipe />} />
            {/* <Route path="/create-meal" element={<CreateMealPage />} /> */}
            {/* <Route path="/food-database" element={<FoodDatabasePage />} /> */}
            <Route path="/medications" element={<MedicationManagerPage />} />
          </Route>

          {/* Catch-all 404 */}
          <Route path="*" element={
            <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center p-4 text-center">
              <h1 className="text-4xl font-bold text-white mb-2">404</h1>
              <p className="text-[#8E8E93] mb-6">Page not found</p>
              <a href="/" className="px-6 py-3 bg-[#3B82F6] rounded-xl text-white font-medium hover:bg-[#2563EB] transition-colors">
                Go Home
              </a>
            </div>
          } />
        </Routes>
      </Router>
    </QueryClientProvider>
  );
}

export default App;
