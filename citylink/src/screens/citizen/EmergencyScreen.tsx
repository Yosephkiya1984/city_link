import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Linking, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import TopBar from '../../components/TopBar';
import { useAppStore } from '../../store/AppStore';
import { Colors, DarkColors, Radius, Fonts, Shadow } from '../../theme';
import { t } from '../../utils/i18n';

function useTheme() {
  const isDark = useAppStore((s) => s.isDark);
  return isDark ? DarkColors : Colors;
}

function dialNumber(number) {
  const cleaned = number.replace(/\s/g, '');
  const url = `tel:${cleaned}`;
  Alert.alert('Call ' + number, 'This will open your phone dialer.', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Call', style: 'destructive', onPress: () => Linking.openURL(url).catch(() => {}) },
  ]);
}

export default function EmergencyScreen() {
  const C = useTheme();

  const CONTACTS = [
    { name: t('police'), num: '911', icon: 'shield-checkmark', color: '#007AFF' },
    { name: t('ambulance'), num: '907', icon: 'medical', color: '#FF2D55' },
    { name: t('fire'), num: '939', icon: 'flame', color: '#FF9500' },
    { name: t('red_cross'), num: '927', icon: 'heart', color: '#FF3B30' },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: C.ink }}>
      <TopBar title={t('emergency')} />
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
          {CONTACTS.map((c, idx) => (
            <TouchableOpacity
              key={idx}
              onPress={() => dialNumber(c.num)}
              style={{
                width: '48%',
                backgroundColor: C.surface,
                borderRadius: Radius.xl,
                padding: 20,
                alignItems: 'center',
                borderWidth: 1,
                borderColor: C.edge,
                ...Shadow.sm,
              }}
            >
              <View
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 28,
                  backgroundColor: c.color + '15',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 12,
                }}
              >
                <Ionicons name={c.icon} size={32} color={c.color} />
              </View>
              <Text style={{ color: C.text, fontFamily: Fonts.black, fontSize: 16 }}>{c.name}</Text>
              <Text style={{ color: c.color, fontFamily: Fonts.black, fontSize: 24, marginTop: 4 }}>
                {c.num}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}
