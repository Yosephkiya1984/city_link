import React, { useEffect } from 'react';
import { NavigationContainer, LinkingOptions } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import * as Linking from 'expo-linking';
import { useAuthStore } from '../store/AuthStore';
import { useSystemStore } from '../store/SystemStore';
import { Colors, DarkColors } from '../theme';
import RealtimeService from '../services/realtime';

// Navigators
import { CitizenStack } from './CitizenStack';
import { MerchantStack } from './MerchantStack';
import { AgentStack } from './AgentStack';
import { AdminStack } from './AdminStack';

// Screens
import AuthScreen from '../screens/core/AuthScreen';
import PendingVerificationScreen from '../screens/core/PendingVerificationScreen';
import ChatInboxScreen from '../screens/core/ChatInboxScreen';
import NotificationsScreen from '../screens/core/NotificationsScreen';
import ChatScreen from '../screens/core/ChatScreen';
import ProfileScreen from '../screens/core/ProfileScreen';
import BecomeDeliveryAgentScreen from '../screens/agent/BecomeDeliveryAgentScreen';
import PaymentCallbackScreen from '../screens/core/PaymentCallbackScreen';
import DevPortalScreen from '../screens/core/DevPortalScreen';
import PerformanceProfilerScreen from '../screens/core/PerformanceProfilerScreen';
import FaydaKycScreen from '../screens/citizen/FaydaKycScreen';

export type RootStackParamList = {
  Auth: undefined;
  PendingVerification: undefined;
  CitizenRoot: undefined;
  MerchantRoot: undefined;
  AgentRoot: undefined;
  AdminRoot: undefined;
  ChatInbox: undefined;
  Notifications: undefined;
  Chat: { threadId: string; recipientName: string; recipientId: string; propertyTitle?: string };
  Profile: undefined;
  BecomeDeliveryAgent: undefined;
  PaymentCallback: { tx_ref: string };
  DevPortal: undefined;
  PerformanceProfiler: undefined;
  FaydaIdentityPortal: undefined;
};

const RootStack = createNativeStackNavigator<RootStackParamList>();

const prefix = Linking.createURL('/');

