export type UserRole = 'user' | 'admin' | 'super_admin';

export interface User {
  email: string;
  role: UserRole;
}

export interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: User | null;
} 