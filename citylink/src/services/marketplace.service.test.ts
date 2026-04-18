import { executeMarketplacePurchase, marketplaceService } from './marketplace.service';
import { supaQuery } from './supabase';

jest.mock('./supabase', () => ({
  supaQuery: jest.fn(),
  getClient: jest.fn(),
}));

jest.mock('expo-crypto', () => ({
  randomUUID: jest.fn(() => 'test-uuid'),
}));

jest.mock('expo-haptics', () => ({
  notificationAsync: jest.fn(),
  NotificationFeedbackType: { Success: 'success', Error: 'error' },
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(() => Promise.resolve()),
  getItem: jest.fn(() => Promise.resolve(null)),
  removeItem: jest.fn(() => Promise.resolve()),
}));

describe('Marketplace Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('executeMarketplacePurchase', () => {
    const mockProduct: any = { id: 'p1', merchant_id: 'm1', price: 100 };
    const mockBuyerId = 'u1';

    it('should successfully process a purchase', async () => {
      (supaQuery as jest.Mock).mockResolvedValue({
        data: { ok: true, order_id: 'o1', total: 150 },
        error: null,
      });

      const res = await executeMarketplacePurchase({
        product: mockProduct,
        buyerId: mockBuyerId,
        qty: 1,
        address: 'Test Address',
        deliveryFee: 50,
      });

      expect(res.ok).toBe(true);
      expect(res.orderId).toBe('o1');
      expect(res.total).toBe(150);
    });

    it('should return error if RPC fails', async () => {
      (supaQuery as jest.Mock).mockResolvedValue({
        data: { ok: false, error: 'insufficient_balance' },
        error: null,
      });

      const res = await executeMarketplacePurchase({
        product: mockProduct,
        buyerId: mockBuyerId,
        qty: 1,
        address: 'Test Address',
      });

      expect(res.ok).toBe(false);
      expect(res.error).toBe('insufficient_balance');
    });

    it('should handle nested supaQuery error', async () => {
      (supaQuery as jest.Mock).mockResolvedValue({
        data: null,
        error: 'network_error',
      });

      const res = await executeMarketplacePurchase({
        product: mockProduct,
        buyerId: mockBuyerId,
        qty: 1,
        address: 'Test Address',
      });

      expect(res.ok).toBe(false);
      expect(res.error).toBe('network_error');
    });
  });

  describe('rejectDelivery', () => {
    it('should successfully reject a delivery', async () => {
       (supaQuery as jest.Mock).mockResolvedValue({
        data: { ok: true, status: 'REJECTED_BY_BUYER' },
        error: null,
      });

      const res = await marketplaceService.rejectDelivery('o1', 'u1', 'BUYER_REFUSED');

      expect(res.success).toBe(true);
      expect(res.status).toBe('REJECTED_BY_BUYER');
    });

    it('should return error when daily limit is reached', async () => {
      (supaQuery as jest.Mock).mockResolvedValue({
        data: { ok: false, error: 'daily_rejection_limit_reached' },
        error: null,
      });

      const res = await marketplaceService.rejectDelivery('o1', 'u1', 'BUYER_REFUSED');

      expect(res.success).toBe(false);
      expect(res.error).toBe('daily_rejection_limit_reached');
    });

    it('should handle transport error', async () => {
      (supaQuery as jest.Mock).mockResolvedValue({
        data: null,
        error: 'timeout',
      });

      const res = await marketplaceService.rejectDelivery('o1', 'u1', 'BUYER_REFUSED');

      expect(res.success).toBe(false);
      expect(res.error).toBe('timeout');
    });
  });

  describe('revealOrderPin', () => {
    it('should reveal the pin when correct hash is provided', async () => {
      (supaQuery as jest.Mock).mockResolvedValue({
        data: { ok: true, delivery_pin: '1234' },
        error: null,
      });

      const res = await marketplaceService.revealOrderPin('o1', 'valid_hash');

      expect(res.data?.ok).toBe(true);
      expect(res.data?.delivery_pin).toBe('1234');
    });

    it('should fail with invalid wallet pin', async () => {
      (supaQuery as jest.Mock).mockResolvedValue({
        data: { ok: false, error: 'invalid_wallet_pin' },
        error: null,
      });

      const res = await marketplaceService.revealOrderPin('o1', 'invalid_hash');

      expect(res.data?.ok).toBe(false);
      expect(res.data?.error).toBe('invalid_wallet_pin');
    });
  });
});
