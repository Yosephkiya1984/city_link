import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import TopBar from '../../components/TopBar';
import { useAppStore } from '../../store/AppStore';
import { Colors, DarkColors, Radius, FontSize, Fonts } from '../../theme';
import { uid, timeAgo } from '../../utils';

function useTheme() {
  const isDark = useAppStore((s) => s.isDark);
  return isDark ? DarkColors : Colors;
}

export default function NotificationsScreen() {
  const C = useTheme();
  const notifications = useAppStore((s) => s.notifications);
  const markNotifRead = useAppStore((s) => s.markNotifRead);
  const addNotification = useAppStore((s) => s.addNotification);
  const clearNotifications = useAppStore((s) => s.clearNotifications);
  const [filter, setFilter] = useState('all');
  const [showSettings, setShowSettings] = useState(false);
  const [notificationSettings, setNotificationSettings] = useState({
    transport: true,
    payments: true,
    social: true,
    promotions: false,
    system: true,
  });

  const FILTERS = ['all', 'unread', 'transport', 'payments', 'social', 'promotions', 'system'];
  const filtered = notifications.filter((n) => {
    if (filter === 'all') return true;
    if (filter === 'unread') return !n.read;
    return n.category === filter;
  });

  // Real-time notifications are now handled globally in HomeScreen.js

  const getNotificationIcon = (type, category) => {
    const iconMap = {
      transport: 'bus',
      payments: 'bag-handle',
      social: 'people',
      promotions: 'gift',
      system: 'settings',
    };
    return iconMap[category] || 'information-circle';
  };

  const getNotificationColor = (type, category) => {
    const colorMap = {
      transport: C.blue,
      payments: C.green,
      social: C.primary,
      promotions: C.amber,
      system: C.sub,
    };
    return colorMap[category] || (type === 'success' ? C.green : C.primary);
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.ink }}>
      <TopBar
        title="Notifications"
        right={
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity
              onPress={() => setShowSettings(!showSettings)}
              style={{
                paddingHorizontal: 10,
                paddingVertical: 5,
                borderRadius: Radius.lg,
                backgroundColor: showSettings ? C.primaryL : C.lift,
                borderWidth: 1,
                borderColor: C.edge2,
              }}
            >
              <Text
                style={{
                  color: showSettings ? C.primary : C.sub,
                  fontSize: FontSize.xs,
                  fontWeight: '700',
                }}
              >
                Settings
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={clearNotifications}
              style={{
                paddingHorizontal: 10,
                paddingVertical: 5,
                borderRadius: Radius.lg,
                backgroundColor: C.redL,
                borderWidth: 1,
                borderColor: C.red + '44',
              }}
            >
              <Text style={{ color: C.red, fontSize: FontSize.xs, fontWeight: '700' }}>Clear</Text>
            </TouchableOpacity>
          </View>
        }
      />

      {/* Notification Settings Panel */}
      {showSettings && (
        <View
          style={{
            backgroundColor: C.surface,
            borderBottomWidth: 1,
            borderBottomColor: C.edge,
            padding: 16,
          }}
        >
          <Text
            style={{
              color: C.text,
              fontSize: FontSize.lg,
              fontFamily: Fonts.black,
              marginBottom: 12,
            }}
          >
            Notification Preferences
          </Text>
          {Object.entries(notificationSettings).map(([key, value]) => (
            <TouchableOpacity
              key={key}
              onPress={() => setNotificationSettings((prev) => ({ ...prev, [key]: !value }))}
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 8,
              }}
            >
              <Text
                style={{
                  color: C.text,
                  fontSize: FontSize.md,
                  fontFamily: Fonts.medium,
                  textTransform: 'capitalize',
                }}
              >
                {key} notifications
              </Text>
              <View
                style={{
                  width: 48,
                  height: 24,
                  borderRadius: 12,
                  backgroundColor: value ? C.primary : C.edge2,
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexDirection: 'row',
                }}
              >
                <View
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: 10,
                    backgroundColor: C.white,
                    transform: [{ translateX: value ? 14 : -14 }],
                  }}
                />
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Filter Tabs */}
      <View
        style={{
          padding: 16,
          backgroundColor: C.surface,
          borderBottomWidth: 1,
          borderBottomColor: C.edge,
        }}
      >
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8 }}
        >
          {FILTERS.map((f) => (
            <TouchableOpacity
              key={f}
              onPress={() => setFilter(f)}
              style={{
                paddingHorizontal: 16,
                paddingVertical: 8,
                borderRadius: Radius.full,
                backgroundColor: filter === f ? C.primary : C.lift,
                borderWidth: 1,
                borderColor: filter === f ? C.primary : C.edge2,
              }}
            >
              <Text
                style={{
                  color: filter === f ? C.white : C.sub,
                  fontSize: 12,
                  fontFamily: Fonts.bold,
                  textTransform: 'capitalize',
                }}
              >
                {f}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Notifications List */}
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        {filtered.length === 0 ? (
          <View style={{ padding: 100, alignItems: 'center' }}>
            <Ionicons name="notifications-off-outline" size={60} color={C.hint} />
            <Text style={{ color: C.sub, marginTop: 16, fontFamily: Fonts.medium }}>
              No notifications yet.
            </Text>
            <Text
              style={{ color: C.hint, marginTop: 8, fontFamily: Fonts.medium, textAlign: 'center' }}
            >
              Real-time notifications will appear here
            </Text>
          </View>
        ) : (
          <>
            {/* Real-time indicator */}
            <View
              style={{
                paddingHorizontal: 16,
                paddingVertical: 8,
                backgroundColor: C.green + '10',
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: C.green }} />
              <Text style={{ color: C.green, fontSize: FontSize.sm, fontFamily: Fonts.medium }}>
                Real-time updates active
              </Text>
            </View>

            {filtered.map((n) => (
              <TouchableOpacity
                key={n.id}
                onPress={() => markNotifRead(n.id)}
                style={{
                  padding: 20,
                  borderBottomWidth: 1,
                  borderBottomColor: C.edge,
                  backgroundColor: n.read ? 'transparent' : C.primaryL,
                  flexDirection: 'row',
                  gap: 16,
                  borderLeftWidth: n.read ? 0 : 4,
                  borderLeftColor: getNotificationColor(n.type, n.category),
                }}
              >
                <View
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 12,
                    backgroundColor: getNotificationColor(n.type, n.category) + '20',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Ionicons
                    name={getNotificationIcon(n.type, n.category)}
                    size={24}
                    color={getNotificationColor(n.type, n.category)}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <View
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                    }}
                  >
                    <Text style={{ color: C.text, fontSize: 16, fontFamily: Fonts.black, flex: 1 }}>
                      {n.title}
                    </Text>
                    <View
                      style={{
                        paddingHorizontal: 6,
                        paddingVertical: 2,
                        borderRadius: 4,
                        backgroundColor: getNotificationColor(n.type, n.category) + '20',
                        marginLeft: 8,
                      }}
                    >
                      <Text
                        style={{
                          color: getNotificationColor(n.type, n.category),
                          fontSize: 10,
                          fontFamily: Fonts.bold,
                        }}
                      >
                        {n.category}
                      </Text>
                    </View>
                  </View>
                  <Text
                    style={{
                      color: C.sub,
                      fontSize: 13,
                      fontFamily: Fonts.medium,
                      marginTop: 4,
                      lineHeight: 18,
                    }}
                  >
                    {n.message}
                  </Text>
                  <Text
                    style={{ color: C.hint, fontSize: 11, fontFamily: Fonts.bold, marginTop: 8 }}
                  >
                    {timeAgo(n.created_at)}
                  </Text>
                </View>
                {!n.read && (
                  <View
                    style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: C.primary }}
                  />
                )}
              </TouchableOpacity>
            ))}
          </>
        )}
      </ScrollView>
    </View>
  );
}
