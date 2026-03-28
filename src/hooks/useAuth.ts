import { useState, useEffect } from 'react';

export const useAuth = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(
    localStorage.getItem('admin_authenticated') === 'true'
  );
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const checkAuth = () => {
      const authStatus = localStorage.getItem('admin_authenticated') === 'true';
      setIsAuthenticated(authStatus);
    };
    window.addEventListener('storage', checkAuth);
    return () => window.removeEventListener('storage', checkAuth);
  }, []);

  const login = async (username: string, password: string) => {
    // Secret credentials
    if (username === 'FinSaver_Pro' && password === 'wealth@X26') {
      localStorage.setItem('admin_authenticated', 'true');
      setIsAuthenticated(true);
      return true;
    }
    throw new Error('Invalid username or password');
  };

  const logout = () => {
    localStorage.removeItem('admin_authenticated');
    setIsAuthenticated(false);
  };

  return { user: isAuthenticated ? { email: 'FinSaver_Pro' } : null, loading, isAdmin: isAuthenticated, login, logout };
};
