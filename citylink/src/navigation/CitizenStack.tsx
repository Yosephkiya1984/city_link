import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useSystemStore } from '../store/SystemStore';
import { Colors, DarkColors } from '../theme';

// Tabs
import { CitizenTabs } from './citizen/CitizenTabs';

// Screens
import WalletScreen from '../screens/core/WalletScreen';
import ParkingScreen from '../screens/citizen/ParkingScreen';
import FoodScreen from '../screens/citizen/FoodScreen';
import DelalaScreen from '../screens/citizen/DelalaScreen';
import MyOrdersScreen from '../screens/citizen/MyOrdersScreen';
import SendMoneyScreen from '../screens/citizen/SendMoneyScreen';
import CartScreen from '../screens/citizen/CartScreen';
import LanguageScreen from '../screens/core/LanguageScreen';
import FaydaKycScreen from '../screens/citizen/FaydaKycScreen';

const Stack = createNativeStackNavigator();

export function CitizenStack() {
  const isDark = useSystemStore((s) => s.isDark);
  const C = isDark ? DarkColors : Colors;

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        gestureEnabled: true,
        fullScreenGestureEnabled: true,
        contentStyle: { backgroundColor: C.ink },
      }}
    >
      <Stack.Screen name="CitizenTabs" component={CitizenTabs} />
      <Stack.Screen
        name="Wallet"
        component={WalletScreen}
        options={{ animation: 'slide_from_bottom' }}
      />
      <Stack.Screen name="Parking" component={ParkingScreen} />
      <Stack.Screen name="Food" component={FoodScreen} />
      <Stack.Screen name="Delala" component={DelalaScreen} />
      <Stack.Screen name="MyOrders" component={MyOrdersScreen} />
      <Stack.Screen
        name="SendMoney"
        component={SendMoneyScreen}
        options={{ animation: 'slide_from_bottom' }}
      />
      <Stack.Screen
        name="Cart"
        component={CartScreen}
        options={{ animation: 'slide_from_bottom' }}
      />
      <Stack.Screen name="Language" component={LanguageScreen} />
      <Stack.Screen name="FaydaKYC" component={FaydaKycScreen} />
    </Stack.Navigator>
  );
}
