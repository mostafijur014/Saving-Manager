import * as React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Navbar } from './components/Navbar';
import { PublicView } from './pages/PublicView';
import { AdminDashboard } from './pages/AdminDashboard';
import { Login } from './pages/Login';
import { useAuth } from './hooks/useAuth';
import { AlertTriangle } from 'lucide-react';

// Protected Route Component
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading, isAdmin } = useAuth();

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin h-10 w-10 border-4 border-indigo-600 border-t-transparent rounded-full"></div>
    </div>
  );
  
  if (!user || !isAdmin) {
    return <Navigate to="/finance-based-saving-login" replace />;
  }

  return <>{children}</>;
};

export default function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <div className="no-print">
          <Navbar />
        </div>
        <main className="flex-grow">
          <Routes>
            <Route path="/" element={<PublicView />} />
            <Route path="/finance-based-saving-login" element={<Login />} />
            <Route 
              path="/dashboard" 
              element={
                <ProtectedRoute>
                  <AdminDashboard />
                </ProtectedRoute>
              } 
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
        <footer className="bg-white border-t border-gray-200 py-8 no-print">
          <div className="max-w-7xl mx-auto px-4 text-center text-gray-500 text-sm">
            &copy; {new Date().getFullYear()} Savings Group Manager. All rights reserved.
          </div>
        </footer>
      </div>
    </Router>
  );
}
