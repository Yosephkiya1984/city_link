import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AdminScreen from '../screens/admin/AdminScreen';
import FaydaKycScreen from '../screens/citizen/FaydaKycScreen';

export type AdminStackParamList = {
  AdminDashboard: undefined;
  FaydaIdentityPortal: undefined;
};

const Stack = createNativeStackNavigator<AdminStackParamList>();

export const AdminStack = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, animation: 'fade' }}>
      <Stack.Screen name="AdminDashboard" component={AdminScreen} />
      <Stack.Screen name="FaydaIdentityPortal" component={FaydaKycScreen} />
    </Stack.Navigator>
  );
};
