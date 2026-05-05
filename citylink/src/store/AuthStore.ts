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
    const user = await SecurePersist.loadUser();
    if (!user) {
      set({ currentUser: null, isAuthenticated: false, isVerified: false });
      return;
    }

    // Validate the live Supabase session before trusting the local store.
    // A locally-stored user whose server session has expired/been revoked must be cleared.
    let session: any = null;
    try {
      const { getSession } = await import('../services/auth.service');
      session = await getSession();
      if (!session || session.user.id !== user.id) {
        // Server session is dead or belongs to a different user — clear local state
        set({ currentUser: null, isAuthenticated: false, isVerified: false, uiMode: 'citizen' });
        await SecurePersist.saveUser(null);
        return;
      }
    } catch (e: any) {
      // 🛡️ RECOVERY: If we hit a terminal auth error (like 'Refresh Token Not Found'),
      // we must clear the store to break the invalid session loop.
      const isTerminalAuthError = 
        e?.message?.includes('Refresh Token') || 
        e?.message?.includes('Invalid Refresh Token') ||
        e?.status === 400;

      if (isTerminalAuthError) {
        console.error('[AuthStore] Terminal session error, forcing logout:', e.message);
        set({ currentUser: null, isAuthenticated: false, isVerified: false, uiMode: 'citizen' });
        await SecurePersist.saveUser(null);
        return;
      }
      // Network unavailable — allow offline hydration but mark as unverified
    }

    // 🛡️ REFRESH PROFILE: Ensure we have the latest metadata (roles, status) from the DB
    try {
      if (session) {
        const { loadSessionProfile } = await import('../services/profile.service');
        const refreshed = await loadSessionProfile(session.user as any, session.user.phone || '');
        if (refreshed?.profile) {
          const isV = !!(
            refreshed.profile.fayda_verified || refreshed.profile.kyc_status === 'VERIFIED'
          );

          // 🛡️ IDENTITY SYNC: If refreshed profile ID differs from current auth ID (phone fallback match),
          // we MUST use the profile ID for data consistency across the app.
          if (refreshed.profile.id !== session.user.id) {
            console.log(
              '[AuthStore] Identity fragmentation detected. Mapping auth ID',
              session.user.id,
              'to profile ID',
              refreshed.profile.id
            );
          }

          set({ currentUser: refreshed.profile, isVerified: isV });
          await SecurePersist.saveUser(refreshed.profile);
        }
      }
    } catch (e) {
      console.warn('[AuthStore] Profile refresh failed, using cached data:', e);
    }

    const finalUser = get().currentUser || user;
    const isVerified = !!(finalUser?.fayda_verified || finalUser?.kyc_status === 'VERIFIED');

    // 🛡️ ROUTING FIX: Restore correct uiMode on session hydration from role
    let restoredMode: AuthState['uiMode'] = 'citizen';
    if (finalUser?.role === 'admin') restoredMode = 'admin';
    if (finalUser?.role === 'merchant') restoredMode = 'merchant';
    set({ currentUser: finalUser, isAuthenticated: !!finalUser, isVerified, uiMode: restoredMode });
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
}));
