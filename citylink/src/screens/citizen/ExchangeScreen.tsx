import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import TopBar from '../../components/TopBar';
import { useAppStore } from '../../store/AppStore';
import { Colors, DarkColors, Radius, Fonts, Shadow } from '../../theme';
import { Card } from '../../components';
import { t } from '../../utils/i18n';

function useTheme() {
  const isDark = useAppStore((s) => s.isDark);
  return isDark ? DarkColors : Colors;
}

export default function ExchangeScreen() {
  const C = useTheme();
  
  const RATES = [
    { code: 'USD', name: 'US Dollar', bank: '128.45', parallel: '145.20' },
    { code: 'EUR', name: 'Euro', bank: '135.20', parallel: '152.00' },
    { code: 'GBP', name: 'British Pound', bank: '162.10', parallel: '180.50' },
    { code: 'AED', name: 'UAE Dirham', bank: '34.90', parallel: '39.50' },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: C.ink }}>
      <TopBar title={t('exchange_rates')} />
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 12, marginBottom: 12 }}>
          <Text style={{ color: C.hint, fontSize: 11, fontFamily: Fonts.bold }}>CURRENCY</Text>
          <View style={{ flexDirection: 'row', gap: 40 }}>
            <Text style={{ color: C.hint, fontSize: 11, fontFamily: Fonts.bold }}>BANK</Text>
            <Text style={{ color: C.hint, fontSize: 11, fontFamily: Fonts.bold }}>PARALLEL</Text>
          </View>
        </View>
        {RATES.map((r, idx) => (
          <Card key={idx} style={{ marginBottom: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View>
              <Text style={{ color: C.text, fontFamily: Fonts.black }}>{r.code}</Text>
              <Text style={{ color: C.sub, fontSize: 11 }}>{r.name}</Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 30 }}>
               <Text style={{ color: C.text, fontFamily: Fonts.medium }}>{r.bank}</Text>
               <Text style={{ color: C.primary, fontFamily: Fonts.black }}>{r.parallel}</Text>
            </View>
          </Card>
        ))}
        <Text style={{ color: C.hint, fontSize: 10, textAlign: 'center', marginTop: 20 }}>Last updated: Today, 10:45 AM</Text>
      </ScrollView>
    </View>
  );
}
