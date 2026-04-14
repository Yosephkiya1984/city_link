import { getClient } from './supabase';
import { uid } from '../utils';

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

export const CREDIT_SCORE_TIERS = {
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

// Calculate credit score based on user behavior
export async function calculateCreditScore(userId: string) {
  try {
    // Check if supabase is available
    if (!getClient() || !getClient()?.from) {
      console.warn('Supabase not available, using fallback credit score');
      return {
        score: 300,
        tier: CREDIT_SCORE_TIERS.BUILDING,
        recommendations: getCreditRecommendations(300, CREDIT_SCORE_TIERS.BUILDING),
      };
    }

    // Get user's transaction history
    const { data: transactions, error: txError } = await getClient()
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(100); // Last 100 transactions

    if (txError) {
      console.warn('Transaction query error:', txError);
      return {
        score: 300,
        tier: CREDIT_SCORE_TIERS.BUILDING,
        recommendations: getCreditRecommendations(300, CREDIT_SCORE_TIERS.BUILDING),
      };
    }

    // Get user profile
    const { data: profile, error: profileError } = await getClient()
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (profileError || !profile) {
      console.warn('Profile query error:', profileError);
      return {
        score: 300,
        tier: CREDIT_SCORE_TIERS.BUILDING,
        recommendations: getCreditRecommendations(300, CREDIT_SCORE_TIERS.BUILDING),
      };
    }

    let score = 300; // Base score

    // Transaction history analysis
    const onTimePayments =
      transactions?.filter((tx) => tx.type === 'credit' && !tx.late).length || 0;

    const latePayments = transactions?.filter((tx) => tx.type === 'debit' && tx.late).length || 0;

    const insufficientFunds =
      transactions?.filter((tx) => tx.category === 'insufficient_funds').length || 0;

    const chargebacks = transactions?.filter((tx) => tx.category === 'chargeback').length || 0;

    // Calculate scores
    score += Math.min(onTimePayments * 2, 60); // Max 60 points for on-time payments
    score += Math.min((transactions?.length || 0) * 0.5, 40); // Max 40 points for frequency
    score += Math.min(calculateTransactionVolume(transactions), 30); // Max 30 points for volume

    // Account age bonus
    const accountAge = calculateAccountAge(profile.created_at);
    score += Math.min(accountAge * 2, 30); // Max 30 points for account age

    // Verification bonuses
    if (profile.fayda_verified) {
      score += CREDIT_SCORE_FACTORS.faydaVerified;
    } else if (profile.kyc_status === 'VERIFIED') {
      score += CREDIT_SCORE_FACTORS.kycVerified;
    }

    // Penalties
    score -= Math.min(latePayments * Math.abs(CREDIT_SCORE_FACTORS.latePayments), 200); // Cap penalties
    score -= Math.min(insufficientFunds * Math.abs(CREDIT_SCORE_FACTORS.insufficientFunds), 150);
    score -= Math.min(chargebacks * Math.abs(CREDIT_SCORE_FACTORS.chargebacks), 200);

    // Ensure score is within bounds
    score = Math.max(300, Math.min(850, score));

    const tier = getCreditTier(score);

    return {
      score,
      tier,
      factors: { onTimePayments, latePayments, accountAge, faydaVerified: profile.fayda_verified },
    };
  } catch (error) {
    console.error('Credit score calculation error:', error);
    // Fallback to basic score if calculation fails
    return {
      score: 300,
      tier: CREDIT_SCORE_TIERS.BUILDING,
      recommendations: getCreditRecommendations(300, CREDIT_SCORE_TIERS.BUILDING),
    };
  }
}

// Helper functions
function calculateTransactionVolume(transactions: any[]) {
  if (!transactions || transactions.length === 0) return 0;

  const totalVolume = transactions.reduce((sum: number, tx: any) => {
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

function getCreditTier(score: number) {
  if (score >= CREDIT_SCORE_TIERS.EXCELLENT.min) return CREDIT_SCORE_TIERS.EXCELLENT;
  if (score >= CREDIT_SCORE_TIERS.GOOD.min) return CREDIT_SCORE_TIERS.GOOD;
  if (score >= CREDIT_SCORE_TIERS.FAIR.min) return CREDIT_SCORE_TIERS.FAIR;
  return CREDIT_SCORE_TIERS.BUILDING;
}

// Log credit events for score calculation
export async function logCreditEvent(userId: string, eventType: string, data: any = {}) {
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
export async function updateCreditScore(userId: string, score: number, tier: any) {
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
export function getCreditRecommendations(score: number, tier: any) {
  const recommendations = [];

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

// Simulate credit score impact
export function simulateCreditScoreChange(currentScore: number, action: any) {
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
