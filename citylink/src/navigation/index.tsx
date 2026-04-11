import React, { useRef, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, Animated, Pressable, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Colors, DarkColors, Radius, Shadow, Fonts, FontSize } from '../theme';
import { useAppStore } from '../store/AppStore';

// ── Core Screens ──────────────────────────────────────────────────────────────
import AuthScreen from '../screens/core/AuthScreen';
import ProfileScreen from '../screens/core/ProfileScreen';
import NotificationsScreen from '../screens/core/NotificationsScreen';
import ChatScreen from '../screens/core/ChatScreen';
import ChatInboxScreen from '../screens/core/ChatInboxScreen';
import LanguageScreen from '../screens/core/LanguageScreen';
import WalletScreen from '../screens/core/WalletScreen';
import AnalyticsScreen from '../screens/core/AnalyticsScreen';
import PerformanceProfilerScreen from '../screens/core/PerformanceProfilerScreen';

// ── Citizen Screens ───────────────────────────────────────────────────────────
import HomeScreen from '../screens/citizen/HomeScreen';
import MarketplaceScreen from '../screens/citizen/MarketplaceScreen';
import EkubScreen from '../screens/citizen/EkubScreen';
import AIScreen from '../screens/citizen/AIScreen';
import FaydaKYCScreen from '../screens/citizen/FaydaKYCScreen';
import MyOrdersScreen from '../screens/citizen/MyOrdersScreen';
import TrackOrderScreen from '../screens/citizen/TrackOrderScreen';
import SendMoneyScreen from '../screens/citizen/SendMoneyScreen';
import RequestMoneyScreen from '../screens/citizen/RequestMoneyScreen';
import QRScannerScreen from '../screens/citizen/QRScannerScreen';
import ParkingScreen from '../screens/citizen/ParkingScreen';
import DiningScreen from '../screens/citizen/DiningScreen';
import FoodScreen from '../screens/citizen/FoodScreen';
import TonightScreen from '../screens/citizen/TonightScreen';
import JobsScreen from '../screens/citizen/JobsScreen';
import CVScreen from '../screens/citizen/CVScreen';
import DelalaScreen from '../screens/citizen/DelalaScreen';
import CityServicesScreen from '../screens/citizen/CityServicesScreen';
import TransportScreen from '../screens/citizen/TransportScreen';
import MinibusScreen from '../screens/citizen/MinibusScreen';
import RailScreen from '../screens/citizen/RailScreen';
import AnbessaScreen from '../screens/citizen/AnbessaScreen';
import EmergencyScreen from '../screens/citizen/EmergencyScreen';
import ExchangeScreen from '../screens/citizen/ExchangeScreen';
import ServicesScreen from '../screens/citizen/ServicesScreen';
import BillPayScreen from '../screens/citizen/BillPayScreen';
import EducationScreen from '../screens/citizen/EducationScreen';

// ── Merchant Screens ──────────────────────────────────────────────────────────
import MerchantPortalScreen from '../screens/merchant/MerchantPortalScreen';
import BecomeMerchantScreen from '../screens/merchant/BecomeMerchantScreen';

// ── Delivery Agent Screens ────────────────────────────────────────────────────
import DeliveryAgentDashboard from '../screens/agent/DeliveryAgentDashboard';
import BecomeDeliveryAgentScreen from '../screens/agent/BecomeDeliveryAgentScreen';

// ── Admin & Authority Screens ────────────────────────────────────────────────
import AdminScreen from '../screens/admin/AdminScreen';
import StationScreen from '../screens/admin/StationScreen';
import InspectorScreen from '../screens/admin/InspectorScreen';

export type RootStackParamList = {
  Auth: undefined;
  FaydaKYC: undefined;
  Main: undefined;
  DeliveryAgentRoot: undefined;
  MerchantRoot: undefined;
  StationRoot: undefined;
  InspectorRoot: undefined;
  AdminRoot: undefined;
};

