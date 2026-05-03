import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import MerchantPortalScreen from '../screens/merchant/MerchantPortalScreen';
import FaydaKycScreen from '../screens/citizen/FaydaKycScreen';
import RestaurantStaffScreen from '../screens/merchant/RestaurantStaffScreen';

const Stack = createNativeStackNavigator();

export function MerchantStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MerchantDashboard" component={MerchantPortalScreen} />
      <Stack.Screen name="FaydaIdentityPortal" component={FaydaKycScreen} />
      <Stack.Screen name="ManageStaff" component={RestaurantStaffScreen} />
    </Stack.Navigator>
  );
}
