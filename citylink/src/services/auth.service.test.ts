import { sendOtp, verifyOtp } from '../services/auth.service';

// Mock Supabase client
jest.mock('../services/supabase', () => ({
  getClient: jest.fn(() => ({
    auth: {
      signInWithOtp: jest.fn(),
    },
  })),
}));

describe('Auth Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('sendOtp', () => {
    it('should send OTP successfully in production', async () => {
      // Mock production environment
      const originalDev = __DEV__;
      (global as any).__DEV__ = false;

      const mockClient = require('../services/supabase').getClient();
      mockClient.auth.signInWithOtp.mockResolvedValue({ error: null });

      const result = await sendOtp('+251911123456');

      expect(result.success).toBe(true);
      expect(result.error).toBeNull();

      (global as any).__DEV__ = originalDev;
    });

    it('should return dev OTP in development', async () => {
      const originalDev = __DEV__;
      (global as any).__DEV__ = true;

      const result = await sendOtp('+251911123456');

      expect(result.success).toBe(true);
      expect(result.devOtp).toMatch(/^\d{6}$/);

      (global as any).__DEV__ = originalDev;
    });
  });

  describe('verifyOtp', () => {
    it('should verify OTP successfully', async () => {
      const mockClient = require('../services/supabase').getClient();
      mockClient.auth.verifyOtp.mockResolvedValue({
        data: { user: { id: '123', phone: '+251911123456' } },
        error: null,
      });

      const result = await verifyOtp('+251911123456', '123456');

      expect(result.user).toBeDefined();
      expect(result.error).toBeNull();
    });
  });
});