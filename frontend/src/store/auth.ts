import { create } from 'zustand';
import { getMe } from '../api/auth';
import type { User } from '../types/user';

interface AuthState {
  user: User | null;
  token: string | null;
  setToken: (token: string) => void;
  logout: () => void;
  fetchUser: () => Promise<void>;
}

const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: localStorage.getItem('token'),

  setToken: (token: string) => {
    localStorage.setItem('token', token);
    set({ token });
  },

  logout: () => {
    localStorage.removeItem('token');
    set({ token: null, user: null });
  },

  fetchUser: async () => {
    try {
      const res = await getMe();
      set({ user: res.data });
    } catch (error) {
      localStorage.removeItem('token');
      set({ token: null, user: null });
    }
  },
}));

export default useAuthStore;
