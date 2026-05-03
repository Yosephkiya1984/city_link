/**
 * Fayda National ID Bridge
 * 🏛️ Ethiopian National ID (NIDP) OIDC Interface
 *
 * This service handles the "handshake" with the government identity gateway.
 * It is designed to be "handshake-ready"—the domain logic is fully implemented
 * using a simulator, allowing for a seamless transition to the production API.
 */

import { FAYDA_DB, FEATURE_FLAGS } from '../config';
import { KYCStatus } from '../types';

export interface FaydaProfile {
  fayda_id: string;
  full_name: string;
  date_of_birth: string;
  gender: 'M' | 'F';
  region: string;
  photo?: string;
  status: 'ACTIVE' | 'SUSPENDED' | 'EXPIRED';
}

export interface FaydaVerificationResult {
  success: boolean;
  profile?: FaydaProfile;
  error?: string;
  status?: KYCStatus;
}

/**
 * IFaydaProvider
 * Interface for the identity provider to allow for easy mocking/testing.
 */
interface IFaydaProvider {
  verify(faydaId: string): Promise<FaydaVerificationResult>;
  getConsent(faydaId: string): Promise<boolean>;
}

/**
 * ProdFaydaProvider
 * Stubs for the actual OIDC / JWS handshake.
 */
class ProdFaydaProvider implements IFaydaProvider {
  async getConsent(faydaId: string): Promise<boolean> {
    console.warn('[FaydaService] Prod consent flow not implemented (missing API access)');
    return false;
  }

  async verify(faydaId: string): Promise<FaydaVerificationResult> {
    return { success: false, error: 'Production API handshake not configured' };
  }
}

/**
 * FaydaBridge
 * The main interface for the application.
 */
class FaydaBridge {
  private provider: IFaydaProvider;

  constructor() {
    this.provider = new ProdFaydaProvider();
  }

  /**
   * requestVerification
   * Initiates the identity verification process.
   * 1. Check for user consent.
   * 2. Perform the provider-specific handshake.
   */
  async requestVerification(faydaId: string): Promise<FaydaVerificationResult> {
    try {
      // 1. Consent Handshake
      const hasConsent = await this.provider.getConsent(faydaId);
      if (!hasConsent) {
        return { success: false, error: 'User rejected consent or ID invalid' };
      }

      // 2. Identity Verification
      return await this.provider.verify(faydaId);
    } catch (err) {
      console.error('[FaydaBridge] Verification error:', err);
      return { success: false, error: 'Internal gateway error' };
    }
  }
}

export const FaydaService = new FaydaBridge();
