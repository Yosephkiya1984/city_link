import { useWalletStore } from '../store/WalletStore';
import { useMarketStore } from '../store/MarketStore';

export interface CreditFactors {
  ekubOnTime: number;
  walletVolume: number;
  accountAgeDays: number;
  jobsCompleted: number;
  isKycVerified: boolean;
  utilityPaymentsOnTime: number;
}

export class CreditService {
  /**
   * Calculates the CityLink Credit Score (300 - 850)
   * Ported from the HTML Gold Standard Logic
   */
  static calculateScore(factors: CreditFactors): number {
    let score = 300; // Base score

    // 1. Ekub Reliability (Max +150)
    score += Math.min(factors.ekubOnTime * 12, 150);

    // 2. Wallet Volume Utilization (Max +120)
    // Every 500 ETB in volume adds points
    score += Math.min(Math.floor(factors.walletVolume / 500), 120);

    // 3. Loyalty / Account Age (Max +100)
    // 10 points per month
    score += Math.min(Math.floor(factors.accountAgeDays / 30) * 10, 100);

    // 4. Gig Economy Participation (Max +160)
    // 40 points per completed job
    score += Math.min(factors.jobsCompleted * 40, 160);

    // 5. Digital Identity / KYC (Max +150)
    score += factors.isKycVerified ? 150 : 0;

    // 6. Utility Bill Regularity (Max +70)
    score += Math.min(factors.utilityPaymentsOnTime * 20, 70);

    return Math.min(Math.max(score, 300), 850);
  }

  /**
   * Gets the score category description
   */
  static getCategory(score: number): { label: string; color: string } {
    if (score >= 800) return { label: 'Exceptional', color: '#22C97A' };
    if (score >= 740) return { label: 'Very Good', color: '#3D8EF0' };
    if (score >= 670) return { label: 'Good', color: '#F0A830' };
    if (score >= 580) return { label: 'Fair', color: '#FF9500' };
    return { label: 'Poor', color: '#EF4444' };
  }
}
