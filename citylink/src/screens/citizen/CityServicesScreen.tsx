import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import TopBar from '../../components/TopBar';
import { useAppStore } from '../../store/AppStore';
import { Colors, DarkColors, Radius, Fonts, Shadow } from '../../theme';
import { t } from '../../utils/i18n';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

function useTheme() {
  const isDark = useAppStore((s) => s.isDark);
  return isDark ? DarkColors : Colors;
}

export default function CityServicesScreen() {
  const navigation = useNavigation();
  const C = useTheme();

  const SERVICES = [
    { icon: 'bus', label: t('transport'), screen: 'Transport', color: '#007AFF' },
    { icon: 'flash', label: t('electricity'), screen: 'BillPay', props: { type: 'Electric' }, color: '#FF9500' },
    { icon: 'water', label: t('water'), screen: 'BillPay', props: { type: 'Water' }, color: '#32ADE6' },
    { icon: 'wifi', label: t('internet'), screen: 'BillPay', props: { type: 'WiFi' }, color: '#5856D6' },
    { icon: 'book', label: t('education'), screen: 'Education', color: '#AF52DE' },
    { icon: 'medkit', label: t('health'), screen: 'Services', props: { type: 'clinic' }, color: '#FF2D55' },
    { icon: 'briefcase', label: t('jobs'), screen: 'Jobs', color: '#34C759' },
    { icon: 'business', label: t('delala'), screen: 'Delala', color: '#8E8E93' },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: C.ink }}>
      <TopBar title={t('city_services')} />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 80 }}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
          {SERVICES.map((s, idx) => (
            <TouchableOpacity key={idx} onPress={() => navigation.navigate(s.screen, s.props)}
              style={{ width: (SCREEN_WIDTH - 44) / 4, alignItems: 'center', marginBottom: 20 }}>
              <View style={{ width: 64, height: 64, borderRadius: 20, backgroundColor: C.surface,
                borderWidth: 1.5, borderColor: C.edge2, alignItems: 'center', justifyContent: 'center',
                marginBottom: 8, ...Shadow.sm }}>
                <Ionicons name={s.icon} size={28} color={s.color} />
              </View>
              <Text style={{ color: C.text, fontSize: 11, fontFamily: Fonts.black, textAlign: 'center' }}>
                {s.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}
