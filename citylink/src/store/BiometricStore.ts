import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import * as LocalAuthentication from 'expo-local-authentication';
import { SecurePersist } from './SecurePersist';

interface BiometricState {
  isBiometricsSupported: boolean;
  isBiometricsEnabled: boolean;
  biometryType: LocalAuthentication.AuthenticationType[];
  isLocked: boolean;

  // Actions
  checkSupport: () => Promise<void>;
  setBiometricsEnabled: (enabled: boolean) => Promise<void>;
  setLocked: (locked: boolean) => void;
  authenticate: (reason?: string) => Promise<boolean>;
}

export const useBiometricStore = create<BiometricState>()(
  persist(
    (set, get) => ({
      isBiometricsSupported: false,
      isBiometricsEnabled: false,
      biometryType: [],
      isLocked: false,

      checkSupport: async () => {
        const hasHardware = await LocalAuthentication.hasHardwareAsync();
        const isEnrolled = await LocalAuthentication.isEnrolledAsync();
        const types = await LocalAuthentication.supportedAuthenticationTypesAsync();

        set({
          isBiometricsSupported: hasHardware && isEnrolled,
          biometryType: types,
        });
      },

      setBiometricsEnabled: async (enabled: boolean) => {
        set({ isBiometricsEnabled: enabled });
      },

      setLocked: (locked: boolean) => {
        set({ isLocked: locked });
      },

      authenticate: async (reason: string = 'Authenticate to continue') => {
        const { isBiometricsEnabled, isBiometricsSupported } = get();

        if (!isBiometricsSupported || !isBiometricsEnabled) {
          return true; // Fallback to PIN if enabled, but for now just pass through
        }

        const result = await LocalAuthentication.authenticateAsync({
          promptMessage: reason,
          fallbackLabel: 'Use Passcode',
          cancelLabel: 'Cancel',
          disableDeviceFallback: false,
        });

        if (result.success) {
          set({ isLocked: false });
        }

        return result.success;
      },
    }),
    {
      name: 'citylink-biometric-storage',
      storage: createJSONStorage(() => ({
        getItem: (name) => SecurePersist.getItem(name),
        setItem: (name, value) => SecurePersist.setItem(name, value),
        removeItem: (name) => SecurePersist.deleteItem(name),
      })),
      partialize: (state) => ({
        isBiometricsEnabled: state.isBiometricsEnabled,
      }),
    }
  )
);
