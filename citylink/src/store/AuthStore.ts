import { create } from 'zustand';
import { User } from '../types';
import { SecurePersist } from './SecurePersist';

export interface AuthState {
  currentUser: User | null;
  isAuthenticated: boolean;
  isVerified: boolean;
  uiMode: 'citizen' | 'merchant' | 'agent' | 'admin';
  setCurrentUser: (user: User | null) => Promise<void>;
  setUiMode: (mode: 'citizen' | 'merchant' | 'agent' | 'admin') => void;
  hydrateSession: () => Promise<void>;
  signOut: () => Promise<void>;
  reset: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  currentUser: null,
  isAuthenticated: false,
  isVerified: false,
  uiMode: 'citizen',

  setCurrentUser: async (user) => {
    const isVerified = !!(user?.fayda_verified || user?.kyc_status === 'VERIFIED');
    // Auto-set UI mode based on role if not already set, but default to citizen for agents
    let initialMode: AuthState['uiMode'] = 'citizen';
    if (user?.role === 'admin') initialMode = 'admin';
    if (user?.role === 'merchant') initialMode = 'merchant';
    if (user?.role === 'delivery_agent') initialMode = 'agent';

    // Only force the UI mode if we don't have a user yet (initial login)
    // This prevents background syncs from kicking an agent back to Agent mode when they are browsing the Marketplace.
    const currentMode = get().uiMode;
    const isFirstLogin = !get().currentUser;
    const uiMode = isFirstLogin ? initialMode : currentMode;
    
    console.log('[AuthStore] setCurrentUser. Role:', user?.role, 'currentMode:', currentMode, 'isFirstLogin:', isFirstLogin, 'setting uiMode to:', uiMode);
    
    set({ currentUser: user, isAuthenticated: !!user, isVerified, uiMode });
    await SecurePersist.saveUser(user);
  },

  setUiMode: (mode) => {
    console.log('[AuthStore] Manual setUiMode to:', mode);
    set({ uiMode: mode });
  },

  hydrateSession: async () => {
    const user = await SecurePersist.loadUser();
    if (!user) {
      set({ currentUser: null, isAuthenticated: false, isVerified: false });
      return;
    }

    // Validate the live Supabase session before trusting the local store.
    // A locally-stored user whose server session has expired/been revoked must be cleared.
    try {
      const { getSession } = await import('../services/auth.service');
      const session = await getSession();
      if (!session || session.user.id !== user.id) {
        // Server session is dead or belongs to a different user — clear local state
        set({ currentUser: null, isAuthenticated: false, isVerified: false });
        await SecurePersist.saveUser(null);
        return;
      }
    } catch {
      // Network unavailable — allow offline hydration but mark as unverified
    }

    const isVerified = !!(user?.fayda_verified || user?.kyc_status === 'VERIFIED');
    set({ currentUser: user, isAuthenticated: !!user, isVerified });
  },

  signOut: async () => {
    try {
      const { signOut } = await import('../services/auth.service');
      await signOut();
    } catch (e) {
      console.warn('[AuthStore] auth.service signOut failed:', e);
    }

    // Clear Zustand store and SecurePersist for Auth
    set({ currentUser: null, isAuthenticated: false, isVerified: false });
    await SecurePersist.saveUser(null);

    // Dynamically import StoreUtils to avoid circular dependency, then wipe everything
    try {
      const { clearAllStores } = await import('./StoreUtils');
      await clearAllStores();
    } catch (e) {
      console.warn('[AuthStore] global clearAllStores failed:', e);
    }
  },

  reset: async () => {
    set({ currentUser: null, isAuthenticated: false, isVerified: false });
    await SecurePersist.saveUser(null);
  },
}));
