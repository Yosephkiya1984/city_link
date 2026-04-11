// Service Access Control - Fayda KYC Required
// Controls access to all CityLink services based on KYC verification status

import { FaydaKYCService, FAYDA_STATUS } from './fayda-kyc.service';
import { useAppStore } from '../store/AppStore';
import { useState, useEffect } from 'react';
import { View, Text, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { Colors, DarkColors, Radius, Shadow, Fonts } from '../theme';
import { RootStackParamList, AppStackParamList } from '../navigation';
import { NavigationProp } from '@react-navigation/native';

// ── useTheme hook ─────────────────────────────────────────────────────────────
function useTheme() {
  const isDark = useAppStore((s) => s.isDark);
  return isDark ? DarkColors : Colors;
}

// ── Service Access Control Hook ───────────────────────────────────────────────
export function useServiceAccess() {
  const currentUser = useAppStore((s) => s.currentUser);
  const showToast = useAppStore((s) => s.showToast);
  const navigation = useNavigation<NavigationProp<RootStackParamList & AppStackParamList>>();

  // Check if user can access services
  const canAccessServices = async () => {
    // If no user, cannot access
    if (!currentUser) {
      return {
        canAccess: false,
        reason: 'NO_USER',
        message: 'Please login to access services',
        action: 'login'
      };
    }

    // Check KYC status from user object (set during registration)
    const isVerified = currentUser?.fayda_verified || currentUser?.kyc_status === 'VERIFIED';
    
    if (!isVerified) {
      return {
        canAccess: false,
        reason: 'KYC_REQUIRED',
        message: 'Fayda KYC verification required to access services',
        action: 'kyc_verification',
        kycStatus: currentUser?.kyc_status || 'NONE'
      };
    }

    return {
      canAccess: true,
      reason: 'VERIFIED',
      message: 'Access granted',
      kycStatus: currentUser?.kyc_status || 'VERIFIED'
    };
  };

  // Guard function for service access
  const guardServiceAccess = async (serviceName = 'this service') => {
    const accessResult = await canAccessServices();
    
    if (!accessResult.canAccess) {
      // Show appropriate message and redirect
      switch (accessResult.reason) {
        case 'NO_USER':
          showToast('Please login to access services', 'error');
          navigation.navigate('Auth');
          break;
          
        case 'KYC_REQUIRED':
          showToast(`Fayda KYC verification required for ${serviceName}`, 'warning');
          navigation.navigate('FaydaKYC');
          break;
          
        default:
          showToast('Access denied', 'error');
      }
      
      return false;
    }
    
    return true;
  };

  return {
    canAccessServices,
    guardServiceAccess,
    isKYCVerified: async () => {
      const kycStatus = await FaydaKYCService.getKYCStatus();
      return kycStatus.status === FAYDA_STATUS.VERIFIED;
    }
  };
}

interface ServiceAccessGuardProps {
  children: React.ReactNode;
  serviceName?: string;
  fallbackComponent?: React.ReactNode;
}

// ── Service Access Wrapper Component ───────────────────────────────────────────
export function ServiceAccessGuard({ children, serviceName, fallbackComponent }: ServiceAccessGuardProps) {
  const navigation = useNavigation<NavigationProp<RootStackParamList & AppStackParamList>>();
  const { canAccessServices } = useServiceAccess();
  const [accessGranted, setAccessGranted] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAccess();
  }, []);

  const checkAccess = async () => {
    setLoading(true);
    try {
      const result = await canAccessServices();
      setAccessGranted(result.canAccess);
    } catch (error) {
      console.error('Service access check error:', error);
      setAccessGranted(false);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={useTheme().primary} />
        <Text style={{ marginTop: 16, color: useTheme().sub }}>Verifying access...</Text>
      </View>
    );
  }

  if (!accessGranted) {
    return fallbackComponent || (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        <Ionicons name="lock-closed" size={64} color={useTheme().hint} />
        <Text style={{ 
          fontSize: 18, 
          fontFamily: Fonts.black, 
          color: useTheme().text, 
          textAlign: 'center', 
          marginTop: 16 
        }}>
          Fayda KYC Required
        </Text>
        <Text style={{ 
          fontSize: 14, 
          fontFamily: Fonts.medium, 
          color: useTheme().sub, 
          textAlign: 'center', 
          marginTop: 8 
        }}>
          Complete your Fayda KYC verification to access {serviceName || 'this service'}
        </Text>
        <TouchableOpacity
          style={{
            backgroundColor: useTheme().primary,
            paddingHorizontal: 24,
            paddingVertical: 12,
            borderRadius: Radius.lg,
            marginTop: 20
          }}
          onPress={() => navigation.navigate('FaydaKYC')}
        >
          <Text style={{ color: useTheme().white, fontFamily: Fonts.bold }}>
            Complete KYC
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return children;
}

// ── Service Access HOC (Higher Order Component) ───────────────────────────────
export function withServiceAccess(WrappedComponent, serviceName) {
  return function ServiceAccessWrapper(props) {
    return (
      <ServiceAccessGuard serviceName={serviceName}>
        <WrappedComponent {...props} />
      </ServiceAccessGuard>
    );
  };
}

// ── Service Access Utilities ───────────────────────────────────────────────────
export const ServiceAccessUtils = {
  // Get user verification badge
  getVerificationBadge: async () => {
    const kycStatus = await FaydaKYCService.getKYCStatus();
    
    if (kycStatus.status === FAYDA_STATUS.VERIFIED) {
      return {
        verified: true,
        badge: '✓ Verified',
        color: '#10b981',
        icon: 'checkmark-circle'
      };
    } else {
      return {
        verified: false,
        badge: 'Unverified',
        color: '#f59e0b',
        icon: 'warning'
      };
    }
  },

  // Check if specific service requires KYC
  requiresKYC: (serviceName) => {
    // All services require KYC except basic browsing
    const kycRequiredServices = [
      'wallet', 'send_money', 'request_money', 'topup',
      'transport', 'marketplace', 'services', 'booking',
      'payments', 'shopping', 'food_delivery', 'parking'
    ];
    
    return kycRequiredServices.includes(serviceName.toLowerCase());
  },

  // Get service access message
  getAccessMessage: (serviceName, kycStatus) => {
    const messages = {
      [FAYDA_STATUS.NOT_STARTED]: {
        title: 'Fayda KYC Required',
        message: `Complete your Fayda KYC verification to access ${serviceName}`,
        action: 'Start KYC Process'
      },
      [FAYDA_STATUS.INITIATED]: {
        title: 'KYC In Progress',
        message: `Your KYC process is in progress. Visit a Fayda center to complete verification`,
        action: 'View Status'
      },
      [FAYDA_STATUS.PENDING_VERIFICATION]: {
        title: 'Verification Pending',
        message: `Your KYC verification is being processed`,
        action: 'Check Status'
      },
      [FAYDA_STATUS.VERIFIED]: {
        title: 'Access Granted',
        message: `You can access ${serviceName}`,
        action: null
      },
      [FAYDA_STATUS.REJECTED]: {
        title: 'KYC Rejected',
        message: `Your KYC verification was rejected. Please contact support`,
        action: 'Contact Support'
      }
    };
    
    return messages[kycStatus] || messages[FAYDA_STATUS.NOT_STARTED];
  }
};

export default useServiceAccess;