export type AppStackParamList = {
  CitizenTabs: undefined;
  Wallet: undefined;
  Parking: undefined;
  Dining: undefined;
  Food: undefined;
  Jobs: undefined;
  CV: undefined;
  Delala: undefined;
  CityServices: undefined;
  Transport: undefined;
  Minibus: undefined;
  Rail: undefined;
  Tonight: undefined;
  Emergency: undefined;
  Exchange: undefined;
  Services: undefined;
  Notifications: undefined;
  MyOrders: undefined;
  TrackOrder: undefined;
  SendMoney: undefined;
  RequestMoney: undefined;
  Merchant: undefined;
  Station: undefined;
  Inspector: undefined;
  Admin: undefined;
  QRScanner: undefined;
  FaydaKYC: undefined;
  Anbessa: undefined;
  BillPay: undefined;
  Education: undefined;
  BecomeMerchant: undefined;
  MerchantPortal: undefined;
  Language: undefined;
  Analytics: undefined;
  Profiler: undefined;
  Profile: undefined;
  Chat: { userId?: string; recipientId?: string; orderId?: string };
  ChatInbox: undefined;
  BecomeDeliveryAgent: undefined;
  DeliveryDashboard: undefined;
  MerchantDashboard: undefined;
  StationDashboard: undefined;
  InspectorDashboard: undefined;
  AdminDashboard: undefined;
};

type CitizenTabParamList = {
  Home: undefined;
  Marketplace: undefined;
  Ekub: undefined;
  AI: undefined;
  Profile: undefined;
};

const RootStack = createNativeStackNavigator<RootStackParamList>();
const AppStack = createNativeStackNavigator<AppStackParamList>();
const Tab = createBottomTabNavigator<CitizenTabParamList>();

// ── Animated Tab Icon ─────────────────────────────────────────────────────────
interface TabIconProps {
  iconName: React.ComponentProps<typeof Ionicons>['name'];
  iconNameActive?: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  focused: boolean;
  unread?: number;
  C: { primary: string; sub: string; red: string; white: string };
}

function TabIcon({ iconName, iconNameActive, label, focused, unread = 0, C }: TabIconProps) {
  const scale = useRef(new Animated.Value(1));
  const opacity = useRef(new Animated.Value(0.6));

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale.current, {
        toValue: focused ? 1.15 : 1,
        useNativeDriver: true,
        tension: 150,
        friction: 10,
      }),
      Animated.timing(opacity.current, {
        toValue: focused ? 1 : 0.6,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start();
  }, [focused]);

  return (
    <View style={{ alignItems: 'center', gap: 5, width: 60 }}>
      {/* Soft indicator dot */}
      {focused && (
        <View
          style={{
            position: 'absolute',
            top: -14,
            width: 4,
            height: 4,
            backgroundColor: C.primary,
            borderRadius: 2,
          }}
        />
      )}

      <Animated.View style={{ transform: [{ scale }], opacity }}>
        <View style={{ position: 'relative' }}>
          <Ionicons
            name={focused ? iconNameActive || iconName : iconName}
            size={24}
            color={focused ? C.primary : C.sub}
          />
          {unread > 0 && (
            <View
              style={{
                position: 'absolute',
                top: -5,
                right: -8,
                backgroundColor: C.red,
                borderRadius: 8,
                minWidth: 16,
                height: 16,
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 2,
                borderColor: C.white,
                paddingHorizontal: 2,
              }}
            >
              <Text style={{ color: C.white, fontSize: 8, fontFamily: Fonts.black }}>
                {unread > 9 ? '9+' : unread}
              </Text>
            </View>
          )}
        </View>
      </Animated.View>

      <Text
        style={{
          fontSize: 10,
          fontFamily: focused ? Fonts.bold : Fonts.medium,
          color: focused ? C.primary : C.sub,
        }}
      >
        {label}
      </Text>
    </View>
  );
}

// ── Citizen bottom tab navigator ──────────────────────────────────────────────
function CitizenTabs() {
  const isDark = useAppStore((s) => s.isDark);
  const C = isDark ? DarkColors : Colors;

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: C.surface,
          borderTopColor: C.edge,
          borderTopWidth: 1,
          height: Platform.OS === 'ios' ? 92 : 75,
          paddingBottom: Platform.OS === 'ios' ? 32 : 12,
          paddingTop: 12,
          ...Shadow.lg,
        },
        tabBarShowLabel: false,
        tabBarButton: (props) => (
          <Pressable
            {...props}
            onPress={(e) => {
              try {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              } catch (_) {}
              props.onPress?.(e);
            }}
            android_ripple={null}
            style={props.style}
          />
        ),
      })}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon
              iconName="home-outline"
              iconNameActive="home"
              label="Home"
              focused={focused}
              C={C}
            />
          ),
        }}
      />

      <Tab.Screen
        name="Marketplace"
        component={MarketplaceScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon
              iconName="grid-outline"
              iconNameActive="grid"
              label="Market"
              focused={focused}
              C={C}
            />
          ),
        }}
      />

      <Tab.Screen
        name="Ekub"
        component={EkubScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon
              iconName="people-outline"
              iconNameActive="people"
              label="Ekub"
              focused={focused}
              C={C}
            />
          ),
        }}
      />

      <Tab.Screen
        name="AI"
        component={AIScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon
              iconName="sparkles-outline"
              iconNameActive="sparkles"
              label="AI"
              focused={focused}
              C={C}
            />
          ),
        }}
      />

      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon
              iconName="person-outline"
              iconNameActive="person"
              label="Me"
              focused={focused}
              C={C}
            />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

