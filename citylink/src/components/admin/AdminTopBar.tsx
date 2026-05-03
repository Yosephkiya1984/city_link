import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Dimensions,
  Alert,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { Radius, Spacing, Fonts, FontSize, Shadow } from '../../theme';
import { useAuthStore } from '../../store/AuthStore';
import { useSystemStore } from '../../store/SystemStore';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

import { User } from '../../types';
import { t } from '../../utils/i18n';

interface AdminTopBarProps {
  title: string;
  user: User | null;
}

export default function AdminTopBar({ title, user }: AdminTopBarProps) {
  const theme = useTheme();
  const isMobile = SCREEN_WIDTH < 768;
  const resetStore = useAuthStore((s) => s.reset);
  const [time, setTime] = useState(new Date().toLocaleTimeString());

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date().toLocaleTimeString());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleProfilePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      t('account_operations'),
      `${t('logged_in_as')} ${user?.full_name || t('administrator')}`,
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('admin_sign_out'),
          style: 'destructive',
          onPress: async () => {
            await resetStore();
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          },
        },
      ]
    );
  };

  const handleNotifyPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  return (
    <BlurView
      intensity={25}
      tint={theme.isDark ? 'dark' : 'light'}
      style={[
        styles.container,
        {
          borderBottomWidth: 1,
          borderBottomColor: theme.rim,
          backgroundColor: theme.isDark ? 'rgba(16, 19, 25, 0.7)' : 'rgba(255, 255, 255, 0.7)',
          paddingHorizontal: isMobile ? 16 : 24,
        },
      ]}
    >
      <View style={styles.left}>
        <Text
          style={[
            styles.title,
            {
              color: theme.text,
              fontFamily: Fonts.headline,
              fontSize: isMobile ? 16 : 20,
            },
          ]}
        >
          {title.toUpperCase()}
        </Text>
        {!isMobile && (
          <View style={styles.statusBox}>
            <View style={[styles.pulse, { backgroundColor: theme.primary }]} />
            <Text style={[styles.statusText, { color: theme.primary, fontFamily: Fonts.label }]}>
              {t('system_active')}
            </Text>
          </View>
        )}
      </View>

      {!isMobile && (
        <View style={styles.center}>
          <View style={[styles.searchBar, { backgroundColor: theme.rim }]}>
            <Ionicons name="search-outline" size={18} color={theme.sub} />
            <TextInput
              placeholder={t('search_records')}
              placeholderTextColor={theme.sub}
              style={[styles.searchInput, { color: theme.text, fontFamily: Fonts.body }]}
            />
          </View>
        </View>
      )}

      <View style={styles.right}>
        {!isMobile && (
          <View style={styles.timeBox}>
            <Text style={[styles.timeText, { color: theme.text, fontFamily: Fonts.label }]}>
              {time}
            </Text>
          </View>
        )}

        <TouchableOpacity
          onPress={handleNotifyPress}
          style={[styles.iconButton, { backgroundColor: theme.rim }]}
        >
          <Ionicons name="notifications-outline" size={isMobile ? 18 : 20} color={theme.text} />
          <View style={[styles.badge, { backgroundColor: theme.primary }]} />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleProfilePress}
          style={[styles.profileButton, { borderColor: theme.rim }]}
        >
          <View style={[styles.avatar, { backgroundColor: theme.primary }]}>
            <Text style={{ color: theme.ink, fontWeight: '800', fontSize: isMobile ? 11 : 13 }}>
              AD
            </Text>
          </View>
        </TouchableOpacity>
      </View>
    </BlurView>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 64,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 100,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  title: {
    letterSpacing: 1,
  },
  statusBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(89,222,155,0.1)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.full,
    gap: 6,
  },
  pulse: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 10,
    letterSpacing: 1,
  },
  center: {
    flex: 1,
    maxWidth: 300,
    marginHorizontal: 20,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 38,
    borderRadius: Radius.lg,
    paddingHorizontal: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  timeBox: {
    alignItems: 'flex-end',
    marginRight: 4,
  },
  timeText: {
    fontSize: 13,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 6,
    height: 6,
    borderRadius: 3,
    borderWidth: 1.5,
    borderColor: '#101319',
  },
  profileButton: {
    borderWidth: 1,
    padding: 2,
    borderRadius: Radius.full,
  },
  avatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
