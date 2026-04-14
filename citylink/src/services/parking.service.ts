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

export async function startParkingSession(session: Partial<ParkingSession>) {
  return supaQuery<ParkingSession>((c) => 
    c.from('parking_sessions').insert([session]).select().single()
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
  lotName: string,
  spotNumber: string,
  fare: number
): Promise<ParkingEndResult> {
  const client = getClient();
  if (!client) return { data: null, error: { message: 'Supabase client not initialized' } };

  // 1. Initial State Check (Full Row Fetch)
  const { data: currentSession, error: fetchError } = await supaQuery<ParkingSession>((c) =>
    c.from('parking_sessions').select('*').eq('id', sessionId).single()
  );

  if (fetchError || !currentSession) {
    console.error(`[Parking] Session fetch failed | Session: ${sessionId} | Error:`, fetchError);
    return { data: null, error: { message: 'Failed to retrieve parking session' } };
  }

  if (
    currentSession.status === 'completed' ||
    currentSession.status === 'payment_failed' ||
    currentSession.status === 'refund_failed'
  ) {
    return { data: currentSession, error: null };
  }

  // 2. Process Payment (with Idempotency)
  if (userId && fare > 0) {
    const paymentId = `PRK-END-${sessionId}`;
    
    // Attempt debit
    const balanceRes = await client.rpc('debit_wallet_atomic', {
      p_user_id: userId,
      p_amount: fare,
      p_description: `Parking: ${lotName} (#${spotNumber})`,
      p_category: 'parking',
      p_idempotency_key: paymentId,
    });

    if (balanceRes.error || !balanceRes.data?.ok) {
      console.error(`[Parking] Payment failed | Session: ${paymentId} | Error:`, balanceRes.error || balanceRes.data?.error);
      return { 
        data: null,
        error: { 
          message: 'Wallet transaction failed', 
          code: 'PAYMENT_ERROR'
        } 
      };
    }

    // 3. Attempt Session Update (The "Commit" phase)
    try {
      const now = new Date().toISOString();
      const { data: updateData, error: updateError } = await supaQuery<ParkingSession>((c) =>
        c
          .from('parking_sessions')
          .update({
            status: 'completed',
            end_time: now,
            calculated_cost: fare,
          })
          .eq('id', sessionId)
          .select()
          .single()
      );

      if (updateError || !updateData) throw new Error('Session update failed');

      // Success Path
      const resultData: ParkingSession = {
        ...updateData,
        new_balance: balanceRes.data.new_balance
      };
      return { data: resultData, error: null };
    } catch (err: any) {
      console.error(`[Parking] Finalization failed | Session: ${sessionId} | Error:`, err);
      
      // 4. COMPENSATING REFUND
      const correlationId = sessionId; 
      const refundRes = await client.rpc('credit_wallet_atomic', {
        p_user_id: userId,
        p_amount: fare,
        p_description: `REFUND: Parking finalization failed for ${sessionId.substring(0, 8)}`,
        p_category: 'refund',
        p_idempotency_key: `REFUND-${paymentId}`,
      });

      if (refundRes.error) {
        const errorMsg = `[Parking] REFUND_FAILED | Session: ${correlationId} | Error: ${JSON.stringify(refundRes.error)}`;
        console.error(`CRITICAL: ${errorMsg}. Manual intervention required.`);
        
        // Persist refund_failed state with raw error for reconciliation
        await supaQuery<void>((c) =>
          c.from('parking_sessions').update({ 
            status: 'refund_failed',
            refund_failed: true,
            refund_error: refundRes.error
          }).eq('id', correlationId)
        );

        return { 
          data: null,
          error: { 
            type: 'REFUND_FAILED',
            message: 'Session finalization failed and recovery attempt also failed.',
            sessionId: correlationId,
            recovery_failed: true 
          } 
        };
      }

      // Revert status to payment_failed in the DB (Refund was successful)
      const refundKey = `REFUND-${paymentId}`;
      await supaQuery<ParkingSession>((c) =>
        c
          .from('parking_sessions')
          .update({ status: 'payment_failed' })
          .eq('id', sessionId)
      );

      return { 
        data: null,
        error: { 
          message: 'Session finalization failed. Payment was successfully refunded to your wallet.', 
          details: 'Internal reconciliation error', 
          refund_key: refundKey 
        } 
      };
    }
  }

  // Handle case with no payment (fare = 0)
  const finalRes = await supaQuery<ParkingSession>((c) =>
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

  return { data: finalRes.data, error: finalRes.error ? { message: finalRes.error } : null };
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

export async function updateParkingLot(lotId: string, updates: Partial<ParkingLot>) {
  return supaQuery<ParkingLot>((c) =>
    c.from('parking_lots').update(updates).eq('id', lotId).select().single()
  );
}