// ── Citizen stack ─────────────────────────────────────────────────────────────
function MainStack() {
  const isDark = useAppStore((s) => s.isDark);
  const C = isDark ? DarkColors : Colors;
  return (
    <AppStack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        contentStyle: { backgroundColor: C.ink },
      }}
    >
      <AppStack.Screen name="CitizenTabs" component={CitizenTabs} />
      <AppStack.Screen name="Wallet" component={WalletScreen} />
      <AppStack.Screen name="Parking" component={ParkingScreen} />
      <AppStack.Screen name="Dining" component={DiningScreen} />
      <AppStack.Screen name="Food" component={FoodScreen} />
      <AppStack.Screen name="Jobs" component={JobsScreen} />
      <AppStack.Screen name="CV" component={CVScreen} />
      <AppStack.Screen name="Delala" component={DelalaScreen} />
      <AppStack.Screen name="CityServices" component={CityServicesScreen} />
      <AppStack.Screen name="Transport" component={TransportScreen} />
      <AppStack.Screen name="Minibus" component={MinibusScreen} />
      <AppStack.Screen name="Rail" component={RailScreen} />
      <AppStack.Screen name="Tonight" component={TonightScreen} />
      <AppStack.Screen name="Emergency" component={EmergencyScreen} />
      <AppStack.Screen name="Exchange" component={ExchangeScreen} />
      <AppStack.Screen name="Services" component={ServicesScreen} />
      <AppStack.Screen name="Notifications" component={NotificationsScreen} />
      <AppStack.Screen name="MyOrders" component={MyOrdersScreen} />
      <AppStack.Screen name="TrackOrder" component={TrackOrderScreen} />
      <AppStack.Screen name="SendMoney" component={SendMoneyScreen} />
      <AppStack.Screen name="RequestMoney" component={RequestMoneyScreen} />
      <AppStack.Screen name="Merchant" component={MerchantPortalScreen} />
      <AppStack.Screen name="Station" component={StationScreen} />
      <AppStack.Screen name="Inspector" component={InspectorScreen} />
      <AppStack.Screen name="Admin" component={AdminScreen} />
      <AppStack.Screen name="QRScanner" component={QRScannerScreen} />
      <AppStack.Screen name="FaydaKYC" component={FaydaKYCScreen} />
      <AppStack.Screen name="Anbessa" component={AnbessaScreen} />
      <AppStack.Screen name="BillPay" component={BillPayScreen} />
      <AppStack.Screen name="Education" component={EducationScreen} />
      <AppStack.Screen name="BecomeMerchant" component={BecomeMerchantScreen} />
      <AppStack.Screen name="MerchantPortal" component={MerchantPortalScreen} />
      <AppStack.Screen name="Language" component={LanguageScreen} />
      <AppStack.Screen name="Analytics" component={AnalyticsScreen} />
      <AppStack.Screen name="Profiler" component={PerformanceProfilerScreen} />
      <AppStack.Screen name="Chat" component={ChatScreen} />
      <AppStack.Screen name="ChatInbox" component={ChatInboxScreen} />
      <AppStack.Screen name="BecomeDeliveryAgent" component={BecomeDeliveryAgentScreen} />
    </AppStack.Navigator>
  );
}

// ── Delivery Agent stack ───────────────────────────────────────────────────────
function DeliveryAgentStack() {
  const isDark = useAppStore((s) => s.isDark);
  const C = isDark ? DarkColors : Colors;
  return (
    <AppStack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        contentStyle: { backgroundColor: C.ink },
      }}
    >
      <AppStack.Screen name="DeliveryDashboard" component={DeliveryAgentDashboard} />
      <AppStack.Screen name="ChatInbox" component={ChatInboxScreen} />
      <AppStack.Screen name="Chat" component={ChatScreen} />
      <AppStack.Screen name="Notifications" component={NotificationsScreen} />
      <AppStack.Screen name="Profile" component={ProfileScreen} />
      <AppStack.Screen name="Language" component={LanguageScreen} />
    </AppStack.Navigator>
  );
}

