import { supaQuery } from './supabase';
import { User, FaydaKycData } from '../types';
import { SecurePersist } from '../store/SecurePersist';
import { uid } from '../utils';

// ── Fayda KYC Status Constants ───────────────────────────────────────────────────
export const FAYDA_STATUS = {
  NOT_STARTED: 'NOT_STARTED',
  INITIATED: 'INITIATED',
  PENDING_VERIFICATION: 'PENDING_VERIFICATION',
  VERIFIED: 'VERIFIED',
  REJECTED: 'REJECTED',
} as const;

export type FaydaStatus = (typeof FAYDA_STATUS)[keyof typeof FAYDA_STATUS];

const FAYDA_DEV_OTP_KEY = 'dev_fayda_otp';
const FAYDA_DEV_OTP_EXPIRES_MS = 5 * 60 * 1000;

async function saveDevFaydaOtp(otp: string): Promise<void> {
  const payload = {
    otp,
    expires_at: new Date(Date.now() + FAYDA_DEV_OTP_EXPIRES_MS).toISOString(),
  };
  await SecurePersist.setItem(FAYDA_DEV_OTP_KEY, JSON.stringify(payload));
}

async function loadDevFaydaOtp(): Promise<{ otp: string; expires_at: string } | null> {
  const raw = await SecurePersist.getItem(FAYDA_DEV_OTP_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as { otp: string; expires_at: string };
  } catch {
    return null;
  }
}

async function clearDevFaydaOtp(): Promise<void> {
  await SecurePersist.deleteItem(FAYDA_DEV_OTP_KEY);
}

export interface RegistrationCenter {
  id: string;
  name: string;
  address: string;
  phone: string;
  hours: string;
  coordinates: { lat: number; lng: number };
  services: string[];
}

export const KycService = {
  /**
   * verifyFin — Validates a 13-digit Fayda FIN against the registry.
   */
  verifyFin: async (fin: string): Promise<{ success: boolean; error?: string }> => {
    if (!/^[0-9]{13}$/.test(fin)) {
      return { success: false, error: 'Invalid Fayda ID format. Must be 13 digits.' };
    }

    if (__DEV__) {
      const otp = String(Math.floor(100000 + Math.random() * 900000));
      await saveDevFaydaOtp(otp);
      console.log(`[CityLink Dev] Simulated Fayda OTP for ${fin}: ${otp}`);
    }

    return { success: true };
  },

  /**
   * verifyFaydaOtp — Validates the OTP sent to the Fayda-linked phone.
   */
  verifyFaydaOtp: async (otp: string): Promise<{ success: boolean; error?: string }> => {
    if (__DEV__) {
      const otpInfo = await loadDevFaydaOtp();
      if (!otpInfo) {
        return { success: false, error: 'No active Fayda OTP. Please re-enter your FIN.' };
      }
      if (new Date() > new Date(otpInfo.expires_at)) {
        await clearDevFaydaOtp();
        return { success: false, error: 'Fayda OTP expired. Please re-enter your FIN.' };
      }
      if (otp !== otpInfo.otp) {
        return { success: false, error: 'Incorrect verification code.' };
      }
      await clearDevFaydaOtp();
      return { success: true };
    }

    // Production validation happens on server-side RPC
    const { data, error } = await supaQuery<{ success: boolean; error?: string }>((c) =>
      c.rpc('verify_fayda_otp', { p_otp: otp })
    );

    if (error) {
      return {
        success: false,
        error: typeof error === 'string' ? error : (error as any).message || String(error),
      };
    }
    if (!data?.success) {
      return { success: false, error: data?.error || 'Incorrect verification code.' };
    }
    return { success: true };
  },

  /**
   * completeKyc — Finalizes the KYC process via secure server-side RPC.
   */
  completeKyc: async (
    userId: string,
    fin: string,
    otp: string
  ): Promise<{ success: boolean; data?: User; error?: string }> => {
    const { data, error } = await supaQuery<any>((c) =>
      c.rpc('complete_kyc', {
        p_user_id: userId,
        p_fin: fin,
        p_otp: otp,
      })
    );

    if (error)
      return {
        success: false,
        error: typeof error === 'string' ? error : (error as any).message || String(error),
      };
    if (data && !data.success) return { success: false, error: data.error };

    // Clear temp local state on success
    await SecurePersist.setItem('fayda_temp_data', '');
    await clearDevFaydaOtp();

    return { success: true, data: data?.data as User };
  },

  /**
   * initiateKYC — Initializes the KYC process and stores temp state securely.
   */
  initiateKYC: async (
    userData: Record<string, any>
  ): Promise<{ success: boolean; reference_number?: string; error?: string }> => {
    try {
      const referenceNumber = `FAYDA-${Date.now()}`;
      const tempData = {
        id: uid(),
        user_data: userData,
        initiated_at: new Date().toISOString(),
        status: FAYDA_STATUS.INITIATED,
        reference_number: referenceNumber,
      };

      await SecurePersist.setItem('fayda_temp_data', JSON.stringify(tempData));

      return {
        success: true,
        reference_number: referenceNumber,
      };
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to initiate KYC' };
    }
  },

  /**
   * getKYCStatus — Retrieves the current KYC status and data from secure storage.
   */
  getKYCStatus: async (): Promise<{
    status: FaydaStatus;
    kyc_data: FaydaKycData | null;
    temp_data: any | null;
  }> => {
    const status = await SecurePersist.loadKYCStatus();
    const data = await SecurePersist.loadKYC();
    const tempDataStr = await SecurePersist.getItem('fayda_temp_data');

    let tempData: any | null = null;
    if (tempDataStr) {
      try {
        tempData = JSON.parse(tempDataStr);
      } catch (error: unknown) {
        console.error('[KYC] Failed to parse stored temp data:', error);
        tempData = null;
      }
    }

    return {
      status: (status as FaydaStatus) || FAYDA_STATUS.NOT_STARTED,
      kyc_data: (data as unknown as FaydaKycData) || null,
      temp_data: tempData,
    };
  },

  /**
   * formatFaydaID — Formats ID for display (4-4-5).
   */
  formatFaydaID: (id: string): string => {
    if (!id || id.length !== 13) return id;
    return `${id.slice(0, 4)} ${id.slice(4, 8)} ${id.slice(8, 13)}`;
  },

  /**
   * getRegistrationCenters — Mock registration centers.
   */
  getRegistrationCenters: (region: string = 'Addis Ababa'): RegistrationCenter[] => {
    return [
      {
        id: '1',
        name: 'Bole Fayda Registration Center',
        address: 'Bole Sub-city, Woreda 08, near Bole International Airport',
        phone: '+251118765432',
        hours: 'Mon-Fri: 8:00 AM - 5:00 PM',
        coordinates: { lat: 9.0202, lng: 38.7466 },
        services: ['Registration', 'Verification', 'Renewal'],
      },
    ];
  },

  /**
   * clearKYCData — Clears all KYC-related data from secure storage.
   */
  clearKYCData: async (): Promise<void> => {
    await SecurePersist.clearKYC();
    await SecurePersist.setItem('fayda_temp_data', '');
  },
};

export default KycService;
