'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, AuthState } from '../types';

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextType>(null!);

// 模拟用户数据
const VALID_CREDENTIALS = {
  admin: {
    email: 'admin@abc.com',
    password: '123456',
    role: 'admin' as const
  },
  user: {
    email: 'user@abc.com',
    password: '123456',
    role: 'user' as const
  }
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    isAuthenticated: false,
    isLoading: true,
    user: null
  });

  // Check for existing session on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const hasSession = localStorage.getItem('auth') !== null;
        if (hasSession) {
          const savedAuth = JSON.parse(localStorage.getItem('auth') || '{}');
          setState({
            isAuthenticated: true,
            isLoading: false,
            user: savedAuth.user
          });
        } else {
          setState(prev => ({ ...prev, isLoading: false }));
        }
      } catch (error) {
        console.error('Error checking authentication:', error);
        setState(prev => ({ ...prev, isLoading: false }));
      }
    };

    checkAuth();
  }, []);

  const login = async (email: string, password: string) => {
    setState(prev => ({ ...prev, isLoading: true }));
    try {
      await new Promise(resolve => setTimeout(resolve, 500)); // 模拟API延迟

      const adminMatch = email === VALID_CREDENTIALS.admin.email && password === VALID_CREDENTIALS.admin.password;
      const userMatch = email === VALID_CREDENTIALS.user.email && password === VALID_CREDENTIALS.user.password;

      if (adminMatch || userMatch) {
        const user = adminMatch ? VALID_CREDENTIALS.admin : VALID_CREDENTIALS.user;
        const authData = {
          user: {
            email: user.email,
            role: user.role
          }
        };
        
        setState({
          isAuthenticated: true,
          isLoading: false,
          user: authData.user
        });
        
        localStorage.setItem('auth', JSON.stringify(authData));
        return { success: true };
      }

      setState(prev => ({ ...prev, isLoading: false }));
      return {
        success: false,
        error: 'Invalid email or password. Please try again.'
      };
    } catch (error) {
      console.error('Login error:', error);
      setState(prev => ({ ...prev, isLoading: false }));
      return {
        success: false,
        error: 'An error occurred during login. Please try again.'
      };
    }
  };

  const logout = () => {
    setState({
      isAuthenticated: false,
      isLoading: false,
      user: null
    });
    localStorage.removeItem('auth');
  };

  return (
    <AuthContext.Provider value={{ ...state, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}