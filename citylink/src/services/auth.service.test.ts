import AsyncStorageMock from '@react-native-async-storage/async-storage/jest/async-storage-mock';
import { sendOtp, verifyOtp } from './auth.service';
import { getClient } from './supabase';

jest.mock('@react-native-async-storage/async-storage', () => AsyncStorageMock);
jest.mock('expo-crypto', () => ({
  randomUUID: () => '00000000-0000-4000-8000-000000000000',
}));

// Mock Supabase client
jest.mock('./supabase', () => ({
  getClient: jest.fn(() => ({
    auth: {
      signInWithOtp: jest.fn(),
      verifyOtp: jest.fn(),
    },
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        in: jest.fn(() => ({
          maybeSingle: jest.fn(() => Promise.resolve({ data: { id: '123' } })),
        })),
      })),
    })),
  })),
}));

describe('Auth Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('sendOtp', () => {
    it('should validate phone format', async () => {
      const result = await sendOtp('invalid-phone');
      expect(result.success).toBe(false);
      expect(result.error).toBe('invalid-phone-format');
    });

    it('should send OTP for valid phone', async () => {
      const mockClient = getClient();
      (mockClient.auth.signInWithOtp as jest.Mock).mockResolvedValue({ error: null });

      const result = await sendOtp('+251911123456');
      expect(result.success).toBe(true);
      expect(result.error).toBeNull();
    });
  });

  describe('verifyOtp', () => {
    it('should validate phone format', async () => {
      const result = await verifyOtp('invalid-phone', '123456');
      expect(result.user).toBeNull();
      expect(result.error).toBe('invalid-phone-format');
    });

    it('should validate token format', async () => {
      const result = await verifyOtp('+251911123456', 'invalid');
      expect(result.user).toBeNull();
      expect(result.error).toBe('invalid-token-format');
    });
  });
});
