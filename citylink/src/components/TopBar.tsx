import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StatusBar,
  Animated,
  Pressable,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useWalletStore } from '../store/WalletStore';
import { useSystemStore } from '../store/SystemStore';
import { Colors, DarkColors, FontSize, Spacing, Radius, Shadow, Fonts } from '../theme';
import { AppStackParamList } from '../navigation';

interface TopBarProps {
  title?: string;
  showBack?: boolean;
  right?: any;
  minimal?: boolean;
  showProfile?: boolean;
}

export default function TopBar({
  title,
  showBack = true,
  right,
  minimal,
  showProfile,
}: TopBarProps) {
  const navigation = useNavigation<NavigationProp<AppStackParamList>>();
  const isDark = useSystemStore((s) => s.isDark);
  const C = isDark ? DarkColors : Colors;
  const insets = useSafeAreaInsets();
  const unreadCount = useSystemStore((s) => s.unreadCount);
  const balance = useWalletStore((s) => s.balance);
  const toggleTheme = useSystemStore((s) => s.toggleTheme);

  const balScale = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.sequence([
      Animated.spring(balScale, {
        toValue: 1.1,
        useNativeDriver: true,
        tension: 120,
        friction: 10,
      }),
      Animated.spring(balScale, { toValue: 1, useNativeDriver: true, tension: 120, friction: 10 }),
    ]).start();
  }, [balance]);

  const canGoBack = navigation.canGoBack();

  return (
    <>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor="transparent"
        translucent
      />

      <View
        style={{
          paddingTop: insets.top + (Platform.OS === 'ios' ? 0 : 10),
          backgroundColor: isDark ? 'rgba(5,6,8,0.92)' : 'rgba(253,253,252,0.92)',
          borderBottomWidth: 1,
          borderBottomColor: C.edge,
          paddingHorizontal: 16,
          paddingBottom: 12,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          minHeight: 60 + insets.top,
        }}
      >
        {/* Back control */}
        {showBack && canGoBack ? (
          <Pressable
            onPress={() => {
              try {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              } catch (_) {}
              navigation.goBack();
            }}
            style={{
              width: 40,
              height: 40,
              borderRadius: Radius.lg,
              backgroundColor: C.surface,
              borderWidth: 1.5,
              borderColor: C.edge2,
              alignItems: 'center',
              justifyContent: 'center',
              ...Shadow.sm,
            }}
          >
            <Ionicons name="chevron-back" size={24} color={C.primary} />
          </Pressable>
        ) : null}

        {/* Branding / Center */}
        <View style={{ flex: 1 }}>
          {title ? (
            <Text
              numberOfLines={1}
              style={{ color: C.text, fontSize: 18, fontFamily: Fonts.black, letterSpacing: -0.5 }}
            >
              {title}
            </Text>
          ) : (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 10,
                  backgroundColor: C.primaryL,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: 1,
                  borderColor: C.primaryB,
                }}
              >
                <Ionicons name="business" size={20} color={C.primary} />
              </View>
              <Text
                style={{ color: C.text, fontSize: 20, fontFamily: Fonts.black, letterSpacing: -1 }}
              >
                City<Text style={{ color: C.primary }}>Link</Text>
              </Text>
            </View>
          )}
        </View>

        {/* Action Controls */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          {/* Messages */}
          <Pressable onPress={() => navigation.navigate('ChatInbox')}>
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: Radius.lg,
                backgroundColor: C.surface,
                borderWidth: 1.5,
                borderColor: C.edge2,
                alignItems: 'center',
                justifyContent: 'center',
                ...Shadow.sm,
              }}
            >
              <Ionicons name="chatbubbles-outline" size={20} color={C.textSoft} />
            </View>
          </Pressable>

          {/* Notifications */}
          <Pressable
            onPress={() => navigation.navigate('Notifications')}
            style={{ position: 'relative' }}
          >
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: Radius.lg,
                backgroundColor: C.surface,
                borderWidth: 1.5,
                borderColor: C.edge2,
                alignItems: 'center',
                justifyContent: 'center',
                ...Shadow.sm,
              }}
            >
              <Ionicons name="notifications-outline" size={20} color={C.textSoft} />
            </View>
            {unreadCount > 0 && (
              <View
                style={{
                  position: 'absolute',
                  top: -4,
                  right: -4,
                  backgroundColor: C.red,
                  borderRadius: 10,
                  minWidth: 18,
                  height: 18,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: 2,
                  borderColor: C.white,
                  paddingHorizontal: 2,
                }}
              >
                <Text style={{ color: C.white, fontSize: 9, fontFamily: Fonts.black }}>
                  {unreadCount > 9 ? '9+' : unreadCount}
                </Text>
              </View>
            )}
          </Pressable>

          {/* Balance Pill */}
          {!minimal && (
            <Animated.View
              style={[
                {
                  backgroundColor: C.primaryL,
                  borderWidth: 1.5,
                  borderColor: C.primaryB,
                  borderRadius: Radius.full,
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                  ...Shadow.sm,
                },
                { transform: [{ scale: balScale }] },
              ]}
            >
              <Text style={{ color: C.primary, fontSize: 13, fontFamily: Fonts.black }}>
                {Number(balance).toLocaleString('en-ET')} <Text style={{ fontSize: 9 }}>ETB</Text>
              </Text>
            </Animated.View>
          )}

          {/* Theme Toggle / Profile */}
          <TouchableOpacity
            onPress={toggleTheme}
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: C.surface,
              borderWidth: 1.5,
              borderColor: C.edge2,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name={isDark ? 'sunny' : 'moon'} size={20} color={C.primary} />
          </TouchableOpacity>
        </View>
      </View>
    </>
  );
}
