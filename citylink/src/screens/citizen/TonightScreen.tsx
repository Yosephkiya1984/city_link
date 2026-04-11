import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Modal, Pressable } from 'react-native';
import TopBar from '../../components/TopBar';
import { useAppStore } from '../../store/AppStore';
import { Colors, LightColors, FontSize, Radius } from '../../theme';
import { CButton, EmptyState } from '../../components';
import { uid, t } from '../../utils';
import { fetchTonightSpots } from '../../services/services.service';

const TONIGHT_CATS = ['All', 'Music', 'Culture', 'Bar', 'Theatre', 'Market'];

export function TonightScreen() {
  const isDark = useAppStore((s) => s.isDark);
  const C = isDark ? Colors : LightColors;
  const tonightFilter = useAppStore((s) => s.tonightFilter);
  const setTonightFilter = useAppStore((s) => s.setTonightFilter);
  const lang = useAppStore((s) => s.lang);

  const [spots, setSpots] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selected, setSelected] = useState<any>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const { data } = await fetchTonightSpots();
      setSpots(data || []);
      setLoading(false);
    }
    load();
  }, []);

  const filtered = spots.filter(
    (s: any) => tonightFilter === 'All' || s.cat === tonightFilter
  );

  return (
    <View style={{ flex: 1, backgroundColor: C.ink }}>
      <TopBar title="🌙 Tonight in Addis" />
      <View style={{ flexDirection: 'row', gap: 6, paddingHorizontal: 16, paddingVertical: 10 }}>
        {TONIGHT_CATS.map((c) => (
          <TouchableOpacity
            key={c}
            onPress={() => setTonightFilter(c)}
            style={{
              paddingHorizontal: 12,
              paddingVertical: 5,
              borderRadius: 20,
              backgroundColor: tonightFilter === c ? C.purpleL : C.lift,
              borderWidth: 1,
              borderColor: tonightFilter === c ? C.purple : C.edge2,
            }}
          >
            <Text
              style={{
                fontSize: FontSize.xs,
                fontWeight: '600',
                color: tonightFilter === c ? C.purple : C.sub,
              }}
            >
              {t(c, lang)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <ScrollView contentContainerStyle={{ paddingBottom: 80 }}>
        {loading ? (
          <Text style={{ color: C.sub, textAlign: 'center', marginTop: 40 }}>
            {t('Loading…', lang)}
          </Text>
        ) : filtered.length === 0 ? (
          <EmptyState icon="🌙" title="No Events Found" subtitle="Looks quiet tonight." />
        ) : (
          filtered.map((spot: any) => (
            <TouchableOpacity
              key={spot.id}
              onPress={() => setSelected(spot)}
              style={{
                marginHorizontal: 16,
                marginBottom: 10,
                borderRadius: Radius.xl,
                borderWidth: 1,
                borderColor: C.edge,
                overflow: 'hidden',
              }}
            >
              <View
                style={{
                  height: 80,
                  backgroundColor: 'rgba(139,92,246,0.1)',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ fontSize: 44 }}>{spot.icon || '🎪'}</Text>
              </View>
              <View style={{ padding: 14, backgroundColor: C.surface }}>
                <Text style={{ color: C.text, fontSize: FontSize.xl, fontWeight: '700' }}>
                  {spot.name}
                </Text>
                <View style={{ flexDirection: 'row', gap: 12, marginTop: 6 }}>
                  <Text style={{ color: C.sub }}>⭐ {spot.rating || 4.5}</Text>
                  <Text style={{ color: C.sub }}>
                    🕔 {spot.opens || '18:00'} – {spot.closes || '02:00'}
                  </Text>
                  <Text style={{ color: spot.entry > 0 ? C.amber : C.green, fontWeight: '700' }}>
                    {spot.entry > 0 ? `${spot.entry} ETB` : t('Free Entry', lang)}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      <Modal visible={!!selected} transparent animationType="slide">
        <Pressable
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' }}
          onPress={() => setSelected(null)}
        >
          <Pressable
            style={{
              backgroundColor: C.surface,
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              padding: 24,
              paddingBottom: 40,
            }}
            onPress={(e: any) => e.stopPropagation()}
          >
            <Text style={{ fontSize: 48, textAlign: 'center', marginBottom: 12 }}>
              {selected?.icon || '🎪'}
            </Text>
            <Text
              style={{
                color: C.text,
                fontSize: FontSize['2xl'],
                fontWeight: '800',
                textAlign: 'center',
              }}
            >
              {selected?.name}
            </Text>
            <Text style={{ color: C.sub, textAlign: 'center', marginTop: 4, marginBottom: 20 }}>
              📍 {selected?.subcity || 'Addis Ababa'}
            </Text>
            {selected &&
              [
                ['Category', t(selected.cat, lang)],
                ['Opens', selected.opens],
                ['Closes', selected.closes],
                ['Entry', selected.entry > 0 ? `${selected.entry} ETB` : t('Free', lang)],
                ['Rating', `⭐ ${selected.rating || 4.5}`],
              ].map(([k, v]) => (
                <View
                  key={k}
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    paddingVertical: 8,
                    borderBottomWidth: 1,
                    borderBottomColor: C.edge,
                  }}
                >
                  <Text style={{ color: C.sub }}>{k}</Text>
                  <Text style={{ color: C.text, fontWeight: '700' }}>{v}</Text>
                </View>
              ))}
            <CButton
              title={selected?.entry > 0 ? t('Buy Ticket', lang) : t('Get Directions', lang)}
              onPress={() => setSelected(null)}
              style={{ marginTop: 20 }}
            />
            <CButton
              title={t('Cancel', lang)}
              onPress={() => setSelected(null)}
              variant="ghost"
              style={{ marginTop: 8 }}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

export default TonightScreen;
