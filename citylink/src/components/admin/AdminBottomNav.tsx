import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { Radius, Spacing, Fonts, FontSize } from '../../theme';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

import { AdminTab } from './AdminSidebar';

interface AdminBottomNavProps {
  activeTab: AdminTab | string;
  onTabChange: (tabId: AdminTab | string) => void;
}

export default function AdminBottomNav({ activeTab, onTabChange }: AdminBottomNavProps) {
  const theme = useTheme();

  const navItems = [
    { id: 'overview', label: 'Monitor', mIcon: 'view-dashboard-outline' },
    { id: 'merchants', label: 'Shops', mIcon: 'store-search-outline' },
    { id: 'drivers', label: 'Agents', mIcon: 'moped-outline' },
    { id: 'disputes', label: 'Disputes', mIcon: 'gavel' },
    { id: 'users', label: 'Identity', mIcon: 'account-group-outline' },
    { id: 'logout', label: 'Logout', mIcon: 'logout' },
  ];

  const handlePress = (id: AdminTab | string) => {
    if (id === 'logout') {
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      } catch (e) {}

      if (Platform.OS === 'web') {
        if (window.confirm('Are you sure you want to exit the admin portal?')) {
          if (onTabChange) onTabChange('logout');
        }
        return;
      }

      Alert.alert('Sign Out', 'Are you sure you want to exit the admin portal?', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: () => onTabChange && onTabChange('logout'),
        },
      ]);
    } else {
      onTabChange(id);
    }
  };

  return (
    <BlurView
      intensity={30}
      tint={theme.isDark ? 'dark' : 'light'}
      style={[
        styles.container,
        {
          borderTopWidth: 1,
          borderTopColor: theme.rim,
          backgroundColor: theme.isDark ? 'rgba(16, 19, 25, 0.85)' : 'rgba(255, 255, 255, 0.85)',
        },
      ]}
    >
      {navItems.map((item) => {
        const isActive = activeTab === item.id;
        return (
          <TouchableOpacity
            key={item.id}
            onPress={() => handlePress(item.id)}
            style={styles.navItem}
          >
            <View
              style={[
                styles.iconBox,
                {
                  backgroundColor: isActive ? theme.primary + '15' : 'transparent',
                },
              ]}
            >
              <MaterialCommunityIcons
                name={item.mIcon as any}
                size={22}
                color={item.id === 'logout' ? theme.red : isActive ? theme.primary : theme.sub}
              />
            </View>
            <Text
              style={[
                styles.navText,
                {
                  color: item.id === 'logout' ? theme.red : isActive ? theme.primary : theme.sub,
                  fontFamily: isActive ? Fonts.label : Fonts.body,
                  fontSize: 10,
                },
              ]}
            >
              {item.label.toUpperCase()}
            </Text>
            {isActive && <View style={[styles.activeDot, { backgroundColor: theme.primary }]} />}
          </TouchableOpacity>
        );
      })}
    </BlurView>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 70,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingBottom: 10,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
  },
  navItem: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: 12,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navText: {
    letterSpacing: 0.5,
  },
  activeDot: {
    position: 'absolute',
    bottom: -8,
    width: 4,
    height: 4,
    borderRadius: 2,
  },
});
