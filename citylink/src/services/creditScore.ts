import { getClient } from './supabase';
import { uid } from '../utils';
import { User, Transaction } from '../types';

// Credit Score System for CityLink
// Based on Ethiopian financial behavior patterns

export const CREDIT_SCORE_FACTORS = {
  // Transaction-based scoring
  onTimePayments: 30, // 30% weight
  transactionFrequency: 20, // 20% weight
  transactionVolume: 15, // 15% weight

  // Account history
  accountAge: 15, // 15% weight
  walletConsistency: 10, // 10% weight

  // Verification bonuses
  faydaVerified: 50, // +50 points
  kycVerified: 25, // +25 points

  // Penalties
  latePayments: -40, // -40 points per incident
  insufficientFunds: -30, // -30 points per incident
  chargebacks: -50, // -50 points per incident
};

export interface CreditTier {
  min: number;
  max: number;
  label: string;
  color: string;
  benefits: string[];
}

export const CREDIT_SCORE_TIERS: Record<string, CreditTier> = {
  EXCELLENT: {
    min: 750,
    max: 850,
    label: 'Excellent Credit',
    color: '#10b981',
    benefits: ['Maximum wallet limit', 'Priority support', 'Lower fees'],
  },
  GOOD: {
    min: 650,
    max: 749,
    label: 'Good Credit',
    color: '#3b82f6',
    benefits: ['High wallet limit', 'Standard support', 'Reduced fees'],
  },
  FAIR: {
    min: 550,
    max: 649,
    label: 'Fair Credit',
    color: '#f59e0b',
    benefits: ['Moderate wallet limit', 'Basic support'],
  },
  BUILDING: {
    min: 300,
    max: 549,
    label: 'Building Credit',
    color: '#ef4444',
    benefits: ['Starter wallet limit', 'Limited support'],
  },
};

export const CREDIT_EVENTS = {
  PAYMENT_SUCCESS: 'payment_success',
  PAYMENT_LATE: 'payment_late',
  INSUFFICIENT_FUNDS: 'insufficient_funds',
  CHARGEBACK: 'chargeback',
  WALLET_TOPUP: 'wallet_topup',
  REGULAR_TRANSACTION: 'regular_transaction',
  ACCOUNT_VERIFIED: 'account_verified',
  FAYDA_VERIFIED: 'fayda_verified',
};

export interface CreditRecommendation {
  type: string;
  title: string;
  description: string;
  impact: string;
  icon: string;
}

export interface CreditScoreResult {
  score: number;
  tier: CreditTier;
  recommendations?: CreditRecommendation[];
  factors?: {
    onTimePayments: number;
    latePayments: number;
    accountAge: number;
    faydaVerified?: boolean;
  };
}

// Calculate credit score using secure server-side RPC
export async function calculateCreditScore(userId: string): Promise<CreditScoreResult> {
  try {
    const client = getClient();
    if (!client) throw new Error('Supabase client not available');

    const { data: score, error } = await client.rpc('calculate_credit_score_rpc', {
      p_user_id: userId,
    });

    if (error) throw error;

    return {
      score: score || 300,
      tier: getCreditTier(score || 300),
      factors: { 
        onTimePayments: 0, // RPC should eventually return details, but for now we prioritize the score
        latePayments: 0, 
        accountAge: 0 
      },
    };
  } catch (error) {
    console.error('Credit score calculation error:', error);
    // Return last known score if possible, or building tier
    return {
      score: 300,
      tier: CREDIT_SCORE_TIERS.BUILDING,
      recommendations: getCreditRecommendations(300, CREDIT_SCORE_TIERS.BUILDING),
    };
  }
}

// Helper functions
function calculateTransactionVolume(transactions: Transaction[]) {
  if (!transactions || transactions.length === 0) return 0;

  const totalVolume = transactions.reduce((sum: number, tx: Transaction) => {
    return sum + Math.abs(tx.amount || 0);
  }, 0);

  // Scale: 0-100,000 ETB = 0-30 points
  return Math.min((totalVolume / 100000) * 30, 30);
}

