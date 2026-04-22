import * as React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Navbar } from './components/Navbar';
import { PublicView } from './pages/PublicView';
import { AdminDashboard } from './pages/AdminDashboard';
import { Login } from './pages/Login';
import { useAuth } from './hooks/useAuth';
import { AlertTriangle, User, Phone } from 'lucide-react';

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
        <footer className="bg-white border-t border-gray-200 py-10 no-print">
          <div className="max-w-7xl mx-auto px-4 flex flex-col items-center gap-4 text-gray-500 text-sm">
            <div className="font-medium">
              &copy; {new Date().getFullYear()} Dream Development Society. All rights reserved.
            </div>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-8 pt-4 border-t border-gray-100 w-full max-w-lg">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-indigo-500" />
                <span className="text-[11px] sm:text-xs">
                  Developed by <span className="font-bold text-gray-800">Md. Mostafijur Rahman</span>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-green-500" />
                <span className="text-[11px] sm:text-xs">
                  Phone: <a href="tel:+8801303988226" className="font-bold text-gray-800 hover:text-indigo-600 transition-colors">+8801303988226</a>
                </span>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </Router>
  );
}
