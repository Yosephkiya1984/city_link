// Fayda KYC Service - Ethiopian Digital ID Integration
// Mock implementation ready for real Fayda API integration

import AsyncStorage from '@react-native-async-storage/async-storage';
import { supaQuery } from './supabase';
import { uid } from '../utils';

// ── Fayda KYC Storage Keys ───────────────────────────────────────────────────────
const FAYDA_KYC_DATA = 'fayda_kyc_data';
const FAYDA_KYC_STATUS = 'fayda_kyc_status';
const FAYDA_TEMP_DATA = 'fayda_temp_data';

// ── Fayda KYC Types ─────────────────────────────────────────────────────────────
export interface FaydaKycData {
  fayda_id: string;
  full_name: string;
  date_of_birth: string;
  gender: 'M' | 'F';
  region: string;
  sub_city?: string;
  woreda?: string;
  house_number?: string;
  phone: string;
  email?: string;
  photo?: string;
  fingerprint_hash?: string;
  iris_hash?: string;
  verification_status: string;
  issued_date?: string | null;
  expiry_date?: string | null;
  national_id?: string;
  passport_number?: string | null;
  blood_group?: string;
  emergency_contact?: string;
  occupation?: string;
  employer?: string;
  marital_status?: string;
  education_level?: string;
  verified_at?: string;
  verification_method?: string;
  api_ready?: boolean;
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

// ── Ethiopian Fayda Mock Database (Realistic Ethiopian IDs) ───────────────────────
export const FAYDA_MOCK_DATABASE = {
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
  '2345678901234': {
    fayda_id: '2345678901234',
    full_name: 'Dawit Mengistu Tesfaye',
    date_of_birth: '1992-12-10',
    gender: 'M',
    region: 'Oromia',
    sub_city: 'Adama',
    woreda: '03',
    house_number: '9012',
    phone: '+251913456789',
    email: 'dawit.m@email.com',
    photo: 'https://api.dicebear.com/7.x/avataaars/svg?seed=dawit',
    fingerprint_hash: 'fp_hash_mno345',
    iris_hash: 'iris_hash_pqr678',
    verification_status: FAYDA_STATUS.PENDING_VERIFICATION,
    issued_date: '2024-01-10',
    expiry_date: '2034-01-10',
    national_id: 'ID456789012',
    passport_number: 'EP4567890',
    blood_group: 'B+',
    emergency_contact: '+251913210987',
    occupation: 'Teacher',
    employer: 'Adama Secondary School',
    marital_status: 'Single',
    education_level: 'Bachelors Degree',
  },
  '3456789012345': {
    fayda_id: '3456789012345',
    full_name: 'Selamawit Birhanu Kassa',
    date_of_birth: '1988-03-25',
    gender: 'F',
    region: 'Amhara',
    sub_city: 'Bahir Dar',
    woreda: '07',
    house_number: '3456',
    phone: '+251914567890',
    email: 'selam.b@email.com',
    photo: 'https://api.dicebear.com/7.x/avataaars/svg?seed=selamawit',
    fingerprint_hash: 'fp_hash_stu901',
    iris_hash: 'iris_hash_vwx234',
    verification_status: FAYDA_STATUS.REJECTED,
    issued_date: null,
    expiry_date: null,
    national_id: 'ID789012345',
    passport_number: null,
    blood_group: 'AB+',
    emergency_contact: '+251914123456',
    occupation: 'Nurse',
    employer: 'Bahir Dar Hospital',
    marital_status: 'Married',
    education_level: 'Diploma',
  },
};

// ── Fayda KYC Service Class ───────────────────────────────────────────────────────
export class FaydaKYCService {
  // Initialize KYC process
  static async initiateKYC(userData: any) {
    try {
      const tempData = {
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
    } catch (error) {
      console.error('Fayda KYC initiation error:', error);
      return {
        success: false,
        error: 'Failed to initiate KYC process',
      };
    }
  }

  // Verify Fayda ID (Mock API call)
  static async verifyFaydaID(faydaId: string, additionalData: any = {}) {
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
      const validationErrors = this.validateAdditionalData({}, additionalData);

      if (validationErrors.length > 0) {
        return {
          success: false,
          error: 'Validation failed',
          validation_errors: validationErrors,
          status: FAYDA_STATUS.REJECTED,
        };
      }

      // Create a realistic KYC profile from user's entered data
      const kycData = {
        fayda_id: faydaId,
        full_name: additionalData.full_name || 'Verified User',
        date_of_birth: additionalData.date_of_birth,
        gender: additionalData.gender || 'M',
        region: additionalData.region,
        sub_city: additionalData.sub_city || 'Unknown',
        woreda: additionalData.woreda || '01',
        house_number: additionalData.house_number || '1234',
        phone: additionalData.phone,
        email: additionalData.email || `${additionalData.phone.replace('+', '')}@email.com`,
        photo: `https://api.dicebear.com/7.x/avataaars/svg?seed=${faydaId}`,
        fingerprint_hash: `fp_hash_${faydaId.slice(-8)}`,
        iris_hash: `iris_hash_${faydaId.slice(-8)}`,
        verification_status: FAYDA_STATUS.VERIFIED,
        issued_date: new Date().toISOString().split('T')[0],
        expiry_date: new Date(Date.now() + 10 * 365 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split('T')[0], // 10 years from now
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
        api_ready: false, // Flag for real API integration
      };

      await AsyncStorage.setItem(FAYDA_KYC_DATA, JSON.stringify(kycData));
      await AsyncStorage.setItem(FAYDA_KYC_STATUS, JSON.stringify(FAYDA_STATUS.VERIFIED));
      await AsyncStorage.removeItem(FAYDA_TEMP_DATA);

      // Persist to Supabase if userId is provided
      if (additionalData.userId) {
        await supaQuery((c) =>
          c
            .from('profiles')
            .update({
              kyc_status: 'VERIFIED',
              full_name: kycData.full_name,
              is_verified: true,
              fayda_id: faydaId,
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
    } catch (error) {
      console.error('Fayda ID verification error:', error);
      return {
        success: false,
        error: 'Verification service temporarily unavailable',
        status: FAYDA_STATUS.PENDING_VERIFICATION,
      };
    }
  }

  // Get current KYC status
  static async getKYCStatus() {
    try {
      const status = await AsyncStorage.getItem(FAYDA_KYC_STATUS);
      const data = await AsyncStorage.getItem(FAYDA_KYC_DATA);
      const tempData = await AsyncStorage.getItem(FAYDA_TEMP_DATA);

      return {
        status: status ? JSON.parse(status) : FAYDA_STATUS.NOT_STARTED,
        kyc_data: data ? JSON.parse(data) : null,
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

  // Check if user can access services
  static async canAccessServices() {
    const { status } = await this.getKYCStatus();
    return status === FAYDA_STATUS.VERIFIED;
  }

  // Get KYC completion percentage
  static getKYCProgress(status: FaydaStatus) {
    const progressMap = {
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

  // Validate additional data against mock record
  static validateAdditionalData(mockRecord: any, additionalData: any) {
    const errors = [];

    // For demo purposes, accept any data - no strict validation
    // This allows users to enter their own fake data and feel the KYC experience

    // Only check if fields are filled (basic validation)
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

  // Get nearest Fayda registration centers (Mock data)
  static getRegistrationCenters(region: string = 'Addis Ababa') {
    const centers = {
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
        {
          id: '2',
          name: 'Kirkos Fayda Registration Center',
          address: 'Kirkos Sub-city, Woreda 05, near Mexico Square',
          phone: '+251119876543',
          hours: 'Mon-Fri: 8:00 AM - 5:00 PM',
          coordinates: { lat: 9.0114, lng: 38.7616 },
          services: ['Registration', 'Verification', 'Renewal'],
        },
      ],
      Oromia: [
        {
          id: '3',
          name: 'Adama Fayda Registration Center',
          address: 'Adama City, Near Adama Bus Station',
          phone: '+251221123456',
          hours: 'Mon-Fri: 8:30 AM - 4:30 PM',
          coordinates: { lat: 8.5467, lng: 39.2749 },
          services: ['Registration', 'Verification'],
        },
      ],
      Amhara: [
        {
          id: '4',
          name: 'Bahir Dar Fayda Registration Center',
          address: 'Bahir Dar City, Near Bahir Dar University',
          phone: '+251587234567',
          hours: 'Mon-Fri: 8:30 AM - 4:30 PM',
          coordinates: { lat: 11.5937, lng: 37.3875 },
          services: ['Registration', 'Verification'],
        },
      ],
    };

    return centers[region] || centers['Addis Ababa'];
  }

  // Format Fayda ID for display
  static formatFaydaID(id: string) {
    if (!id || id.length !== 13) return id;
    return `${id.slice(0, 4)} ${id.slice(4, 8)} ${id.slice(8, 13)}`;
  }

  // Validate Fayda ID format
  static validateFaydaID(id: string) {
    return /^[0-9]{13}$/.test(id);
  }

  // Clear KYC data (for testing/reset)
  static async clearKYCData() {
    try {
      await AsyncStorage.multiRemove([FAYDA_KYC_DATA, FAYDA_KYC_STATUS, FAYDA_TEMP_DATA]);
      return true;
    } catch (error) {
      console.error('Clear KYC data error:', error);
      return false;
    }
  }

  // Get KYC requirements checklist
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
      {
        id: 'biometric',
        title: 'Biometric Data',
        description: 'Fingerprint and iris scan at registration center',
        required: true,
        verified: false,
      },
      {
        id: 'address_verification',
        title: 'Address Verification',
        description: 'Proof of residence in Ethiopia',
        required: true,
        verified: false,
      },
      {
        id: 'document_verification',
        title: 'Document Verification',
        description: 'National ID or passport verification',
        required: true,
        verified: false,
      },
    ];
  }
}

// ── Real Fayda API Integration Points (Ready for production) ───────────────────────
export class FaydaAPIIntegration {
  // Production API endpoints (to be configured)
  static API_ENDPOINTS = {
    BASE_URL: 'https://api.fayda.gov.et/v1', // Real Fayda API
    VERIFY_ID: '/identity/verify',
    GET_PROFILE: '/identity/profile',
    CHECK_STATUS: '/identity/status',
    SUBMIT_KYC: '/kyc/submit',
  };

  // Real API integration method (placeholder)
  static async verifyWithRealAPI(faydaId: string, authToken: string) {
    try {
      // This would be the real API call when available
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

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Real Fayda API error:', error);
      throw error;
    }
  }
}

export default FaydaKYCService;
