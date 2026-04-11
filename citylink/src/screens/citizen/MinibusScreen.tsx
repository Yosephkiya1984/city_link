import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import TopBar from '../../components/TopBar';
import { useAppStore } from '../../store/AppStore';
import { Colors, LightColors, FontSize, Radius } from '../../theme';
import { SectionTitle, EmptyState } from '../../components';
import { fetchBusRoutes } from '../../services/transit.service';
import { t } from '../../utils';

export function MinibusScreen() {
  const isDark = useAppStore((s) => s.isDark);
  const C = isDark ? Colors : LightColors;
  const lang = useAppStore((s) => s.lang);

  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [searchFrom, setSearchFrom] = useState('');
  const [searchTo, setSearchTo] = useState('');

  useEffect(() => {
    async function loadRoutes() {
      setLoading(true);
      // Minibuses act locally while Intercity is global, using fetchBusRoutes
      const { data } = await fetchBusRoutes();
      setRoutes(data || []);
      setLoading(false);
    }
    loadRoutes();
  }, []);

  const filteredRoutes = routes.filter(r => {
      const ms = searchFrom.trim() === '' || (r.from_city && r.from_city.toLowerCase().includes(searchFrom.toLowerCase()));
      const me = searchTo.trim() === '' || (r.to_city && r.to_city.toLowerCase().includes(searchTo.toLowerCase()));
      return ms && me;
  });

  return (
    <View style={{ flex: 1, backgroundColor: C.ink }}>
      <TopBar title="🚌 Minibus Routes" />
      <ScrollView contentContainerStyle={{ paddingBottom: 80 }} showsVerticalScrollIndicator={false}>
        <View style={{ margin: 16, padding: 14, backgroundColor: C.surface, borderRadius: Radius.xl,
          borderWidth: 1, borderColor: C.edge }}>
          <Text style={{ color: C.sub, fontSize: FontSize.md, lineHeight: 20, marginBottom: 10 }}>
            ðŸ“ Set Origin and Destination to find Minibus options.
          </Text>
          <TextInput 
              placeholder={t("Origin (e.g. Bole)", lang)} placeholderTextColor={C.sub}
              value={searchFrom} onChangeText={setSearchFrom}
              style={{ backgroundColor: C.lift, borderRadius: Radius.lg, color: C.text, padding: 12, marginBottom: 10 }}
          />
          <TextInput 
              placeholder={t("Destination (e.g. Piassa)", lang)} placeholderTextColor={C.sub}
              value={searchTo} onChangeText={setSearchTo}
              style={{ backgroundColor: C.lift, borderRadius: Radius.lg, color: C.text, padding: 12 }}
          />
        </View>

        <SectionTitle title={t('Matching Routes', lang)} />
        {loading ? (
             <Text style={{ color: C.sub, textAlign: 'center', marginTop: 40 }}>{t('Loadingâ€¦', lang)}</Text>
        ) : filteredRoutes.length === 0 ? (
             <EmptyState icon="ðŸ—ºï¸" title="No matching routes" subtitle="Try searching without specific origin/destination." />
        ) : filteredRoutes.map((route) => (
          <TouchableOpacity key={route.id} onPress={() => setSelected(selected?.id === route.id ? null : route)}
            style={{ marginHorizontal: 16, marginBottom: 10, backgroundColor: C.surface,
              borderRadius: Radius.xl, borderWidth: 1, borderColor: C.edge, overflow: 'hidden' }}>
            <View style={{ padding: 16, flexDirection: 'row', justifyContent: 'space-between' }}>
              <View>
                <Text style={{ color: C.text, fontSize: FontSize.xl, fontWeight: '700' }}>
                  {route.from_city} â†’ {route.to_city}
                </Text>
                <Text style={{ color: C.sub, marginTop: 2 }}>ðŸ• ~{route.duration || '35'} min</Text>
              </View>
              <Text style={{ color: C.green, fontWeight: '800', fontSize: FontSize.xl }}>
                  {route.price || '5'} ETB
              </Text>
            </View>
            {selected?.id === route.id && (
              <View style={{ paddingHorizontal: 16, paddingBottom: 14 }}>
                <Text style={{ color: C.sub, fontSize: FontSize.xs, fontWeight: '700', textTransform: 'uppercase', marginBottom: 8 }}>
                  Route Breakdown
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 4 }}>
                   <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: C.teal, marginRight: 10 }} />
                   <Text style={{ color: C.text }}>{route.from_city}</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 4 }}>
                   <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: C.teal, marginRight: 10 }} />
                   <Text style={{ color: C.text }}>{route.to_city} (End)</Text>
                </View>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

export default MinibusScreen;
