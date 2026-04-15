import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuthStore } from '../store/AuthStore';
import { useSystemStore } from '../store/SystemStore';
import { Colors, DarkColors } from '../theme';

// Navigators
import { CitizenStack } from './CitizenStack';
import { MerchantStack } from './MerchantStack';
import { AgentStack } from './AgentStack';

// Auth & Onboarding
import AuthScreen from '../screens/core/AuthScreen';
import PendingVerificationScreen from '../screens/core/PendingVerificationScreen';
import ChatInboxScreen from '../screens/core/ChatInboxScreen';
import NotificationsScreen from '../screens/core/NotificationsScreen';
import ChatScreen from '../screens/core/ChatScreen';
import ProfileScreen from '../screens/core/ProfileScreen';
import { AdminStack } from './AdminStack';

export type AppStackParamList = {
  Auth: undefined;
  PendingVerification: undefined;
  CitizenRoot: undefined;
  MerchantRoot: undefined;
  AgentRoot: undefined;
  ChatInbox: undefined;
  Notifications: undefined;
  Chat: { threadId: string; recipientName: string; recipientId: string; propertyTitle?: string };
  Profile: undefined;
  AdminRoot: undefined;
};

export type RootStackParamList = AppStackParamList;

const RootStack = createNativeStackNavigator<RootStackParamList>();

export default function AppNavigator() {
  const currentUser = useAuthStore((s) => s.currentUser);
  const isDark = useSystemStore((s) => s.isDark);
  const C = isDark ? DarkColors : Colors;

  // Security Logic: Check if user has completed KYC
  const isVerified = currentUser?.fayda_verified || currentUser?.kyc_status === 'VERIFIED';

  return (
    <NavigationContainer
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
      <RootStack.Navigator screenOptions={{ headerShown: false, animation: 'fade' }}>
        {!currentUser ? (
          <RootStack.Screen name="Auth" component={AuthScreen} />
        ) : !isVerified && currentUser.role !== 'admin' ? (
          <RootStack.Screen name="PendingVerification" component={PendingVerificationScreen} />
        ) : (
          <>
            {currentUser.role === 'delivery_agent' ? (
              <RootStack.Screen name="AgentRoot" component={AgentStack} />
            ) : currentUser.role === 'merchant' ? (
              <RootStack.Screen name="MerchantRoot" component={MerchantStack} />
            ) : currentUser.role === 'admin' ? (
              <RootStack.Screen name="AdminRoot" component={AdminStack} />
            ) : (
              <RootStack.Screen name="CitizenRoot" component={CitizenStack} />
            )}
            
            {/* Shared Core Screens (Authenticated only) */}
            <RootStack.Screen name="ChatInbox" component={ChatInboxScreen} />
            <RootStack.Screen name="Notifications" component={NotificationsScreen} />
            <RootStack.Screen name="Chat" component={ChatScreen} />
            <RootStack.Screen name="Profile" component={ProfileScreen} />
          </>
        )}
      </RootStack.Navigator>
    </NavigationContainer>
  );
}

