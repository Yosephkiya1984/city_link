import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { User } from '../types';
import { SecurePersist } from './SecurePersist';

export interface AuthState {
  currentUser: User | null;
  isAuthenticated: boolean;
  isVerified: boolean;
  uiMode: 'citizen' | 'merchant' | 'agent' | 'admin' | 'valet';
  setCurrentUser: (user: User | null) => Promise<void>;
  setUiMode: (mode: 'citizen' | 'merchant' | 'agent' | 'admin' | 'valet') => void;
  hydrateSession: () => Promise<void>;
  signOut: () => Promise<void>;
  reset: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  subscribeWithSelector((set, get) => ({
    currentUser: null,
    isAuthenticated: false,
    isVerified: false,
    uiMode: 'citizen',

  setCurrentUser: async (user) => {
    const isVerified = !!(user?.fayda_verified || user?.kyc_status === 'VERIFIED');
    // Auto-set UI mode based on role
    let roleMode: AuthState['uiMode'] = 'citizen';
    if (user?.role === 'admin') roleMode = 'admin';
    if (user?.role === 'merchant') roleMode = 'merchant';
    // Even if role is delivery_agent, we land on 'citizen' mode first (User request)
    // if (user?.role === 'delivery_agent') roleMode = 'agent';

    const currentMode = get().uiMode;
    const isFirstLogin = !get().currentUser;

    // 🛡️ ROUTING FIX: Always enforce the role-derived mode on first login.
    // On subsequent calls (background syncs), only update mode if the role demands
    // an upgrade (e.g., citizen → merchant), never a demotion.
    let uiMode: AuthState['uiMode'];
    if (isFirstLogin) {
      // First login: always set mode from role
      uiMode = roleMode;
    } else if (roleMode === 'merchant' || roleMode === 'admin') {
      // Background sync for a privileged user: enforce the correct mode
      uiMode = roleMode;
    } else {
      // Background sync for citizen/agent: preserve current browsing mode
      uiMode = currentMode;
    }

    // 🛡️ FIX (LOOP-PREVENTION): Skip update if user data and uiMode haven't changed
    const current = get().currentUser;
    const isSameUser = current?.id === user?.id && JSON.stringify(current) === JSON.stringify(user);

    if (!isFirstLogin && isSameUser && currentMode === uiMode) {
      return;
    }

    console.log(
      '[AuthStore] setCurrentUser. Role:',
      user?.role,
      'currentMode:',
      currentMode,
      'isFirstLogin:',
      isFirstLogin,
      'setting uiMode to:',
      uiMode
    );

    set({ currentUser: user, isAuthenticated: !!user, isVerified, uiMode });

    await SecurePersist.saveUser(user);
  },

  setUiMode: (mode) => {
    console.log('[AuthStore] Manual setUiMode to:', mode);
    set({ uiMode: mode });
  },

  hydrateSession: async () => {
    // 1. Immediate Hydration from Cache
    const cachedUser = await SecurePersist.loadUser();
    if (cachedUser) {
      console.log('[AuthStore] Hydrating from local cache:', cachedUser.id);
      const isV = !!(cachedUser.fayda_verified || cachedUser.kyc_status === 'VERIFIED');
      let restoredMode: AuthState['uiMode'] = 'citizen';
      if (cachedUser.role === 'admin') restoredMode = 'admin';
      if (cachedUser.role === 'merchant') restoredMode = 'merchant';
      
      set({ 
        currentUser: cachedUser, 
        isAuthenticated: true, 
        isVerified: isV, 
        uiMode: restoredMode 
      });
    } else {
      set({ currentUser: null, isAuthenticated: false, isVerified: false, uiMode: 'citizen' });
    }

    // 2. Background Validation & Refresh
    const backgroundRefresh = async () => {
      try {
        const { getSession } = await import('../services/auth.service');
        const session = await getSession();
        
        if (!session) {
          if (get().isAuthenticated) {
            console.log('[AuthStore] Session expired, clearing state.');
            set({ currentUser: null, isAuthenticated: false, isVerified: false, uiMode: 'citizen' });
            await SecurePersist.saveUser(null);
          }
          return;
        }

        // Session exists, refresh profile
        const { loadSessionProfile } = await import('../services/profile.service');
        const refreshed = await loadSessionProfile(session.user as any, session.user.phone || '');
        
        if (refreshed?.profile) {
          const isV = !!(refreshed.profile.fayda_verified || refreshed.profile.kyc_status === 'VERIFIED');
          
          // Only update if data changed to avoid re-renders
          const current = get().currentUser;
          if (JSON.stringify(current) !== JSON.stringify(refreshed.profile)) {
            console.log('[AuthStore] Profile refreshed from server.');
            set({ currentUser: refreshed.profile, isVerified: isV });
            await SecurePersist.saveUser(refreshed.profile);
          }
        }
      } catch (e: any) {
        console.warn('[AuthStore] Background refresh failed:', e.message);
        // Terminal session error check
        if (e?.message?.includes('Refresh Token') || e?.status === 400) {
          set({ currentUser: null, isAuthenticated: false, isVerified: false, uiMode: 'citizen' });
          await SecurePersist.saveUser(null);
        }
      }
    };

    // Run in background without awaiting
    backgroundRefresh();
  },

  signOut: async () => {
    try {
      const { signOut } = await import('../services/auth.service');
      await signOut();
    } catch (e) {
      console.warn('[AuthStore] auth.service signOut failed:', e);
    }

    // Clear Zustand store and SecurePersist for Auth — also reset uiMode to prevent ghost merchant sessions
    set({ currentUser: null, isAuthenticated: false, isVerified: false, uiMode: 'citizen' });
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
    set({ currentUser: null, isAuthenticated: false, isVerified: false, uiMode: 'citizen' });
    await SecurePersist.saveUser(null);
  },
})));
