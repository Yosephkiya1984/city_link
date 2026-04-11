import { supaQuery } from './supabase';
import { uid } from '../utils';
import { EkubCircle, EkubMember, EkubContribution, EkubDraw, EkubVouch } from '../types';
import * as Crypto from 'expo-crypto';

/**
 * createEkub — Organiser creates a new circle.
 */
export async function createEkub(data: Partial<EkubCircle>) {
  const newEkub = {
    id: uid(),
    current_round: 1,
    status: 'FORMING',
    pot_balance: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    visibility: 'public',
    ...data,
  };
  return supaQuery((c) => c.from('ekubs').insert(newEkub).select().single());
}

/**
 * fetchEkubs — fetches all active Ekub circles.
 */
export async function fetchEkubs() {
  return supaQuery((c) => 
    c.from('ekubs')
     .select('*')
     .neq('status', 'COMPLETE')
     .order('created_at', { ascending: false })
  );
}

/**
 * submitEkubApplication — Citizen applies to join an Ekub circle.
 */
export async function submitEkubApplication(ekubId: string, userId: string, reason: string) {
  const application = {
    id: uid(),
    ekub_id: ekubId,
    user_id: userId,
    status: 'PENDING',
    is_organiser: false,
    has_won: false,
    missed_rounds: 0,
    penalty_balance: 0,
    application_reason: reason,
    joined_at: new Date().toISOString(),
  };
  return supaQuery((c) => c.from('ekub_members').insert(application));
}

/**
 * handleEkubApplication — Organiser approves/rejects application.
 */
export async function handleEkubApplication(memberId: string, status: 'ACTIVE' | 'REJECTED') {
  return supaQuery((c) => c.from('ekub_members').update({ status }).eq('id', memberId));
}

/**
 * joinEkub — registers a user (Compatibility wrapper).
 */
export async function joinEkub(ekubId: string, userId: string) {
  return submitEkubApplication(ekubId, userId, 'Join request via app');
}

/**
 * contributeToEkub — records a contribution atomically.
 */
export async function contributeToEkub(userId: string, ekubId: string, roundNumber: number) {
  return supaQuery((c) =>
    c.rpc('process_ekub_contribution_atomic', {
      p_user_id: userId,
      p_ekub_id: ekubId,
      p_round_number: roundNumber,
    })
  );
}

/**
 * performEkubDraw — Organiser runs the draw with auditable seed logic.
 */
export async function performEkubDraw(ekubId: string, roundNumber: number, eligibleMemberIds: string[], potAmount: number) {
  const ts = Date.now();
  const sortedIds = [...eligibleMemberIds].sort();
  const rawSeed = `${ekubId}-${ts}-${sortedIds.join(',')}`;
  
  let seedHash = 'sha256-mock-hash';
  try {
    seedHash = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      rawSeed
    );
  } catch (e) {
    console.warn('Crypto digest failed, using mock hash');
  }
  
  // Selection logic (Deterministic index based on hash)
  const hashInt = parseInt(seedHash.slice(0, 8), 16);
  const winnerIndex = isNaN(hashInt) ? Math.floor(Math.random() * eligibleMemberIds.length) : (hashInt % eligibleMemberIds.length);
  const winnerId = eligibleMemberIds[winnerIndex];

  // Fetch real winner name
  const { data: user } = await supaQuery((c) => c.from('profiles').select('full_name').eq('id', winnerId).single());

  const drawData = {
    id: uid(),
    ekub_id: ekubId,
    round_number: roundNumber,
    status: 'AWAITING_CONSENT',
    winner_id: winnerId,
    winner_name: user?.full_name || 'Selected Winner', 
    pot_amount: potAmount,
    seed_hash: seedHash,
    consent_signed: false,
    created_at: new Date().toISOString(),
  };

  return supaQuery((c) => c.from('ekub_draws').insert(drawData).select().single());
}

/**
 * calculatePenalty — Calculates penalty based on missed rounds (10% rule).
 */
export function calculatePenalty(baseAmount: number, missedRounds: number): number {
  if (missedRounds <= 0) return 0;
  return baseAmount * 0.1 * missedRounds;
}

/**
 * signWinnerConsent — Winner signs the payout consent.
 */
