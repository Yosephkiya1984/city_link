import { finalizeParkingSessionLegal, startParkingSession } from './parking.service';
import { supaQuery } from './supabase';

jest.mock('./supabase', () => ({
  supaQuery: jest.fn(),
  getClient: jest.fn(),
}));

describe('Parking Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('startParkingSession', () => {
    it('should call the start_parking_session_atomic RPC', async () => {
      (supaQuery as jest.Mock).mockResolvedValue({
        data: { ok: true, session_id: 's1', pin: '1234' },
        error: null,
      });

      const res = await startParkingSession('u1', 'l1', 'sp1', 'AA-12345', 2);

      expect(supaQuery).toHaveBeenCalled();
      expect(res.data?.ok).toBe(true);
      expect(res.data?.session_id).toBe('s1');
    });
  });

  describe('finalizeParkingSessionLegal', () => {
    it('should successfully finalize session via RPC', async () => {
      (supaQuery as jest.Mock).mockResolvedValue({
        data: { ok: true, actual_cost: 45 },
        error: null,
      });

      const res = await finalizeParkingSessionLegal(
        's1',
        'WALLET',
        45,
        'valet1',
        '1234'
      );

      expect(supaQuery).toHaveBeenCalled();
      expect(res.data?.ok).toBe(true);
      expect(res.data?.actual_cost).toBe(45);
    });

    it('should handle validation errors from the RPC', async () => {
      (supaQuery as jest.Mock).mockResolvedValue({
        data: { ok: false, error: 'invalid_pin' },
        error: null,
      });

      const res = await finalizeParkingSessionLegal(
        's1',
        'WALLET',
        45,
        'valet1',
        'wrong'
      );

      expect(res.data?.ok).toBe(false);
      expect(res.data?.error).toBe('invalid_pin');
    });
  });
});
