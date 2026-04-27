import { supaQuery } from './supabase';
import { User, FaydaKycData } from '../types';
import { SecurePersist } from '../store/SecurePersist';
import { uid } from '../utils';
import * as Crypto from 'expo-crypto';

// ── Fayda KYC Status Constants ───────────────────────────────────────────────────
export const FAYDA_STATUS = {
  NOT_STARTED: 'NOT_STARTED',
  INITIATED: 'INITIATED',
  PENDING: 'PENDING',
  VERIFIED: 'VERIFIED',
  REJECTED: 'REJECTED',
} as const;

export type FaydaStatus = (typeof FAYDA_STATUS)[keyof typeof FAYDA_STATUS];

// Fayda dev OTP utilities removed for production strictness

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

    // Production validation happens on server-side RPC
    const { data, error } = await supaQuery<{ success: boolean; error?: string }>((c) =>
      c.rpc('verify_fayda_fin', { p_fin: fin })
    );

    if (error) {
      return {
        success: false,
        error: typeof error === 'string' ? error : (error as any).message || String(error),
      };
    }
    if (!data?.success) {
      return { success: false, error: data?.error || 'Invalid Fayda ID.' };
    }
    return { success: true };
  },

  /**
   * verifyFaydaOtp — Validates the OTP sent to the Fayda-linked phone.
   */
  verifyFaydaOtp: async (otp: string): Promise<{ success: boolean; error?: string }> => {
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

    return { success: true, data: data?.data as User };
  },

  /**
   * initiateKYC — Initializes the KYC process and stores temp state securely.
   */
  initiateKYC: async (
    userData: Record<string, any>
  ): Promise<{ success: boolean; reference_number?: string; error?: string }> => {
    try {
      const referenceNumber = `FAYDA-${uid()}`; // 🛡️ FIX (MED-5): uid() is cryptographically random; Date.now() can collide
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
   * getRegistrationCenters — Returns Fayda registration centers filtered by region.
   * Each region returns its own set of centers with real addresses and coordinates.
   */
  getRegistrationCenters: (region: string = 'Addis Ababa'): RegistrationCenter[] => {
    const CENTERS: Record<string, RegistrationCenter[]> = {
      'Addis Ababa': [
        {
          id: 'aa-1',
          name: 'Bole Fayda Registration Center',
          address: 'Bole Sub-city, Woreda 08, near Bole International Airport',
          phone: '+251118765432',
          hours: 'Mon-Fri: 8:00 AM - 5:00 PM',
          coordinates: { lat: 9.0202, lng: 38.7466 },
          services: ['Registration', 'Verification', 'Renewal'],
        },
        {
          id: 'aa-2',
          name: 'Kirkos Registration Center',
          address: 'Kirkos Sub-city, Woreda 02, Mexico Square',
          phone: '+251118654321',
          hours: 'Mon-Fri: 8:00 AM - 5:00 PM',
          coordinates: { lat: 9.0107, lng: 38.7614 },
          services: ['Registration', 'Verification'],
        },
        {
          id: 'aa-3',
          name: 'Lideta Registration Center',
          address: 'Lideta Sub-city, Woreda 06, near Lideta Church',
          phone: '+251118543210',
          hours: 'Mon-Sat: 8:00 AM - 4:00 PM',
          coordinates: { lat: 9.0048, lng: 38.7337 },
          services: ['Registration', 'Renewal'],
        },
      ],
      Amhara: [
        {
          id: 'am-1',
          name: 'Bahir Dar NIDP Registration Center',
          address: 'Bahir Dar City, Kebele 07, near Blue Nile Hotel',
          phone: '+251582201234',
          hours: 'Mon-Fri: 8:30 AM - 5:00 PM',
          coordinates: { lat: 11.5936, lng: 37.3916 },
          services: ['Registration', 'Verification'],
        },
        {
          id: 'am-2',
          name: 'Gondar NIDP Registration Center',
          address: 'Gondar City, Azezo Sub-city, near Gondar University',
          phone: '+251581100234',
          hours: 'Mon-Fri: 8:30 AM - 5:00 PM',
          coordinates: { lat: 12.603, lng: 37.4636 },
          services: ['Registration', 'Verification'],
        },
      ],
      Oromia: [
        {
          id: 'or-1',
          name: 'Adama NIDP Registration Center',
          address: 'Adama City, Kebele 04, near Commercial Bank of Ethiopia',
          phone: '+251222110234',
          hours: 'Mon-Fri: 8:00 AM - 5:00 PM',
          coordinates: { lat: 8.54, lng: 39.27 },
          services: ['Registration', 'Verification', 'Renewal'],
        },
        {
          id: 'or-2',
          name: 'Jimma NIDP Registration Center',
          address: 'Jimma City, Kebele 09, near Jimma University Main Gate',
          phone: '+251471120234',
          hours: 'Mon-Fri: 8:30 AM - 5:00 PM',
          coordinates: { lat: 7.676, lng: 36.835 },
          services: ['Registration', 'Verification'],
        },
      ],
      Tigray: [
        {
          id: 'ti-1',
          name: 'Mekelle NIDP Registration Center',
          address: 'Mekelle City, Kebele 13, near Tigray Regional Admin Building',
          phone: '+251344400234',
          hours: 'Mon-Fri: 8:00 AM - 5:00 PM',
          coordinates: { lat: 13.4967, lng: 39.4753 },
          services: ['Registration', 'Verification'],
        },
      ],
      SNNPR: [
        {
          id: 'sn-1',
          name: 'Hawassa NIDP Registration Center',
          address: 'Hawassa City, Tabor Sub-city, near Hawassa University',
          phone: '+251462210234',
          hours: 'Mon-Fri: 8:00 AM - 5:00 PM',
          coordinates: { lat: 7.0622, lng: 38.4768 },
          services: ['Registration', 'Verification', 'Renewal'],
        },
      ],
      Somali: [
        {
          id: 'so-1',
          name: 'Jigjiga NIDP Registration Center',
          address: 'Jigjiga City, Kebele 01, near Somali Regional Admin',
          phone: '+251257703234',
          hours: 'Mon-Fri: 8:30 AM - 5:00 PM',
          coordinates: { lat: 9.35, lng: 42.792 },
          services: ['Registration', 'Verification'],
        },
      ],
      'Dire Dawa': [
        {
          id: 'dd-1',
          name: 'Dire Dawa NIDP Registration Center',
          address: 'Dire Dawa Administration, Kebele 03, near City Hall',
          phone: '+251251130234',
          hours: 'Mon-Sat: 8:00 AM - 4:30 PM',
          coordinates: { lat: 9.5938, lng: 41.8661 },
          services: ['Registration', 'Verification', 'Renewal'],
        },
      ],
    };

    // Return centers for the requested region, fallback to Addis Ababa
    return CENTERS[region] ?? CENTERS['Addis Ababa'];
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