export default function AppNavigator() {
  const currentUser = useAuthStore((s) => s.currentUser);
  const uiMode = useAuthStore((s) => s.uiMode);
  
  console.log('[AppNavigator] Rendering. uiMode:', uiMode, 'isAuthenticated:', !!currentUser);
  
  const isDark = useSystemStore((s) => s.isDark);
  const C = isDark ? DarkColors : Colors;

  const linking: LinkingOptions<RootStackParamList> = {
    prefixes: [prefix, 'citylink://'],
    config: {
      screens: {
        PaymentCallback: 'payment-callback',
        CitizenRoot: 'home',
        Chat: 'chat/:threadId',
      },
    },
  };

  useEffect(() => {
    if (currentUser) {
      RealtimeService.setupUserRealtime();
      if (uiMode === 'merchant' || currentUser.role === 'merchant') RealtimeService.setupMerchantRealtime();
      if (uiMode === 'agent' || currentUser.role === 'delivery_agent') RealtimeService.setupAgentRealtime();
    } else {
      RealtimeService.cleanupRealtime();
    }
  }, [currentUser, uiMode]);

  const GOV_ROLES = new Set(['admin', 'minister', 'inspector', 'station']);
  const isGovRole = currentUser?.role ? GOV_ROLES.has(currentUser.role) : false;
  const isFaydaVerified = currentUser?.fayda_verified || currentUser?.kyc_status === 'VERIFIED';
  const canAccessApp = isFaydaVerified || isGovRole;

  return (
    <NavigationContainer
      key={uiMode}
      linking={linking}
      theme={{
        dark: isDark,
        colors: {
          primary: C.primary,
          background: C.ink,
          card: C.surface,
          text: C.text,
          border: C.edge,
          notification: C.red,
        },
      }}
    >
      <RootStack.Navigator 
        screenOptions={{ 
          headerShown: false, 
          animation: 'slide_from_right',
          gestureEnabled: true,
          fullScreenGestureEnabled: true
        }}
      >
        {!currentUser ? (
          <RootStack.Screen name="Auth" component={AuthScreen} />
        ) : !canAccessApp ? (
          <RootStack.Screen name="PendingVerification" component={PendingVerificationScreen} />
        ) : (
          <>
            {uiMode === 'agent' ? (
              <RootStack.Screen name="AgentRoot" component={AgentStack} />
            ) : uiMode === 'merchant' ? (
              <RootStack.Screen name="MerchantRoot" component={MerchantStack} />
            ) : uiMode === 'admin' && isGovRole ? (
              <RootStack.Screen name="AdminRoot" component={AdminStack} />
            ) : (
              <RootStack.Screen name="CitizenRoot" component={CitizenStack} />
            )}

            <RootStack.Screen name="ChatInbox" component={ChatInboxScreen} />
            <RootStack.Screen name="Notifications" component={NotificationsScreen} options={{ presentation: 'modal' }} />
            <RootStack.Screen name="Chat" component={ChatScreen} />
            <RootStack.Screen name="Profile" component={ProfileScreen} options={{ presentation: 'modal' }} />
            <RootStack.Screen name="BecomeDeliveryAgent" component={BecomeDeliveryAgentScreen} options={{ animation: 'slide_from_bottom' }} />
            <RootStack.Screen name="PaymentCallback" component={PaymentCallbackScreen} options={{ presentation: 'modal' }} />
            <RootStack.Screen name="FaydaIdentityPortal" component={FaydaKycScreen} options={{ presentation: 'fullScreenModal' }} />
          </>
        )}

        {/* Global Modal Screens accessible from anywhere */}
        <RootStack.Screen name="DevPortal" component={DevPortalScreen} options={{ animation: 'slide_from_bottom' }} />
        <RootStack.Screen name="PerformanceProfiler" component={PerformanceProfilerScreen} />

        {/* 🛠️ Dev-Only Direct Access (for testing nested screens without full flow) */}
        {__DEV__ && (
          <>
            <RootStack.Screen name="Wallet" component={require('../screens/core/WalletScreen').default} />
            <RootStack.Screen name="Parking" component={require('../screens/citizen/ParkingScreen').default} />
            <RootStack.Screen name="Food" component={require('../screens/citizen/FoodScreen').default} />
            <RootStack.Screen name="Delala" component={require('../screens/citizen/DelalaScreen').default} />
            <RootStack.Screen name="Marketplace" component={require('../screens/citizen/MarketplaceScreen').default} />
            
            {/* Merchant Dashboards (Direct Access) */}
            <RootStack.Screen name="ShopDashboard" component={require('../screens/merchant/ShopDashboard').default} />
            <RootStack.Screen name="RestaurantDashboard" component={require('../screens/merchant/RestaurantDashboard').default} />
            <RootStack.Screen name="DelalaDashboard" component={require('../screens/merchant/DelalaDashboard').default} />
            <RootStack.Screen name="ParkingDashboard" component={require('../screens/merchant/ParkingDashboard').default} />
            <RootStack.Screen name="EkubDashboard" component={require('../screens/merchant/EkubDashboard').default} />
            
            {/* 🛠️ Agent & Admin (Direct Access) */}
            <RootStack.Screen name="AgentDashboard" component={require('../screens/agent/DeliveryAgentDashboard').default} />
            <RootStack.Screen name="AdminDashboard" component={require('../screens/admin/AdminScreen').default} />
            <RootStack.Screen name="MerchantPortal" component={require('../screens/merchant/MerchantPortalScreen').default} />
            <RootStack.Screen name="BecomeAgent" component={require('../screens/agent/BecomeDeliveryAgentScreen').default} />
          </>
        )}
      </RootStack.Navigator>
    </NavigationContainer>
  );
}