// ── Merchant stack ─────────────────────────────────────────────────────────────
function MerchantStack() {
  const isDark = useAppStore((s) => s.isDark);
  const C = isDark ? DarkColors : Colors;
  return (
    <AppStack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        contentStyle: { backgroundColor: C.ink },
      }}
    >
      <AppStack.Screen name="MerchantDashboard" component={MerchantPortalScreen} />
      <AppStack.Screen name="ChatInbox" component={ChatInboxScreen} />
      <AppStack.Screen name="Chat" component={ChatScreen} />
      <AppStack.Screen name="Notifications" component={NotificationsScreen} />
      <AppStack.Screen name="Profile" component={ProfileScreen} />
      <AppStack.Screen name="Language" component={LanguageScreen} />
    </AppStack.Navigator>
  );
}

// ── Station stack ──────────────────────────────────────────────────────────────
function StationStack() {
  const isDark = useAppStore((s) => s.isDark);
  const C = isDark ? DarkColors : Colors;
  return (
    <AppStack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        contentStyle: { backgroundColor: C.ink },
      }}
    >
      <AppStack.Screen name="StationDashboard" component={StationScreen} />
      <AppStack.Screen name="ChatInbox" component={ChatInboxScreen} />
      <AppStack.Screen name="Chat" component={ChatScreen} />
      <AppStack.Screen name="Notifications" component={NotificationsScreen} />
      <AppStack.Screen name="Profile" component={ProfileScreen} />
      <AppStack.Screen name="Language" component={LanguageScreen} />
    </AppStack.Navigator>
  );
}

// ── Inspector stack ────────────────────────────────────────────────────────────
function InspectorStack() {
  const isDark = useAppStore((s) => s.isDark);
  const C = isDark ? DarkColors : Colors;
  return (
    <AppStack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        contentStyle: { backgroundColor: C.ink },
      }}
    >
      <AppStack.Screen name="InspectorDashboard" component={InspectorScreen} />
      <AppStack.Screen name="ChatInbox" component={ChatInboxScreen} />
      <AppStack.Screen name="Chat" component={ChatScreen} />
      <AppStack.Screen name="Notifications" component={NotificationsScreen} />
      <AppStack.Screen name="Profile" component={ProfileScreen} />
      <AppStack.Screen name="Language" component={LanguageScreen} />
    </AppStack.Navigator>
  );
}

// ── Admin stack ────────────────────────────────────────────────────────────────
function AdminStack() {
  const isDark = useAppStore((s) => s.isDark);
  const C = isDark ? DarkColors : Colors;
  return (
    <AppStack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        contentStyle: { backgroundColor: C.ink },
      }}
    >
      <AppStack.Screen name="AdminDashboard" component={AdminScreen} />
      <AppStack.Screen name="ChatInbox" component={ChatInboxScreen} />
      <AppStack.Screen name="Chat" component={ChatScreen} />
      <AppStack.Screen name="Notifications" component={NotificationsScreen} />
      <AppStack.Screen name="Profile" component={ProfileScreen} />
      <AppStack.Screen name="Language" component={LanguageScreen} />
    </AppStack.Navigator>
  );
}

// ── Root navigator ────────────────────────────────────────────────────────────
export default function AppNavigator() {
  const currentUser = useAppStore((s) => s.currentUser);
  const isDark = useAppStore((s) => s.isDark);
  const C = isDark ? DarkColors : Colors;

  // Check if user has completed KYC verification
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
        ) : !isVerified ? (
          // Use KYC screens for citizens, or Auth for others (merchants handle approval in Auth)
          currentUser.role === 'citizen' ? (
            <RootStack.Screen name="FaydaKYC" component={FaydaKYCScreen} />
          ) : (
            <RootStack.Screen name="Auth" component={AuthScreen} />
          )
        ) : currentUser.role === 'delivery_agent' ? (
          <RootStack.Screen name="DeliveryAgentRoot" component={DeliveryAgentStack} />
        ) : currentUser.role === 'merchant' ? (
          <RootStack.Screen name="MerchantRoot" component={MerchantStack} />
        ) : currentUser.role === 'station' ? (
          <RootStack.Screen name="StationRoot" component={StationStack} />
        ) : currentUser.role === 'inspector' ? (
          <RootStack.Screen name="InspectorRoot" component={InspectorStack} />
        ) : currentUser.role === 'admin' ? (
          <RootStack.Screen name="AdminRoot" component={AdminStack} />
        ) : currentUser.role === 'minister' ? (
          <RootStack.Screen name="AdminRoot" component={AdminStack} />
        ) : (
          <RootStack.Screen name="Main" component={MainStack} />
        )}
      </RootStack.Navigator>
    </NavigationContainer>
  );
}
