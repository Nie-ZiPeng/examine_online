import { create } from 'zustand';
import { getMe } from '../api/auth';

const useAuthStore = create((set) => ({
  user: null,
  token: localStorage.getItem('token'),
  
  setToken: (token) => {
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
