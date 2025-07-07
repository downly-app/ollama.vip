import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: string;
  email: string;
  username: string;
  avatar?: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, username: string) => Promise<void>;
  logout: () => void;
  updateProfile: (updates: Partial<User>) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,

      login: async (email: string, password: string) => {
        // Simulate login - replace with actual authentication logic
        const mockUser: User = {
          id: '1',
          email,
          username: email.split('@')[0],
        };
        set({ user: mockUser, isAuthenticated: true });
      },

      register: async (email: string, password: string, username: string) => {
        // Simulate registration - replace with actual authentication logic
        const mockUser: User = {
          id: '1',
          email,
          username,
        };
        set({ user: mockUser, isAuthenticated: true });
      },

      logout: () => {
        set({ user: null, isAuthenticated: false });
      },

      updateProfile: (updates: Partial<User>) => {
        const { user } = get();
        if (user) {
          set({ user: { ...user, ...updates } });
        }
      },
    }),
    {
      name: 'auth-storage',
    }
  )
);
