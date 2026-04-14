// Fayda KYC Service - Ethiopian Digital ID Integration
// Mock implementation ready for real Fayda API integration

import AsyncStorage from '@react-native-async-storage/async-storage';
import { supaQuery } from './supabase';
import { SecurePersist } from '../store/SecurePersist';
import { uid } from '../utils';

// ── Fayda KYC Storage Keys ───────────────────────────────────────────────────────
const FAYDA_KYC_DATA = 'fayda_kyc_data';
const FAYDA_KYC_STATUS = 'fayda_kyc_status';
const FAYDA_TEMP_DATA = 'fayda_temp_data';

// ── Fayda KYC Types ─────────────────────────────────────────────────────────────
import { FaydaKycData, KYCStatus } from '../types';

export interface FaydaTempData {
  id: string;
  user_data: Record<string, string | number | boolean | null>;
  initiated_at: string;
  status: string;
  reference_number: string;
}

export interface FaydaAPIResponse {
  success: boolean;
  data?: any;
  error?: string;
}

// ── Fayda KYC Status Constants ───────────────────────────────────────────────────
export const FAYDA_STATUS = {
  NOT_STARTED: 'NOT_STARTED',
  INITIATED: 'INITIATED',
  PENDING_VERIFICATION: 'PENDING_VERIFICATION',
  VERIFIED: 'VERIFIED',
  REJECTED: 'REJECTED',
  EXPIRED: 'EXPIRED',
  SUSPENDED: 'SUSPENDED',
} as const;

export type FaydaStatus = (typeof FAYDA_STATUS)[keyof typeof FAYDA_STATUS];

// ── Ethiopian Fayda Mock Database — DEV ONLY ─────────────────────────────────────
export const FAYDA_MOCK_DATABASE: Record<string, FaydaKycData> = __DEV__ ? {
  // Valid Ethiopian Fayda IDs (13-digit format)
  '0123456789012': {
    fayda_id: '0123456789012',
    full_name: 'Abebe Kebede Bekele',
    date_of_birth: '1990-05-15',
    gender: 'M',
    region: 'Addis Ababa',
    sub_city: 'Bole',
    woreda: '08',
    house_number: '1234',
    phone: '+251911234567',
    email: 'abebe.kebede@email.com',
    photo: 'https://api.dicebear.com/7.x/avataaars/svg?seed=abebe',
    fingerprint_hash: 'fp_hash_abc123',
    iris_hash: 'iris_hash_def456',
    verification_status: FAYDA_STATUS.VERIFIED,
    issued_date: '2023-01-15',
    expiry_date: '2033-01-15',
    national_id: 'ID123456789',
    passport_number: 'EP1234567',
    blood_group: 'O+',
    emergency_contact: '+251911765432',
    occupation: 'Software Engineer',
    employer: 'Ethio Telecom',
    marital_status: 'Single',
    education_level: 'Bachelors Degree',
  },
  '1234567890123': {
    fayda_id: '1234567890123',
    full_name: 'Tigist Hailemariam Solomon',
    date_of_birth: '1985-08-22',
    gender: 'F',
    region: 'Addis Ababa',
    sub_city: 'Kirkos',
    woreda: '05',
    house_number: '5678',
    phone: '+251912345678',
    email: 'tigist.h@email.com',
    photo: 'https://api.dicebear.com/7.x/avataaars/svg?seed=tigist',
    fingerprint_hash: 'fp_hash_ghi789',
    iris_hash: 'iris_hash_jkl012',
    verification_status: FAYDA_STATUS.VERIFIED,
    issued_date: '2023-03-20',
    expiry_date: '2033-03-20',
    national_id: 'ID987654321',
    passport_number: 'EP9876543',
    blood_group: 'A+',
    emergency_contact: '+251912987654',
    occupation: 'Bank Manager',
    employer: 'Commercial Bank of Ethiopia',
    marital_status: 'Married',
    education_level: 'Masters Degree',
  },
} : {};

export interface RegistrationCenter {
  id: string;
  name: string;
  address: string;
  phone: string;
  hours: string;
  coordinates: { lat: number; lng: number };
  services: string[];
}

export interface KycInitiationResult {
  success: boolean;
  reference_number?: string;
  message?: string;
  next_steps?: string[];
  error?: string;
}

export interface KycVerificationResult {
  success: boolean;
  status: FaydaStatus;
  kyc_data?: FaydaKycData;
  error?: string;
  validation_errors?: string[];
  message?: string;
}

