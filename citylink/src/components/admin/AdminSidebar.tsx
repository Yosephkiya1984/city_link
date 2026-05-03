import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  StyleSheet,
  Dimensions,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { Radius, Spacing, Fonts, FontSize } from '../../theme';
import { useAuthStore } from '../../store/AuthStore';
import * as Haptics from 'expo-haptics';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const IS_TABLET = SCREEN_WIDTH > 768;

import { t } from '../../utils/i18n';

export type AdminTab =
  | 'overview'
  | 'merchants'
  | 'drivers'
  | 'disputes'
  | 'users'
  | 'finance'
  | 'logs'
  | 'systems';

interface AdminSidebarProps {
  activeTab: AdminTab | string;
  onTabChange: (tabId: string) => void;
  isCollapsed: boolean;
  toggleCollapse: () => void;
}

export default function AdminSidebar({
  activeTab,
  onTabChange,
  isCollapsed,
  toggleCollapse,
}: AdminSidebarProps) {
  const theme = useTheme();
  const resetStore = useAuthStore((s) => s.reset);

  const navItems = [
    {
      id: 'overview',
      label: t('admin_monitor'),
      icon: 'grid-outline',
      mIcon: 'view-dashboard-outline',
    },
    {
      id: 'merchants',
      label: t('admin_shops'),
      icon: 'checkmark-circle-outline',
      mIcon: 'store-search-outline',
    },
    { id: 'drivers', label: t('admin_agents'), icon: 'bicycle-outline', mIcon: 'moped-outline' },
    { id: 'disputes', label: t('admin_disputes'), icon: 'hammer-outline', mIcon: 'gavel' },
    {
      id: 'users',
      label: t('admin_identities'),
      icon: 'people-outline',
      mIcon: 'account-group-outline',
    },
    { id: 'finance', label: t('admin_finance'), icon: 'wallet-outline', mIcon: 'cash-register' },
    { id: 'logs', label: t('admin_audit'), icon: 'list-outline', mIcon: 'database-search' },
    { id: 'systems', label: t('admin_nodes'), icon: 'settings-outline', mIcon: 'cog-outline' },
  ];

  const handleLogout = () => {
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    } catch (e) {
      /* ignore */
    }

    if (Platform.OS === 'web') {
      if (window.confirm(t('admin_sign_out_confirm'))) {
        resetStore().then(() => {
          try {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          } catch (e) {
            /* ignore */
          }
        });
      }
      return;
    }

    Alert.alert(t('admin_sign_out'), t('admin_sign_out_confirm'), [
      { text: t('cancel'), style: 'cancel' },
      {
        text: t('admin_sign_out'),
        style: 'destructive',
        onPress: async () => {
          await resetStore();
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        },
      },
    ]);
  };

  const sidebarWidth = isCollapsed ? 80 : 240;

  return (
    <View
      style={[
        styles.container,
        {
          width: sidebarWidth,
          backgroundColor: theme.lift,
          borderColor: theme.rim,
          paddingTop: 60,
        },
      ]}
    >
      {/* Brand Header */}
      <View style={[styles.header, { paddingHorizontal: isCollapsed ? 0 : 24 }]}>
        <View style={[styles.logo, { backgroundColor: theme.primary }]}>
          <Text style={[styles.logoText, { color: theme.ink }]}>CL</Text>
        </View>
        {!isCollapsed && (
          <View style={{ marginLeft: 12 }}>
            <Text style={[styles.brandName, { color: theme.text, fontFamily: Fonts.headline }]}>
              CITYLINK
            </Text>
            <Text style={[styles.brandSub, { color: theme.primary, fontFamily: Fonts.label }]}>
              ADMIN OPS
            </Text>
          </View>
        )}
      </View>

      {/* Nav List */}
      <View style={styles.navList}>
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <TouchableOpacity
              key={item.id}
              onPress={() => onTabChange(item.id)}
              style={[
                styles.navItem,
                {
                  justifyContent: isCollapsed ? 'center' : 'flex-start',
                  backgroundColor: isActive ? theme.primaryL : 'transparent',
                },
              ]}
            >
              <View
                style={[
                  styles.iconBox,
                  {
                    backgroundColor: isActive ? theme.primary : 'transparent',
                    width: isCollapsed ? 48 : 40,
                    height: isCollapsed ? 48 : 40,
                  },
                ]}
              >
                <MaterialCommunityIcons
                  name={item.mIcon as any}
                  size={isActive ? 20 : 22}
                  color={isActive ? theme.ink : theme.sub}
                />
              </View>
              {!isCollapsed && (
                <Text
                  style={[
                    styles.navText,
                    {
                      color: isActive ? theme.text : theme.sub,
                      fontFamily: isActive ? Fonts.label : Fonts.body,
                      fontSize: FontSize.md,
                    },
                  ]}
                >
                  {item.label}
                </Text>
              )}
              {isActive && !isCollapsed && (
                <View style={[styles.activeIndicator, { backgroundColor: theme.primary }]} />
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Collapse Toggle */}
      {IS_TABLET && (
        <TouchableOpacity
          onPress={toggleCollapse}
          style={[styles.toggleBtn, { backgroundColor: theme.rim }]}
        >
          <Ionicons
            name={isCollapsed ? 'chevron-forward' : 'chevron-back'}
            size={18}
            color={theme.sub}
          />
        </TouchableOpacity>
      )}

      {/* Bottom Profile Mini & Logout */}
      <View style={[styles.footer, { paddingHorizontal: isCollapsed ? 0 : 20 }]}>
        <View style={[styles.avatar, { backgroundColor: theme.rim }]}>
          <Text style={{ color: theme.text, fontWeight: '700' }}>AD</Text>
        </View>
        {!isCollapsed && (
          <View style={{ marginLeft: 12, flex: 1 }}>
            <Text
              style={[styles.userName, { color: theme.text, fontFamily: Fonts.label }]}
              numberOfLines={1}
            >
              {t('role_admin')}
            </Text>
            <Text style={[styles.userRole, { color: theme.sub }]}>{t('admin_nodes')}</Text>
          </View>
        )}
        <TouchableOpacity
          onPress={handleLogout}
          style={[styles.logoutBtn, isCollapsed && { marginTop: 12 }]}
        >
          <MaterialCommunityIcons name="logout" size={20} color={theme.red} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: '100%',
    borderRightWidth: 1,
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 40,
    justifyContent: 'center',
  },
  logo: {
    width: 40,
    height: 40,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    fontSize: 18,
    fontWeight: '900',
  },
  brandName: {
    fontSize: 16,
    letterSpacing: 1,
  },
  brandSub: {
    fontSize: 10,
    letterSpacing: 2,
    marginTop: -2,
  },
  navList: {
    flex: 1,
    paddingHorizontal: 8,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    marginBottom: 8,
    borderRadius: Radius.lg,
    minHeight: 48,
  },
  iconBox: {
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 8,
  },
  navText: {
    marginLeft: 4,
  },
  activeIndicator: {
    position: 'absolute',
    right: 12,
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  toggleBtn: {
    position: 'absolute',
    right: -15,
    top: 60,
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userName: {
    fontSize: 14,
  },
  userRole: {
    fontSize: 11,
  },
  logoutBtn: {
    padding: 8,
  },
});
