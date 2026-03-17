import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { LogOut, LayoutDashboard, Globe, User as UserIcon } from 'lucide-react';

export const Navbar = () => {
  const { user, isAdmin, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link to="/" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
                <Globe className="text-white w-5 h-5" />
              </div>
              <span className="text-xl font-bold text-gray-900 hidden sm:block">SavingsGroup</span>
            </Link>
          </div>

          <div className="flex items-center space-x-4">
            <Link to="/" className="text-gray-600 hover:text-indigo-600 px-3 py-2 rounded-md text-sm font-medium transition-colors">
              Public View
            </Link>
            
            {isAdmin && (
              <Link to="/admin" className="text-gray-600 hover:text-indigo-600 px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center">
                <LayoutDashboard className="w-4 h-4 mr-1" />
                Dashboard
              </Link>
            )}

            {user ? (
              <div className="flex items-center space-x-3 ml-4 border-l pl-4">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                    <UserIcon className="w-4 h-4 text-gray-500" />
                  </div>
                  <span className="text-sm text-gray-700 hidden md:block">{user.email}</span>
                </div>
                <button
                  onClick={handleLogout}
                  className="text-gray-500 hover:text-red-600 transition-colors"
                  title="Logout"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <Link
                to="/login"
                className="ml-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all shadow-sm"
              >
                Admin Login
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};
