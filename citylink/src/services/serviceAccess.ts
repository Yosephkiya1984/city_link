export interface ServiceRequirement {
  id: string;
  met: boolean;
  label: string;
  actionRequired?: string;
}

export function useServiceAccess() {
  return {
    guardServiceAccess: async (serviceName: string): Promise<boolean> => {
      const bypassEnabled = process.env.CITYLINK_BYPASS_ACCESS === 'true';
      const isProduction = process.env.NODE_ENV === 'production';

      // Fail-fast: throw if bypass is enabled in production
      if (bypassEnabled && isProduction) {
        throw new Error('Service access bypass is not allowed in production environment');
      }

      // Bypass for development/testing only
      if (bypassEnabled && !isProduction) {
        return true;
      }

      // Production: perform real checks (placeholder for now)
      // TODO: Implement KYC limits, feature flags, etc.
      console.warn(`Service access check for '${serviceName}' not implemented, denying access`);
      return false;
    },
  };
}

export const ServiceAccessUtils = {
  checkAccess: async (): Promise<boolean> => {
    if (process.env.ENABLE_FAKE_ACCESS === 'true' && process.env.NODE_ENV === 'production') {
      throw new Error('ServiceAccessUtils.checkAccess: Fake access is not allowed in production');
    }
    if (process.env.ENABLE_FAKE_ACCESS === 'true') {
      console.warn('ServiceAccessUtils.checkAccess: Using fake permissive access for development');
      return true;
    }
    throw new Error(
      'ServiceAccessUtils.checkAccess: Not implemented - real access checks required'
    );
  },
  validateRequirements: async (): Promise<ServiceRequirement[]> => {
    if (process.env.ENABLE_FAKE_ACCESS === 'true' && process.env.NODE_ENV === 'production') {
      throw new Error(
        'ServiceAccessUtils.validateRequirements: Fake access is not allowed in production'
      );
    }
    if (process.env.ENABLE_FAKE_ACCESS === 'true') {
      console.warn(
        'ServiceAccessUtils.validateRequirements: Using fake empty requirements for development'
      );
      return [];
    }
    throw new Error(
      'ServiceAccessUtils.validateRequirements: Not implemented - real validation required'
    );
  },
};
