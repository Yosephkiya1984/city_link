import { create } from 'zustand';
import { User } from '../types';
import { SecurePersist } from './SecurePersist';

export interface AuthState {
  currentUser: User | null;
  isAuthenticated: boolean;
  isVerified: boolean;
  setCurrentUser: (user: User | null) => Promise<void>;
  hydrateSession: () => Promise<void>;
  signOut: () => Promise<void>;
  reset: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  currentUser: null,
  isAuthenticated: false,
  isVerified: false,

  setCurrentUser: async (user) => {
    const isVerified = !!(user?.fayda_verified || user?.kyc_status === 'VERIFIED');
    set({ currentUser: user, isAuthenticated: !!user, isVerified });
    await SecurePersist.saveUser(user);
  },

  hydrateSession: async () => {
    const user = await SecurePersist.loadUser();
    const isVerified = !!(user?.fayda_verified || user?.kyc_status === 'VERIFIED');
    set({ currentUser: user, isAuthenticated: !!user, isVerified });
  },

  signOut: async () => {
    try {
      const { signOut } = await import('../services/auth.service');
      await signOut();
    } catch (e) {
      console.warn('[AuthStore] signOut failed:', e);
    }
    set({ currentUser: null, isAuthenticated: false, isVerified: false });
    await SecurePersist.saveUser(null);
  },

  reset: async () => {
    set({ currentUser: null, isAuthenticated: false, isVerified: false });
    await SecurePersist.saveUser(null);
  },
}));
