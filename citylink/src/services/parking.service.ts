import { getClient, supaQuery } from './supabase';
import { ParkingLot, ParkingSpot, ParkingSession } from '../types';

export async function fetchParkingLots(merchantId?: string) {
  return supaQuery<ParkingLot[]>((c) => {
    let query = c.from('parking_lots').select('*, parking_spots(*)');
    if (merchantId) {
      query = query.eq('merchant_id', merchantId);
    }
    return query;
  });
}

export async function startParkingSession(
  userId: string,
  lotId: string,
  spotId: string,
  vehiclePlate: string
) {
  return supaQuery<{ ok: boolean; session_id: string; error?: string }>((c) =>
    c.rpc('start_parking_session_atomic', {
      p_user_id: userId,
      p_lot_id: lotId,
      p_spot_id: spotId,
      p_vehicle_plate: vehiclePlate,
    })
  );
}

interface ParkingEndResult {
  data: ParkingSession | null;
  error: {
    message: string;
    code?: string;
    type?: string;
    sessionId?: string;
    recovery_failed?: boolean;
    refund_key?: string;
    details?: string;
  } | null;
}

export async function endParkingSession(
  sessionId: string,
  userId: string,
  fare: number
): Promise<ParkingEndResult> {
  const paymentId = `PRK-END-${sessionId}`;
  const res = await supaQuery<{ ok: boolean; new_balance: number; error?: string }>((c) =>
    c.rpc('end_parking_session_atomic', {
      p_session_id: sessionId,
      p_user_id: userId,
      p_fare: fare,
      p_idempotency_key: paymentId,
    })
  );

  if (res.error || !res.data?.ok) {
    return {
      data: null,
      error: { message: res.data?.error || res.error || 'Session finalization failed' },
    };
  }

  return {
    data: { id: sessionId, status: 'completed', new_balance: res.data.new_balance } as any,
    error: null,
  };
}

export async function fetchParkingSessions(merchantId: string) {
  return supaQuery<ParkingSession[]>((c) =>
    c.from('parking_sessions').select('*').eq('merchant_id', merchantId)
  );
}

export async function updateSessionStatus(sessionId: string, newStatus: string) {
  return supaQuery<void>((c) =>
    c.from('parking_sessions').update({ status: newStatus }).eq('id', sessionId)
  );
}

export async function finalizeParkingSessionLegal(
  sessionId: string,
  paymentMethod: 'WALLET' | 'CASH' | 'BANK_TRANSFER',
  amount: number,
  collectedById: string
) {
  return supaQuery<{ ok: boolean; error?: string; method: string }>((c) =>
    c.rpc('finalize_parking_session_legal', {
      p_session_id: sessionId,
      p_payment_method: paymentMethod,
      p_amount: amount,
      p_collected_by: collectedById,
    })
  );
}

export async function updateParkingLot(lotId: string, updates: Partial<ParkingLot>) {
  return supaQuery<ParkingLot>((c) =>
    c.from('parking_lots').update(updates).eq('id', lotId).select().single()
  );
}
