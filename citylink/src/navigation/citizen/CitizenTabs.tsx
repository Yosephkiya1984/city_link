import React from 'react';
import { View, Text, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSystemStore } from '../../store/SystemStore';
import { Colors, DarkColors, Fonts } from '../../theme';
import { t } from '../../utils/i18n';

// Screens
import HomeScreen from '../../screens/citizen/HomeScreen';
import MarketplaceScreen from '../../screens/citizen/MarketplaceScreen';
import EkubScreen from '../../screens/citizen/EkubScreen';
import AIScreen from '../../screens/citizen/AIScreen';
import ProfileScreen from '../../screens/core/ProfileScreen';

const Tab = createBottomTabNavigator();

function TabIcon({ iconName, label, focused, C }: any) {
  return (
    <View style={{ alignItems: 'center', gap: 2 }}>
      <Ionicons
        name={focused ? iconName.replace('-outline', '') : iconName}
        size={24}
        color={focused ? C.primary : C.sub}
      />
      <Text
        style={{
          fontSize: 10,
          color: focused ? C.primary : C.sub,
          fontFamily: focused ? Fonts.bold : Fonts.medium,
        }}
      >
        {label}
      </Text>
    </View>
  );
}

export function CitizenTabs() {
  const isDark = useSystemStore((s) => s.isDark);
  const lang = useSystemStore((s) => s.lang);
  const C = isDark ? DarkColors : Colors;

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: {
          backgroundColor: C.surface,
          borderTopColor: C.edge,
          height: Platform.OS === 'ios' ? 88 : 68,
          paddingBottom: Platform.OS === 'ios' ? 28 : 12,
          borderTopWidth: 1,
          elevation: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.1,
          shadowRadius: 12,
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarIcon: (p) => <TabIcon {...p} iconName="home-outline" label={t('home')} C={C} />,
        }}
      />
      <Tab.Screen
        name="Marketplace"
        component={MarketplaceScreen}
        options={{
          tabBarIcon: (p) => (
            <TabIcon {...p} iconName="grid-outline" label={t('marketplace')} C={C} />
          ),
        }}
      />
      <Tab.Screen
        name="Ekub"
        component={EkubScreen}
        options={{
          tabBarIcon: (p) => <TabIcon {...p} iconName="people-outline" label={t('ekub')} C={C} />,
        }}
      />
      <Tab.Screen
        name="AI"
        component={AIScreen}
        options={{
          tabBarIcon: (p) => (
            <TabIcon {...p} iconName="sparkles-outline" label={t('ai_assistant')} C={C} />
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarIcon: (p) => (
            <TabIcon {...p} iconName="person-outline" label={t('profile')} C={C} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}
