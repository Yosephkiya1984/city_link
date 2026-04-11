import { create } from 'zustand';
import { SecurePersist } from './SecurePersist';
import { User } from '../types';

interface AuthState {
  currentUser: User | null;
  isAuthenticated: boolean;
  isVerified: boolean;
  
  // Actions
  setCurrentUser: (user: User | null) => Promise<void>;
  hydrate: () => Promise<void>;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  currentUser: null,
  isAuthenticated: false,
  isVerified: false,

  setCurrentUser: async (user: User | null) => {
    const isVerified = !!(user?.fayda_verified || user?.kyc_status === 'VERIFIED');
    set({ 
      currentUser: user, 
      isAuthenticated: !!user,
      isVerified
    });
    await SecurePersist.saveUser(user);
  },

  hydrate: async () => {
    const user = await SecurePersist.loadUser();
    const isVerified = !!(user?.fayda_verified || user?.kyc_status === 'VERIFIED');
    set({ 
      currentUser: user, 
      isAuthenticated: !!user,
      isVerified
    });
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
}));
