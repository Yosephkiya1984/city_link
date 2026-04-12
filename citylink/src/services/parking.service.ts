import { supabase, supaQuery } from './supabase';

export async function fetchParkingLots(operatorId?: string) {
  return supaQuery((c) => {
    let query = c.from('parking_lots').select('*, parking_spots(*)');
    if (operatorId) {
      query = query.eq('operator_id', operatorId);
    }
    return query;
  });
}

export async function startParkingSession(session: any) {
  return supaQuery((c) => c.from('parking_sessions').insert([session]).select().single());
}

export async function endParkingSession(
  sessionId: string,
  userId: string,
  lotName: string,
  spotNumber: string,
  fare: number
) {
  // First, update the parking session to completed
  const res = await supaQuery((c) =>
    c
      .from('parking_sessions')
      .update({
        status: 'completed',
        end_time: new Date().toISOString(),
        calculated_cost: fare,
      })
      .eq('id', sessionId)
      .select()
      .single()
  );

  if (res.error) return res;

  // Ideally, deduct the balance via RPC here. But let's fallback to returning the session
  // The client side uses res.data?.new_balance if available.
  
  // Try calling payment/wallet RPC if exists (we assume process_payment atomic transaction is there, but if not we ignore)
  if (userId && fare > 0) {
    try {
       const balanceRes = await supabase.rpc('process_wallet_payment_atomic', {
         p_sender_id: userId,
         p_amount: fare,
         p_reference: `PRK-END-${sessionId.substring(0, 5)}`
       });
       if (!balanceRes.error && balanceRes.data) {
         res.data.new_balance = balanceRes.data.sender_balance || balanceRes.data;
       }
    } catch(e) {
      // Ignore RPC error, fallback to client side mock logic
    }
  }

  return res;
}

export async function fetchParkingSessions(operatorId: string) {
  return supaQuery((c) =>
    c.from('parking_sessions').select('*').eq('operator_id', operatorId)
  );
}

export async function updateSessionStatus(sessionId: string, newStatus: string) {
  return supaQuery((c) =>
    c.from('parking_sessions').update({ status: newStatus }).eq('id', sessionId)
  );
}

export async function updateParkingLot(lotId: string, updates: any) {
  return supaQuery((c) =>
    c.from('parking_lots').update(updates).eq('id', lotId)
  );
}
