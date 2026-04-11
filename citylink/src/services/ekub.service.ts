import { supaQuery } from './supabase';

/**
 * fetchEkubs — fetches all active Ekub circles.
 */
export async function fetchEkubs() {
  return supaQuery((c) =>
    c.from('ekubs').select('*').order('created_at', { ascending: false })
  );
}

/**
 * joinEkub — registers a user for a specific Ekub circle.
 */
export async function joinEkub(ekubId, userId) {
  return supaQuery((c) =>
    c.from('ekub_members').insert({ ekub_id: ekubId, user_id: userId, status: 'active' })
  );
}

/**
 * contributeToEkub — records a contribution atomically.
 */
export async function contributeToEkub(userId, ekubId, roundNumber) {
  return supaQuery((c) =>
    c.rpc('process_ekub_contribution_atomic', {
      p_user_id: userId,
      p_ekub_id: ekubId,
      p_round_number: roundNumber
    })
  );
}

/**
 * fetchMyEkubs — fetches Ekubs the user is member of.
 */
export async function fetchMyEkubs(userId) {
  return supaQuery((c) =>
    c.from('ekub_members')
      .select('*, ekubs(*)')
      .eq('user_id', userId)
  );
}
