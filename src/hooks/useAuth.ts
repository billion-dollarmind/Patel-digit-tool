import { useState, useEffect } from 'react';

export const useAuth = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if user is already authenticated
    const authStatus = localStorage.getItem('patel-digit-tool-auth');
    setIsAuthenticated(authStatus === 'true');
    setIsLoading(false);
  }, []);

  const authenticate = () => {
    setIsAuthenticated(true);
  };

  const logout = () => {
    localStorage.removeItem('patel-digit-tool-auth');
    setIsAuthenticated(false);
  };

  return {
    isAuthenticated,
    isLoading,
    authenticate,
    logout
  };
};