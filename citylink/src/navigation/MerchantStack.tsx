import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import MerchantPortalScreen from '../screens/merchant/MerchantPortalScreen';

const Stack = createNativeStackNavigator();

export function MerchantStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MerchantDashboard" component={MerchantPortalScreen} />
    </Stack.Navigator>
  );
}
