import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAppStore } from '../store/AppStore';
import { Colors, DarkColors } from '../theme';

// Navigators
import { CitizenStack } from './CitizenStack';
import { MerchantStack } from './MerchantStack';
import { AgentStack } from './AgentStack';

// Auth & Onboarding
import AuthScreen from '../screens/core/AuthScreen';
import FaydaKYCScreen from '../screens/citizen/FaydaKYCScreen';

export type AppStackParamList = {
  Auth: undefined;
  FaydaKYC: undefined;
  CitizenRoot: undefined;
  MerchantRoot: undefined;
  AgentRoot: undefined;
};

export type RootStackParamList = AppStackParamList;

const RootStack = createNativeStackNavigator<RootStackParamList>();

export default function AppNavigator() {
  const currentUser = useAppStore((s) => s.currentUser);
  const isDark = useAppStore((s) => s.isDark);
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
        ) : !isVerified && currentUser.role === 'citizen' ? (
          <RootStack.Screen name="FaydaKYC" component={FaydaKYCScreen} />
        ) : currentUser.role === 'delivery_agent' ? (
          <RootStack.Screen name="AgentRoot" component={AgentStack} />
        ) : currentUser.role === 'merchant' ? (
          <RootStack.Screen name="MerchantRoot" component={MerchantStack} />
        ) : (
          <RootStack.Screen name="CitizenRoot" component={CitizenStack} />
        )}
      </RootStack.Navigator>
    </NavigationContainer>
  );
}

