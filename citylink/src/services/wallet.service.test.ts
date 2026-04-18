import { fetchWalletData, processTopup, queueP2PTransfer } from './wallet.service';
import { DataEngine } from './data.engine';
import { SecurePersist } from '../store/SecurePersist';
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

jest.mock('./data.engine', () => ({
  DataEngine: {
    wallets: {
      get: jest.fn(),
      getTransactions: jest.fn(),
    },
  },
}));

jest.mock('../store/SecurePersist', () => ({
  SecurePersist: {
    setItem: jest.fn(),
    getItem: jest.fn(),
  },
}));

describe('Wallet Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('fetchWalletData', () => {
    const mockUserId = 'u1';
    const mockWallet = { id: 'w1', balance: 500, user_id: 'u1' };
    const mockTxs: any[] = [{ id: 't1', amount: 100, type: 'credit' }];

    it('should successfully fetch wallet data and cache it', async () => {
      (DataEngine.wallets.get as jest.Mock).mockResolvedValue({ data: mockWallet, error: null });
      (DataEngine.wallets.getTransactions as jest.Mock).mockResolvedValue({ data: mockTxs, error: null });

      const result = await fetchWalletData(mockUserId);

      expect(result).toEqual({
        balance: 500,
        transactions: mockTxs,
        walletId: 'w1',
      });
      expect(SecurePersist.setItem).toHaveBeenCalledWith(
        `wallet_cache_${mockUserId}`,
        JSON.stringify(result)
      );
    });

    it('should fallback to cache on error', async () => {
      (DataEngine.wallets.get as jest.Mock).mockRejectedValue(new Error('Network error'));
      (SecurePersist.getItem as jest.Mock).mockResolvedValue(
        JSON.stringify({ balance: 300, transactions: [], walletId: 'w1' })
      );

      const result = await fetchWalletData(mockUserId);

      expect(result).toEqual({
        balance: 300,
        transactions: [],
        walletId: 'w1',
      });
    });
  });

  describe('processTopup', () => {
    it('should successfully process topup', async () => {
      (supaQuery as jest.Mock).mockResolvedValue({
        data: { ok: true },
        error: null,
      });

      const success = await processTopup('u1', 100, 'telebirr');
      expect(success).toBe(true);
    });

    it('should return false on error', async () => {
      (supaQuery as jest.Mock).mockResolvedValue({
        data: null,
        error: 'topup_failed',
      });

      const success = await processTopup('u1', 100, 'telebirr');
      expect(success).toBe(false);
    });
  });

  describe('queueP2PTransfer', () => {
    it('should successfully perform transfer', async () => {
      (supaQuery as jest.Mock).mockResolvedValue({
        data: { ok: true, new_balance: 400, status: 'COMPLETED' },
        error: null,
      });

      const res = await queueP2PTransfer({
        senderId: 'u1',
        recipientPhone: '0911223344',
        amount: 100,
      });

      expect(res.ok).toBe(true);
      expect(res.newBalance).toBe(400);
      expect(res.status).toBe('COMPLETED');
    });

    it('should handle failure', async () => {
       (supaQuery as jest.Mock).mockResolvedValue({
        data: { ok: false, error: 'insufficient_funds' },
        error: null,
      });

      const res = await queueP2PTransfer({
        senderId: 'u1',
        recipientPhone: '0911223344',
        amount: 10000,
      });

      expect(res.ok).toBe(false);
      expect(res.error).toBe('insufficient_funds');
    });
  });
});
