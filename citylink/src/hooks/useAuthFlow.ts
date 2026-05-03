import { useState } from 'react';
import { useAuthStore } from '../store/AuthStore';
import * as AuthService from '../services/auth.service';
import * as ProfileService from '../services/profile.service';
import * as WalletService from '../services/wallet.service';
import { normalizePhone } from '../utils';
import { User } from '../types';

export type AuthFlow = 'welcome' | 'login' | 'register' | 'otp' | 'success';
export type AuthMode = 'citizen' | 'merchant' | 'gov';

import { DEV_BYPASS_ACCOUNTS } from '../config';

// ─── Authentication Flow Hook ───────────────────────────────────────────────
// This hook manages the state and logic for the onboarding and login process.
// It relies on AuthService for Supabase Auth and ProfileService for DB profiles.

export function useAuthFlow() {
  const setCurrentUser = useAuthStore((s) => s.setCurrentUser);

  const [flow, setFlow] = useState<AuthFlow>('welcome');
  const [authMode, setAuthMode] = useState<AuthMode>('citizen');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [fullName, setFullName] = useState('');
  const [userType, setUserType] = useState<'citizen' | 'merchant'>('citizen');
  const [tempUserId, setTempUserId] = useState<string | null>(null);
  const [verifiedPhone, setVerifiedPhone] = useState<string | null>(null);
  const [registrationIntent, setRegistrationIntent] = useState(false);

  // Merchant State
  const [businessName, setBusinessName] = useState('');
  const [merchantType, setMerchantType] = useState('');
  const [tin, setTin] = useState('');
  const [licenseNo, setLicenseNo] = useState('');
  const [subcity, setSubcity] = useState('');
  const [businessAddress, setBusinessAddress] = useState('');

  // Gov State
  const [badgeId, setBadgeId] = useState('');
  const [secPin, setSecPin] = useState('');

  const handleSendOtp = async () => {
    if (!phone) return setError('Please enter a valid phone or email');
    setLoading(true);
    setError(null);
    try {
      const isEmail = phone.includes('@');
      const normalized = isEmail ? phone.trim().toLowerCase() : normalizePhone(phone);
      const { success, error: otpErr } = await AuthService.sendOtp(normalized);
      if (!success) setError(otpErr || 'Failed to send code');
      else setFlow('otp');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (otp.length < 6) return setError('Please enter the secure code');
    setLoading(true);
    setError(null);
    try {
      const isEmail = phone.includes('@');
      const normalized = isEmail ? phone.trim().toLowerCase() : normalizePhone(phone);

      // Dev-mode bypass check is handled by Supabase for registered test numbers.

      const { user, error: verifyErr } = await AuthService.verifyOtp(normalized, otp);
      if (verifyErr) setError(verifyErr);
      else if (user) {
        setTempUserId(user.id);
        setVerifiedPhone(normalized);
        const profileRes = await ProfileService.fetchProfile(user.id);
        const hasProfile = !!(profileRes.data && profileRes.data.full_name);

        if (hasProfile) {
          await setCurrentUser(profileRes.data);
        } else {
          setFlow('register');
        }
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGovLogin = async () => {
    if (!badgeId || !secPin) return setError('Badge ID and PIN are required');
    setLoading(true);
    setError(null);
    try {
      const { user, error: loginErr } = await AuthService.govBadgeLogin(badgeId, secPin);
      if (loginErr) setError(loginErr);
      else if (user) await setCurrentUser(user as User);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!fullName || !phone || !tempUserId || !verifiedPhone)
      return setError('Missing required data');
    setLoading(true);
    setError(null);
    try {
      if (userType === 'merchant') {
        await ProfileService.registerMerchant(tempUserId, {
          business_name: businessName,
          merchant_type: merchantType,
          full_name: fullName,
          phone: verifiedPhone,
          tin,
          license_no: licenseNo,
          details: { subcity, address: businessAddress },
        });
      } else {
        await ProfileService.upsertProfile({
          id: tempUserId,
          phone: verifiedPhone,
          full_name: fullName,
          role: 'citizen',
          kyc_status: 'PENDING',
        });
      }

      await WalletService.ensureWallet(tempUserId);
      await WalletService.claimWelcomeBonus(tempUserId);
      const final = await ProfileService.fetchProfile(tempUserId);
      if (final.data) await setCurrentUser(final.data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFaydaVerify = async () => {
    setLoading(true);
    try {
      // Stub for national ID verification
      await new Promise((resolve) => setTimeout(resolve, 1500));
      return { success: true };
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return {
    flow,
    setFlow,
    authMode,
    setAuthMode,
    loading,
    error,
    setError,
    phone,
    setPhone,
    otp,
    setOtp,
    fullName,
    setFullName,
    userType,
    setUserType,
    businessName,
    setBusinessName,
    merchantType,
    setMerchantType,
    tin,
    setTin,
    licenseNo,
    setLicenseNo,
    subcity,
    setSubcity,
    businessAddress,
    setBusinessAddress,
    badgeId,
    setBadgeId,
    secPin,
    setSecPin,
    handleSendOtp,
    handleVerifyOtp,
    handleGovLogin,
    handleRegister,
    handleFaydaVerify,
    setRegistrationIntent,
  };
}
