import { useAuthStore } from './AuthStore';
import { useWalletStore } from './WalletStore';
import { useMarketStore } from './MarketStore';
import { useSystemStore } from './SystemStore';

/**
 * useAppStore (LEGACY BRIDGE)
 * 
 * @deprecated THIS IS A PERFORMANCE HAZARD. 
 * High-traffic screens should be migrated to direct domain hooks ASAP.
 * (useAuthStore, useWalletStore, useMarketStore, or useSystemStore)
 */
export const useAppStore = <T>(selector?: (state: any) => T): T => {
  if (__DEV__) {
    // We use a ref or a simple count to prevent console flooding
    // but enough to let developers know they are using a legacy pattern.
    console.warn('[CityLink] useAppStore used. Please migrate to domain-specific hooks.');
  }

  const auth = useAuthStore();
  const wallet = useWalletStore();
  const market = useMarketStore();
  const system = useSystemStore();

  // Combine for selector
  const combinedState = {
    ...auth,
    ...wallet,
    ...market,
    ...system
  };

  return selector ? selector(combinedState) : (combinedState as unknown as T);
};

/**
 * getAppState (LEGACY BRIDGE)
 * Provides non-hook access for services.
 */
export const getAppState = () => {
  return {
    ...useAuthStore.getState(),
    ...useWalletStore.getState(),
    ...useMarketStore.getState(),
    ...useSystemStore.getState(),
  };
};

/**
 * useAppStore.getState (LEGACY BRIDGE)
 * Mimics the Zustand store API for direct access.
 */
(useAppStore as any).getState = getAppState;

// Re-export domain stores for direct access (Recommended for new code)
export { useAuthStore, useWalletStore, useMarketStore, useSystemStore };
