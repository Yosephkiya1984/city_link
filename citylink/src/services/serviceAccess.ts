import { useAuthStore } from '../store/AuthStore';

export interface ServiceRequirement {
  id: string;
  met: boolean;
  label: string;
  actionRequired?: string;
}

export function useServiceAccess() {
  const currentUser = useAuthStore((s) => s.currentUser);

  return {
    guardServiceAccess: async (serviceName: string): Promise<boolean> => {
      // 1. Authentication Check
      if (!currentUser) return false;

      // 2. Role-based feature gating
      const isGov = ['admin', 'minister', 'inspector', 'station'].includes(currentUser.role || '');
      const isMerchant = currentUser.role === 'merchant';
      const isAgent = currentUser.role === 'delivery_agent';

      // Admin always has access to core logic
      if (currentUser.role === 'admin') return true;

      switch (serviceName) {
        case 'wallet_transfer':
        case 'escrow_release':
          return currentUser.kyc_status === 'VERIFIED';

        case 'merchant_dashboard':
          return isMerchant || isGov;

        case 'agent_dispatch':
          return isAgent || isGov;

        case 'marketplace_listing':
          return isMerchant && currentUser.kyc_status === 'VERIFIED';

        default:
          // Basic services (viewing, profile) only require auth
          return true;
      }
    },
  };
}

export const ServiceAccessUtils = {
  checkAccess: async (service: string = 'general'): Promise<boolean> => {
    const user = useAuthStore.getState().currentUser;
    if (!user) return false;

    // Core check: must be verified for financial operations
    if (['payment', 'transfer', 'withdrawal'].includes(service)) {
      return user.kyc_status === 'VERIFIED';
    }

    return true;
  },
  validateRequirements: async (): Promise<ServiceRequirement[]> => {
    const user = useAuthStore.getState().currentUser;
    const reqs: ServiceRequirement[] = [];

    if (!user) return [{ id: 'auth', met: false, label: 'Sign in required' }];

    reqs.push({
      id: 'kyc',
      met: user.kyc_status === 'VERIFIED',
      label: 'Fayda KYC Verification',
      actionRequired: 'Verify Identity',
    });

    return reqs;
  },
};
