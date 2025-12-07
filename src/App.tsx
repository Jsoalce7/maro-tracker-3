import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AppShell } from './components/layout/AppShell';
import { Home } from './pages/Home';
import { Diary } from './pages/Diary';
import { Profile } from './pages/Profile';
import { Login } from './pages/Login';
import { CreateFood } from './pages/CreateFood';
import { CreateRecipe } from './pages/CreateRecipe';
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

  return withShell ? <AppShell>{children}</AppShell> : <>{children}</>;
}

function App() {
  const { initialize } = useAuthStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<RequireAuth><Home /></RequireAuth>} />
          <Route path="/diary" element={<RequireAuth><Diary /></RequireAuth>} />
          <Route path="/profile" element={<RequireAuth><Profile /></RequireAuth>} />

          {/* Create Pages (Full Screen) */}
          <Route path="/create-food" element={<RequireAuth withShell={false}><CreateFood /></RequireAuth>} />
          <Route path="/create-recipe" element={<RequireAuth withShell={false}><CreateRecipe /></RequireAuth>} />
        </Routes>
      </Router>
    </QueryClientProvider>
  );
}

export default App;
