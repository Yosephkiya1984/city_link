import { getClient, supaQuery } from './supabase';
import { ParkingLot, ParkingSpot, ParkingSession } from '../types';

export async function fetchParkingLots(merchantId?: string) {
  return supaQuery<ParkingLot[]>((c) => {
    let query = c.from('parking_lots_dynamic').select('*, parking_spots(*), merchant:profiles(latitude, longitude)');
    if (merchantId) {
      query = query.eq('merchant_id', merchantId);
    }
    return query;
  });
}

export async function createParkingLot(lot: Partial<ParkingLot>) {
  return supaQuery<ParkingLot>((c) =>
    c.from('parking_lots').insert(lot).select().maybeSingle()
  );
}

export async function startParkingSession(
  userId: string,
  lotId: string,
  spotId: string,
  vehiclePlate: string,
  estimatedHours: number = 2
) {
  return supaQuery<{ ok: boolean; session_id: string; pin: string; error?: string }>((c) =>
    c.rpc('start_parking_session_atomic', {
      p_user_id: userId,
      p_lot_id: lotId,
      p_spot_id: spotId,
      p_plate: vehiclePlate,
      p_duration_hrs: estimatedHours,
    })
  );
}

export async function startParkingSessionMerchant(
  lotId: string,
  vehiclePlate: string,
  spotNumber: string = 'WALK-IN'
) {
  return supaQuery<{ ok: boolean; session_id: string; error?: string }>((c) =>
    c.rpc('start_parking_session_merchant', {
      p_lot_id: lotId,
      p_vehicle_plate: vehiclePlate,
      p_spot_number: spotNumber,
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

export async function updateSessionStatus(
  sessionId: string,
  merchantId: string,
  newStatus: string
) {
  return supaQuery<void>((c) =>
    c
      .from('parking_sessions')
      .update({ status: newStatus })
      .eq('id', sessionId)
      .eq('merchant_id', merchantId)
  );
}

export async function finalizeParkingSessionLegal(
  sessionId: string,
  paymentMethod: 'WALLET' | 'CASH' | 'BANK_TRANSFER',
  amount: number,
  collectedById: string,
  pin?: string
) {
  return supaQuery<{ ok: boolean; error?: string; actual_cost?: number }>((c) =>
    c.rpc('finalize_parking_session_legal', {
      p_session_id: sessionId,
      p_payment_method: paymentMethod,
      p_amount: amount,
      p_collected_by: collectedById,
      p_pin: pin,
    })
  );
}

export async function updateParkingLot(
  lotId: string,
  merchantId: string,
  updates: Partial<ParkingLot>
) {
  return supaQuery<ParkingLot>((c) =>
    c
      .from('parking_lots')
      .update(updates)
      .eq('id', lotId)
      .eq('merchant_id', merchantId)
      .select()
      .maybeSingle()
  );
}

export async function deleteParkingLot(lotId: string, merchantId: string) {
  return supaQuery<any>((c) =>
    c.from('parking_lots').delete().eq('id', lotId).eq('merchant_id', merchantId)
  );
}

export async function updateMerchantLocation(merchantId: string, lat: number, lng: number) {
  return supaQuery<void>((c) =>
    c
      .from('profiles')
      .update({ latitude: lat, longitude: lng, updated_at: new Date().toISOString() })
      .eq('id', merchantId)
  );
}

export async function fetchMerchantStaff(merchantId: string) {
  return supaQuery<any[]>((c) =>
    c
      .from('merchant_staff')
      .select('*, profile:profiles!merchant_staff_profile_id_fkey(*)')
      .eq('merchant_id', merchantId)
  );
}

export async function addStaffByPhone(merchantId: string, phone: string, role: string = 'valet') {
  return supaQuery<{ ok: boolean; staff_id: string; error?: string }>((c) =>
    c.rpc('add_merchant_staff_by_phone', {
      p_merchant_id: merchantId,
      p_phone: phone,
      p_role: role,
    })
  );
}

export async function updateStaffStatus(staffId: string, isOnline: boolean) {
  return supaQuery<any>((c) =>
    c
      .from('merchant_staff')
      .update({ is_online: isOnline })
      .eq('id', staffId)
  );
}

export async function revokeStaffAccess(staffId: string) {
  return supaQuery<any>((c) =>
    c
      .from('merchant_staff')
      .delete()
      .eq('id', staffId)
  );
}