function calculateAccountAge(createdAt: string) {
  if (!createdAt) return 0;

  const now = new Date();
  const created = new Date(createdAt);
  const monthsDiff =
    (now.getFullYear() - created.getFullYear()) * 12 + (now.getMonth() - created.getMonth());

  return Math.max(0, monthsDiff);
}

function getCreditTier(score: number): CreditTier {
  if (score >= CREDIT_SCORE_TIERS.EXCELLENT.min) return CREDIT_SCORE_TIERS.EXCELLENT;
  if (score >= CREDIT_SCORE_TIERS.GOOD.min) return CREDIT_SCORE_TIERS.GOOD;
  if (score >= CREDIT_SCORE_TIERS.FAIR.min) return CREDIT_SCORE_TIERS.FAIR;
  return CREDIT_SCORE_TIERS.BUILDING;
}

// Log credit events for score calculation
export async function logCreditEvent(userId: string, eventType: string, data: Record<string, any> = {}) {
  try {
    const client = getClient();
    if (!client) return;
    await client.from('credit_events').insert({
      id: uid(),
      user_id: userId,
      event_type: eventType,
      event_data: data,
      created_at: new Date().toISOString(),
    });

    // Recalculate and update credit score
    const { score, tier } = await calculateCreditScore(userId);
    await updateCreditScore(userId, score, tier);
  } catch (error) {
    console.error('Credit event logging error:', error);
  }
}

// Update user's credit score in profile
export async function updateCreditScore(userId: string, score: number, tier: CreditTier) {
  try {
    const client = getClient();
    if (!client) return;
    await client
      .from('profiles')
      .update({
        credit_score: score,
        credit_tier: tier.label,
        credit_updated_at: new Date().toISOString(),
      })
      .eq('id', userId);
  } catch (error) {
    console.error('Credit score update error:', error);
  }
}

// Get credit score recommendations
export function getCreditRecommendations(score: number, tier: CreditTier): CreditRecommendation[] {
  const recommendations: CreditRecommendation[] = [];

  if (score < 550) {
    recommendations.push({
      type: 'improve_payment_history',
      title: 'Make On-Time Payments',
      description: 'Pay bills and transactions on time to build your payment history',
      impact: '+30-50 points',
      icon: 'checkmark-circle',
    });
  }

  if (score < 650) {
    recommendations.push({
      type: 'increase_transaction_frequency',
      title: 'Use Wallet Regularly',
      description: 'Regular transactions show responsible usage',
      impact: '+20-30 points',
      icon: 'repeat',
    });
  }

  if (!tier || score < 750) {
    recommendations.push({
      type: 'verify_identity',
      title: 'Complete Fayda Verification',
      description: 'Get +50 points bonus for national ID verification',
      impact: '+50 points',
      icon: 'shield-checkmark',
    });
  }

  return recommendations;
}

export type CreditAction = 
  | { type: 'ontime_payment' }
  | { type: 'late_payment' }
  | { type: 'insufficient_funds' }
  | { type: 'fayda_verification' }
  | { type: 'monthly_transactions', count: number };

// Simulate credit score impact
export function simulateCreditScoreChange(currentScore: number, action: CreditAction) {
  let newScore = currentScore;
  let impact = '';

  switch (action.type) {
    case 'ontime_payment':
      newScore += 2;
      impact = '+2 points';
      break;
    case 'late_payment':
      newScore -= 40;
      impact = '-40 points';
      break;
    case 'insufficient_funds':
      newScore -= 30;
      impact = '-30 points';
      break;
    case 'fayda_verification':
      newScore += 50;
      impact = '+50 points';
      break;
    case 'monthly_transactions':
      newScore += Math.min(action.count * 0.5, 10);
      impact = `+${Math.min(action.count * 0.5, 10).toFixed(1)} points`;
      break;
    default:
      break;
  }

  return {
    newScore: Math.max(300, Math.min(850, newScore)),
    impact,
    tier: getCreditTier(newScore),
  };
}
