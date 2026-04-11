import { hasSupabase, supaQuery } from './supabase';

/**
 * fetchParkingLots — fetches all parking lots, optionally filtered by operator.
 */
export async function fetchParkingLots(operatorId = null) {
  if (!hasSupabase()) {
    return { 
      data: [
        { id: 'lot1', operator_id: operatorId, name: 'Bole Parking', total_spots: 30, rate_per_hour: 25, spot_prefix: 'B' },
        { id: 'lot2', operator_id: operatorId, name: 'Megenagna Parking', total_spots: 50, rate_per_hour: 20, spot_prefix: 'M' }
      ], 
      error: null 
    };
  }
  return supaQuery((c) => {
    let query = c.from('parking_lots').select('*,parking_spots(*)');
    if (operatorId) {
      query = query.eq('operator_id', operatorId);
    }
    return query;
  });
}

/**
 * startParkingSession — starts a new parking session.
 */
export async function startParkingSession(session) {
  return supaQuery((c) => c.from('parking_sessions').insert(session).select().single());
}

/**
 * endParkingSession — ends an active parking session and atomicly deducts fare.
 */
export async function endParkingSession(sessionId, p_user_id, p_lot_name, p_spot_number, p_fare) {
  return supaQuery((c) => c.rpc('finalize_parking_session_atomic', {
    p_session_id: sessionId,
    p_user_id: p_user_id,
    p_lot_name: p_lot_name,
    p_spot_number: p_spot_number,
    p_fare: p_fare,
    p_end_time: new Date().toISOString()
  }));
}

/**
 * fetchParkingSessions — fetches parking history for an operator.
 */
export const fetchParkingSessions = async (operatorId) => {
  if (!hasSupabase()) {
    return { 
      data: [
        { id: 'session1', operator_id: operatorId, spot_id: 1, status: 'ACTIVE', start_time: new Date().toISOString(), calculated_cost: 25 },
        { id: 'session2', operator_id: operatorId, spot_id: 2, status: 'COMPLETED', start_time: new Date(Date.now() - 7200000).toISOString(), end_time: new Date().toISOString(), calculated_cost: 50 }
      ], 
      error: null 
    };
  }
  return supaQuery(client => 
    client.from('parking_sessions').select('*').eq('operator_id', operatorId).order('start_time', { ascending: false })
  );
};

/**
 * updateSessionStatus — updates status of a parking session.
 */
export const updateSessionStatus = async (sessionId, status) => {
  if (!hasSupabase()) {
    return { ok: true, error: null };
  }
  return supaQuery(client => 
    client.from('parking_sessions').update({ status }).eq('id', sessionId)
  );
};

/**
 * updateParkingLot — upserts parking lot configuration.
 */
export const updateParkingLot = async (lot) => {
  if (!hasSupabase()) {
    return { ok: true, error: null };
  }
  return supaQuery(client => 
    client.from('parking_lots').upsert(lot)
  );
};
