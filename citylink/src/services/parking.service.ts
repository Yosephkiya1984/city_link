import { supabase, supaQuery } from './supabase';

export async function fetchParkingLots(merchantId?: string) {
  return supaQuery((c) => {
    let query = c.from('parking_lots').select('*, parking_spots(*)');
    if (merchantId) {
      query = query.eq('merchant_id', merchantId);
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
): Promise<{ data: any; error: any }> {
  // 1. Initial State Check (Full Row Fetch)
  const { data: currentSession, error: fetchError } = await supaQuery((c) =>
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
    const balanceRes = await supabase.rpc('debit_wallet_atomic', {
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
      const { data: updateData, error: updateError } = await supaQuery((c) =>
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
      updateData.new_balance = balanceRes.data.new_balance;
      return { data: updateData, error: null };
    } catch (err) {
      console.error(`[Parking] Finalization failed | Session: ${sessionId} | Error:`, err);
      
      // 4. COMPENSATING REFUND
      const correlationId = sessionId; // Using sessionId as correlationId
      const refundRes = await supabase.rpc('credit_wallet_atomic', {
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
        const { error: dbError } = await supaQuery((c) =>
          c.from('parking_sessions').update({ 
            status: 'refund_failed',
            refund_failed: true,
            refund_error: refundRes.error
          }).eq('id', correlationId)
        );

        if (dbError) {
          console.error(`[Parking] DOUBLE_FAULT | Failed to persist refund_failed state | Session: ${correlationId} | DB Error: ${JSON.stringify(dbError)}`);
        }

        return { 
          data: null,
          error: { 
            type: 'REFUND_FAILED',
            message: 'Session finalization failed and recovery attempt also failed.',
            sessionId: correlationId,
            recovery_failed: true // Boolean flag instead of raw details
          } 
        };
      }

      // Revert status to payment_failed in the DB (Refund was successful)
      const refundKey = `REFUND-${paymentId}`;
      const { data: revertData, error: revertError } = await supaQuery((c) =>
        c
          .from('parking_sessions')
          .update({ status: 'payment_failed' })
          .eq('id', sessionId)
          .select()
          .single()
      );

      if (revertError || !revertData) {
        console.error(
          `[Parking] Revert status mismatch | Session: ${sessionId} | ` +
          `Refund Key: ${refundKey} | Refund was successful but status update failed:`,
          revertError || 'No row matched'
        );
      }

      return { 
        data: null,
        error: { 
          message: 'Session finalization failed. Payment was successfully refunded to your wallet.', 
          details: 'Internal reconciliation error', // Sanitized text
          refund_key: refundKey 
        } 
      };
    }
  }

  // Handle case with no payment (fare = 0)
  return supaQuery((c) =>
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
}

export async function fetchParkingSessions(merchantId: string) {
  return supaQuery((c) =>
    c.from('parking_sessions').select('*').eq('merchant_id', merchantId)
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
