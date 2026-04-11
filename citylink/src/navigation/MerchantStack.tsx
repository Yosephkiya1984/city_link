import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import MerchantPortalScreen from '../screens/merchant/MerchantPortalScreen';
import ProfileScreen from '../screens/core/ProfileScreen';
import ChatScreen from '../screens/core/ChatScreen';
import ChatInboxScreen from '../screens/core/ChatInboxScreen';
import NotificationsScreen from '../screens/core/NotificationsScreen';

const Stack = createNativeStackNavigator();

export function MerchantStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MerchantDashboard" component={MerchantPortalScreen} />
      <Stack.Screen name="Profile" component={ProfileScreen} />
      <Stack.Screen name="ChatInbox" component={ChatInboxScreen} />
      <Stack.Screen name="Chat" component={ChatScreen} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} />
    </Stack.Navigator>
  );
}
