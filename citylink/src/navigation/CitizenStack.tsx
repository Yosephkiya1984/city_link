import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { Platform, View, Text } from 'react-native';

import { useAppStore } from '../store/AppStore';
import { Colors, DarkColors, Fonts } from '../theme';

// Screens
import HomeScreen from '../screens/citizen/HomeScreen';
import MarketplaceScreen from '../screens/citizen/MarketplaceScreen';
import EkubScreen from '../screens/citizen/EkubScreen';
import AIScreen from '../screens/citizen/AIScreen';
import ProfileScreen from '../screens/core/ProfileScreen';
import WalletScreen from '../screens/core/WalletScreen';
import ParkingScreen from '../screens/citizen/ParkingScreen';
import DiningScreen from '../screens/citizen/DiningScreen';
import FoodScreen from '../screens/citizen/FoodScreen';
import JobsScreen from '../screens/citizen/JobsScreen';
import CVScreen from '../screens/citizen/CVScreen';
import TransportScreen from '../screens/citizen/TransportScreen';
import RailScreen from '../screens/citizen/RailScreen';
import TonightScreen from '../screens/citizen/TonightScreen';
import MyOrdersScreen from '../screens/citizen/MyOrdersScreen';
import SendMoneyScreen from '../screens/citizen/SendMoneyScreen';
import FaydaKYCScreen from '../screens/citizen/FaydaKYCScreen';
import ChatScreen from '../screens/core/ChatScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function TabIcon({ iconName, label, focused, C }: any) {
  return (
    <View style={{ alignItems: 'center', gap: 2 }}>
      <Ionicons name={focused ? iconName.replace('-outline', '') : iconName} size={24} color={focused ? C.primary : C.sub} />
      <Text style={{ fontSize: 10, color: focused ? C.primary : C.sub, fontFamily: focused ? Fonts.bold : Fonts.medium }}>{label}</Text>
    </View>
  );
}

function CitizenTabs() {
  const isDark = useAppStore((s) => s.isDark);
  const C = isDark ? DarkColors : Colors;

  return (
    <Tab.Navigator screenOptions={{ headerShown: false, tabBarStyle: { backgroundColor: C.surface, borderTopColor: C.edge } }}>
      <Tab.Screen name="Home" component={HomeScreen} options={{ tabBarIcon: (p) => <TabIcon {...p} iconName="home-outline" label="Home" C={C} /> }} />
      <Tab.Screen name="Market" component={MarketplaceScreen} options={{ tabBarIcon: (p) => <TabIcon {...p} iconName="grid-outline" label="Market" C={C} /> }} />
      <Tab.Screen name="Ekub" component={EkubScreen} options={{ tabBarIcon: (p) => <TabIcon {...p} iconName="people-outline" label="Ekub" C={C} /> }} />
      <Tab.Screen name="AI" component={AIScreen} options={{ tabBarIcon: (p) => <TabIcon {...p} iconName="sparkles-outline" label="AI" C={C} /> }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ tabBarIcon: (p) => <TabIcon {...p} iconName="person-outline" label="Me" C={C} /> }} />
    </Tab.Navigator>
  );
}

export function CitizenStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="CitizenTabs" component={CitizenTabs} />
      <Stack.Screen name="Wallet" component={WalletScreen} />
      <Stack.Screen name="Parking" component={ParkingScreen} />
      <Stack.Screen name="Dining" component={DiningScreen} />
      <Stack.Screen name="Food" component={FoodScreen} />
      <Stack.Screen name="Jobs" component={JobsScreen} />
      <Stack.Screen name="CV" component={CVScreen} />
      <Stack.Screen name="Transport" component={TransportScreen} />
      <Stack.Screen name="Rail" component={RailScreen} />
      <Stack.Screen name="Tonight" component={TonightScreen} />
      <Stack.Screen name="MyOrders" component={MyOrdersScreen} />
      <Stack.Screen name="SendMoney" component={SendMoneyScreen} />
      <Stack.Screen name="FaydaKYC" component={FaydaKYCScreen} />
      <Stack.Screen name="Chat" component={ChatScreen} />
    </Stack.Navigator>
  );
}