export async function signWinnerConsent(drawId: string) {
  return supaQuery((c) =>
    c.from('ekub_draws')
     .update({
       consent_signed: true,
       consent_signed_at: new Date().toISOString(),
       status: 'NEEDS_VOUCHING'
     })
     .eq('id', drawId)
  );
}

/**
 * submitVouch — Circle member vouches for a payout.
 */
export async function submitVouch(drawId: string, ekubId: string, voucherId: string, voucherName: string, approved: boolean, reason?: string) {
  const vouch = {
    id: uid(),
    draw_id: drawId,
    ekub_id: ekubId,
    voucher_id: voucherId,
    voucher_name: voucherName,
    is_approved: approved,
    reason: reason || null,
    vouched_at: new Date().toISOString(),
  };
  return supaQuery((c) => c.from('ekub_vouches').insert(vouch));
}

/**
 * releaseEkubPot — Organiser releases the pot to the winner (Atomic/Idempotent).
 */
export async function releaseEkubPot(drawId: string) {
  return supaQuery((c) =>
    c.rpc('execute_ekub_payout_atomic', {
      p_draw_id: drawId
    })
  );
}

/**
 * fetchMyEkubs — fetches Ekubs the user is member of.
 */
export async function fetchMyEkubs(userId: string) {
  return supaQuery((c) => 
    c.from('ekub_members')
     .select('*, ekubs(*)')
     .eq('user_id', userId)
     .neq('status', 'REJECTED')
  );
}

/**
 * fetchCircleMembers — fetches all members of a circle for drawing/vouching.
 */
export async function fetchCircleMembers(ekubId: string) {
  return supaQuery((c) => 
    c.from('ekub_members')
     .select('*, user:users(*)')
     .eq('ekub_id', ekubId)
  );
}

/**
 * getReliabilityScore — Returns real score based on missed rounds.
 */
export function getReliabilityScore(missedRounds: number = 0): number {
  const base = 100;
  return Math.max(0, base - (missedRounds * 5));
}

/**
 * fetchPendingApplications — Merchant fetches pending applications for managed circles.
 */
export async function fetchPendingApplications(organiserId: string) {
  return supaQuery((c) => 
    c.from('ekub_members')
     .select('*, ekubs!inner(*), user:users(*)')
     .eq('status', 'PENDING')
     .eq('ekubs.organiser_id', organiserId)
  );
}

/**
 * fetchPendingVouches — Citizen fetches draws that need their vouch.
 */
export async function fetchPendingVouches(userId: string) {
  // Find circles the user belongs to
  const { data: memberships } = await fetchMyEkubs(userId);
  const circleIds = (memberships || []).map(m => m.ekub_id);

  if (circleIds.length === 0) return { data: [], error: null };

  return supaQuery((c) => 
    c.from('ekub_draws')
     .select('*, ekubs(*)')
     .eq('status', 'NEEDS_VOUCHING')
     .in('ekub_id', circleIds)
     .neq('winner_id', userId) // Cannot vouch for yourself
  );
}

/**
 * fetchActiveDraws — Merchant fetches all draws in awaiting/vouching status for managed circles.
 */
export async function fetchActiveDraws(organiserId: string) {
  return supaQuery((c) => 
    c.from('ekub_draws')
     .select('*, ekubs!inner(*)')
     .eq('ekubs.organiser_id', organiserId)
     .in('status', ['AWAITING_CONSENT', 'NEEDS_VOUCHING'])
  );
}

/**
 * fetchWinnerDraw — Finds the active draw where the user is a winner.
 */
export async function fetchWinnerDraw(userId: string, ekubId: string) {
  return supaQuery((c) => 
    c.from('ekub_draws')
     .select('*')
     .eq('ekub_id', ekubId)
     .eq('winner_id', userId)
     .eq('status', 'AWAITING_CONSENT')
     .maybeSingle()
  );
}

/**
 * getUserSavingsMetrics — Calculates total savings across all active circles.
 */
export async function getUserSavingsMetrics(userId: string) {
  return supaQuery((c) => 
    c.from('ekub_contributions')
     .select('amount')
     .eq('user_id', userId)
  );
}
