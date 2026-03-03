/* eslint-disable no-unused-vars */
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AnimatePresence, motion } from 'framer-motion';

import Sidebar from './components/Sidebar';
import Login from './pages/Login';
import Overview from './pages/Overview';
import LiveCamera from './pages/LiveCamera';
import Metrics from './pages/Metrics';
import Violations from './pages/Violations';
import Settings from './pages/Settings';
import Alerts from './pages/Alerts';
import { AuthProvider, useAuth } from './context/AuthContext';

function DashboardLayout({ children }) {
  return (
    <div className="h-screen w-full bg-[#030712] text-slate-200 flex font-sans overflow-hidden">
      <Sidebar />
      <main className="flex-1 min-w-0 flex flex-col relative z-0">
        {children}
      </main>

      {/* Toast Notification Mount Point */}
      <Toaster position="top-right" reverseOrder={false} />

      {/* Scrollbar styling globally injected for layout simplicity */}
      <style>{`
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
}

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? (
    <DashboardLayout>
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.98 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="h-full flex flex-col"
      >
        {children}
      </motion.div>
    </DashboardLayout>
  ) : <Navigate to="/" />;
};

function AppRoutes() {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        {/* Public Route */}
        <Route
          path="/"
          element={isAuthenticated ? <Navigate to="/overview" /> : <Login />}
        />

        {/* Protected Routes */}
        <Route path="/overview" element={<ProtectedRoute><Overview /></ProtectedRoute>} />
        <Route path="/dashboard" element={<ProtectedRoute><LiveCamera /></ProtectedRoute>} />
        <Route path="/metrics" element={<ProtectedRoute><Metrics /></ProtectedRoute>} />
        <Route path="/logs" element={<ProtectedRoute><Violations /></ProtectedRoute>} />
        <Route path="/alerts" element={<ProtectedRoute><Alerts /></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </AnimatePresence>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <AppRoutes />
      </Router>
    </AuthProvider>
  );
}