// ── Fayda KYC Service Class ───────────────────────────────────────────────────────
export class FaydaKYCService {
  /**
   * initiateKYC — Initializes the KYC process with basic user data.
   */
  static async initiateKYC(userData: Record<string, string | number | boolean | null>): Promise<KycInitiationResult> {
    try {
      const tempData: FaydaTempData = {
        id: uid(),
        user_data: userData,
        initiated_at: new Date().toISOString(),
        status: FAYDA_STATUS.INITIATED,
        reference_number: `FAYDA-${Date.now()}`,
      };

      await AsyncStorage.setItem(FAYDA_TEMP_DATA, JSON.stringify(tempData));

      // Simulate API call to Fayda system
      await new Promise((resolve) => setTimeout(resolve, 2000));

      return {
        success: true,
        reference_number: tempData.reference_number,
        message: 'KYC process initiated successfully',
        next_steps: [
          'Visit nearest Fayda registration center',
          'Bring original ID documents',
          'Complete biometric registration',
        ],
      };
    } catch (error: any) {
      console.error('Fayda KYC initiation error:', error);
      return {
        success: false,
        error: error.message || 'Failed to initiate KYC process',
      };
    }
  }

  /**
   * verifyFaydaID — Verifies the Fayda ID and persists the result to local storage and Supabase.
   */
  static async verifyFaydaID(faydaId: string, additionalData: Partial<FaydaKycData> & { userId?: string } = {}): Promise<KycVerificationResult> {
    try {
      // Simulate API call delay
      await new Promise((resolve) => setTimeout(resolve, 3000));

      // For demo purposes, accept any 13-digit Fayda ID and create a realistic profile
      if (!this.validateFaydaID(faydaId)) {
        return {
          success: false,
          error: 'Invalid Fayda ID format. Must be 13 digits.',
          status: FAYDA_STATUS.REJECTED,
        };
      }

      // Validate basic field requirements
      const validationErrors = this.validateAdditionalData(additionalData);

      if (validationErrors.length > 0) {
        return {
          success: false,
          error: 'Validation failed',
          validation_errors: validationErrors,
          status: FAYDA_STATUS.REJECTED,
        };
      }

      const kycData: FaydaKycData = {
        fayda_id: faydaId,
        full_name: additionalData.full_name || 'Verified User',
        date_of_birth: additionalData.date_of_birth || '1990-01-01',
        gender: additionalData.gender || 'M',
        region: additionalData.region || 'Addis Ababa',
        sub_city: additionalData.sub_city || 'Unknown',
        woreda: additionalData.woreda || '01',
        house_number: additionalData.house_number || '1234',
        phone: additionalData.phone || '',
        email: additionalData.email || `${additionalData.phone?.replace('+', '') || faydaId}@email.com`,
        photo: `https://api.dicebear.com/7.x/avataaars/svg?seed=${faydaId}`,
        fingerprint_hash: `fp_hash_${faydaId.slice(-8)}`,
        iris_hash: `iris_hash_${faydaId.slice(-8)}`,
        verification_status: FAYDA_STATUS.VERIFIED,
        issued_date: new Date().toISOString().split('T')[0],
        expiry_date: new Date(Date.now() + 10 * 365 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split('T')[0], 
        national_id: `ID${faydaId.slice(-9)}`,
        passport_number: `EP${faydaId.slice(-7)}`,
        blood_group: additionalData.blood_group || 'O+',
        emergency_contact: additionalData.emergency_contact || additionalData.phone,
        occupation: additionalData.occupation || 'Professional',
        employer: additionalData.employer || 'Private Sector',
        marital_status: additionalData.marital_status || 'Single',
        education_level: additionalData.education_level || 'Bachelors Degree',
        verified_at: new Date().toISOString(),
        verification_method: 'digital_verification',
        api_ready: false,
      };

      await SecurePersist.saveKYC(kycData);
      await SecurePersist.saveKYCStatus(FAYDA_STATUS.VERIFIED);
      await AsyncStorage.removeItem(FAYDA_TEMP_DATA);

      // Persist to Supabase if userId is provided
      if (additionalData.userId) {
        await supaQuery<void>((c) =>
          c
            .from('profiles')
            .update({
              kyc_status: 'VERIFIED',
              full_name: kycData.full_name,
              fayda_verified: true,
              fayda_fin: faydaId,
              updated_at: new Date().toISOString(),
            })
            .eq('id', additionalData.userId)
        );
      }

      return {
        success: true,
        status: FAYDA_STATUS.VERIFIED,
        kyc_data: kycData,
        message: `Fayda KYC verification completed successfully for ${kycData.full_name}!`,
      };
    } catch (error: any) {
      console.error('Fayda ID verification error:', error);
      return {
        success: false,
        error: error.message || 'Verification service temporarily unavailable',
        status: FAYDA_STATUS.PENDING_VERIFICATION,
      };
    }
  }

  /**
   * getKYCStatus — Retrieves the current KYC status and data.
   */
  static async getKYCStatus(): Promise<{ status: FaydaStatus; kyc_data: FaydaKycData | null; temp_data: FaydaTempData | null }> {
    try {
      const status = await SecurePersist.loadKYCStatus();
      const data = await SecurePersist.loadKYC();
      const tempData = await AsyncStorage.getItem(FAYDA_TEMP_DATA);

      return {
        status: (status as FaydaStatus) || FAYDA_STATUS.NOT_STARTED,
        kyc_data: (data as unknown as FaydaKycData) || null,
        temp_data: tempData ? JSON.parse(tempData) : null,
      };
    } catch (error) {
      console.error('Get KYC status error:', error);
      return {
        status: FAYDA_STATUS.NOT_STARTED,
        kyc_data: null,
        temp_data: null,
      };
    }
  }

  /**
   * canAccessServices — Checks if the user's KYC status is VERIFIED.
   */
  static async canAccessServices(): Promise<boolean> {
    const { status } = await this.getKYCStatus();
    return status === FAYDA_STATUS.VERIFIED;
  }

  /**
   * getKYCProgress — Returns the progress percentage for a given KYC status.
   */
  static getKYCProgress(status: FaydaStatus): number {
    const progressMap: Record<FaydaStatus, number> = {
      [FAYDA_STATUS.NOT_STARTED]: 0,
      [FAYDA_STATUS.INITIATED]: 25,
      [FAYDA_STATUS.PENDING_VERIFICATION]: 75,
      [FAYDA_STATUS.VERIFIED]: 100,
      [FAYDA_STATUS.REJECTED]: 0,
      [FAYDA_STATUS.EXPIRED]: 0,
      [FAYDA_STATUS.SUSPENDED]: 0,
    };
    return progressMap[status] || 0;
  }

  /**
   * validateAdditionalData — Validates additional KYC fields.
   */
  static validateAdditionalData(additionalData: Partial<FaydaKycData>): string[] {
    const errors: string[] = [];

    if (!additionalData.phone || additionalData.phone.trim().length < 9) {
      errors.push('Please enter a valid phone number (at least 9 digits)');
    }

    if (!additionalData.date_of_birth || additionalData.date_of_birth.length < 8) {
      errors.push('Please enter a valid date of birth (YYYY-MM-DD)');
    }

    if (!additionalData.region || additionalData.region.trim().length < 3) {
      errors.push('Please enter a valid region');
    }

    return errors;
  }

  /**
   * getRegistrationCenters — Returns a list of registration centers for a given region.
   */
  static getRegistrationCenters(region: string = 'Addis Ababa'): RegistrationCenter[] {
    const centers: Record<string, RegistrationCenter[]> = {
      'Addis Ababa': [
        {
          id: '1',
          name: 'Bole Fayda Registration Center',
          address: 'Bole Sub-city, Woreda 08, near Bole International Airport',
          phone: '+251118765432',
          hours: 'Mon-Fri: 8:00 AM - 5:00 PM',
          coordinates: { lat: 9.0202, lng: 38.7466 },
          services: ['Registration', 'Verification', 'Renewal'],
        },
      ],
      // ... (other regions can be added similarly)
    };

    return centers[region] || centers['Addis Ababa'];
  }

  /**
   * formatFaydaID — Formats the 13-digit Fayda ID for display.
   */
  static formatFaydaID(id: string): string {
    if (!id || id.length !== 13) return id;
    return `${id.slice(0, 4)} ${id.slice(4, 8)} ${id.slice(8, 13)}`;
  }

  /**
   * validateFaydaID — Validates the 13-digit Fayda ID format.
   */
  static validateFaydaID(id: string): boolean {
    return /^[0-9]{13}$/.test(id);
  }

  /**
   * clearKYCData — Clears all KYC-related data from storage.
   */
  static async clearKYCData(): Promise<boolean> {
    try {
      await SecurePersist.clearKYC();
      await AsyncStorage.removeItem(FAYDA_TEMP_DATA);
      return true;
    } catch (error) {
      console.error('Clear KYC data error:', error);
      return false;
    }
  }

  /**
   * getKYCRequirements — returns the list of requirements for KYC completion.
   */
  static getKYCRequirements() {
    return [
      {
        id: 'fayda_id',
        title: 'Fayda Digital ID',
        description: 'Valid 13-digit Fayda identification number',
        required: true,
        verified: false,
      },
      {
        id: 'phone_verification',
        title: 'Phone Verification',
        description: 'Mobile number registered with Fayda',
        required: true,
        verified: false,
      },
    ];
  }
}

/**
 * FaydaAPIIntegration — Mock production API integration endpoints.
 */
export class FaydaAPIIntegration {
  static API_ENDPOINTS = {
    BASE_URL: 'https://api.fayda.gov.et/v1',
    VERIFY_ID: '/identity/verify',
    GET_PROFILE: '/identity/profile',
    CHECK_STATUS: '/identity/status',
    SUBMIT_KYC: '/kyc/submit',
  };

  static async verifyWithRealAPI(faydaId: string, authToken: string): Promise<FaydaAPIResponse> {
    try {
      const response = await fetch(
        `${this.API_ENDPOINTS.BASE_URL}${this.API_ENDPOINTS.VERIFY_ID}`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${authToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ fayda_id: faydaId }),
        }
      );

      const data: FaydaAPIResponse = await response.json();
      return data;
    } catch (error) {
      console.error('Real Fayda API error:', error);
      throw error;
    }
  }
}

export default FaydaKYCService;
