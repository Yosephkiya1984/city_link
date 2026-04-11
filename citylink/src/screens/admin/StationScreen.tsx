import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import TopBar from '../../components/TopBar';
import { useAppStore } from '../../store/AppStore';
import { useTheme } from '../../hooks/useTheme';
import { Colors, FontSize, Radius } from '../../theme';
import { CButton, SectionTitle } from '../../components';
import { signOut } from '../../services/auth.service';
import { saveSession } from '../../store/AppStore';
import { fmtETB, fmtDateTime } from '../../utils';

// Simulated live gate events
function genGateEvents(n = 8) {
  const stations = ['Menelik II Square', 'Lideta', 'Megenagna', 'Mexico', 'Mercato'];
  return Array.from({ length: n }, (_, i) => ({
    id: `ge-${i}`,
    type: Math.random() > 0.5 ? 'TAP_IN' : 'TAP_OUT',
    user: `User-${Math.floor(1000 + Math.random() * 9000)}`,
    station: stations[Math.floor(Math.random() * stations.length)],
    fare: Math.round((2 + Math.random() * 8) * 10) / 10,
    time: new Date(Date.now() - i * 90000).toISOString(),
    valid: Math.random() > 0.1,
  }));
}

export default function StationScreen() {
  const navigation = useNavigation();
  const currentUser = useAppStore((s) => s.currentUser);
  const reset = useAppStore((s) => s.reset);
  const C = useTheme();

  const [events, setEvents] = useState(genGateEvents());
  const [activeTab, setActiveTab] = useState('gate');
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const t = setInterval(() => {
      setElapsed((e) => e + 1);
      // Occasionally add new gate event
      if (Math.random() < 0.3) {
        setEvents((prev) => [genGateEvents(1)[0], ...prev.slice(0, 19)]);
      }
    }, 3000);
    return () => clearInterval(t);
  }, []);

  async function handleLogout() {
    await signOut();
    await saveSession(null);
    reset();
  }

  const tapIns = events.filter((e) => e.type === 'TAP_IN').length;
  const tapOuts = events.filter((e) => e.type === 'TAP_OUT').length;
  const totalFare = events.reduce((s, e) => s + (e.type === 'TAP_OUT' ? e.fare : 0), 0);
  const invalidCount = events.filter((e) => !e.valid).length;

  const TABS = [
    { value: 'gate', label: 'Gate Events' },
    { value: 'stats', label: 'Station Stats' },
    { value: 'trains', label: 'Live Trains' },
  ];

  const TRAINS = [
    { id: 'T1', line: 'NS', status: 'ARRIVING', station: 'Lideta', delay: 0, passengers: 142 },
    { id: 'T2', line: 'EW', status: 'DEPARTED', station: 'Mexico', delay: 2, passengers: 89 },
    { id: 'T3', line: 'NS', status: 'AT_STATION', station: 'Megenagna', delay: 0, passengers: 203 },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: C.ink }}>
      {/* Station header */}
      <View
        style={{
          backgroundColor: C.surface,
          borderBottomWidth: 1,
          borderBottomColor: C.edge,
          paddingHorizontal: 16,
          paddingTop: 48,
          paddingBottom: 12,
        }}
      >
        <View
          style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}
        >
          <View>
            <Text style={{ color: C.text, fontSize: FontSize.xl, fontWeight: '800' }}>
              Station Operator
            </Text>
            <Text style={{ color: C.sub, marginTop: 2 }}>{currentUser?.full_name}</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
            <TouchableOpacity
              onPress={() => navigation.navigate('ChatInbox')}
              style={{ padding: 8, borderRadius: Radius.lg, backgroundColor: C.surfaceLow }}
            >
              <Ionicons name="chatbubbles-outline" size={20} color={C.primary} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => navigation.navigate('Notifications')}
              style={{ padding: 8, borderRadius: Radius.lg, backgroundColor: C.surfaceLow }}
            >
              <Ionicons name="notifications-outline" size={20} color={C.primary} />
            </TouchableOpacity>

            {/* Live indicator */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                backgroundColor: C.greenL,
                borderRadius: 20,
                paddingHorizontal: 10,
                paddingVertical: 4,
                borderWidth: 1,
                borderColor: C.greenB,
              }}
            >
              <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: C.green }} />
              <Text style={{ color: C.green, fontSize: FontSize.xs, fontWeight: '700' }}>LIVE</Text>
            </View>
            <TouchableOpacity
              onPress={handleLogout}
              style={{
                paddingHorizontal: 10,
                paddingVertical: 6,
                borderRadius: Radius.lg,
                backgroundColor: C.redL,
                borderWidth: 1,
                borderColor: C.red + '44',
              }}
            >
              <Ionicons name="log-out-outline" size={16} color={C.red} />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Stats strip */}
      <View style={{ flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: C.edge }}>
        {[
          { label: 'Tap-Ins', value: String(tapIns), color: C.green },
          { label: 'Tap-Outs', value: String(tapOuts), color: C.blue },
          { label: 'Revenue', value: `${fmtETB(totalFare, 0)} ETB`, color: C.amber },
          { label: 'Alerts', value: String(invalidCount), color: invalidCount > 0 ? C.red : C.sub },
        ].map(({ label, value, color }) => (
          <View key={label} style={{ flex: 1, alignItems: 'center', padding: 10 }}>
            <Text style={{ color, fontSize: FontSize.xl, fontWeight: '800' }}>{value}</Text>
            <Text
              style={{ color: C.sub, fontSize: FontSize.xs, marginTop: 1, textAlign: 'center' }}
            >
              {label}
            </Text>
          </View>
        ))}
      </View>

      {/* Tab bar */}
      <View
        style={{
          flexDirection: 'row',
          backgroundColor: C.lift,
          margin: 12,
          borderRadius: 10,
          padding: 3,
          borderWidth: 1,
          borderColor: C.edge,
        }}
      >
        {TABS.map((t) => (
          <TouchableOpacity
            key={t.value}
            onPress={() => setActiveTab(t.value)}
            style={{
              flex: 1,
              paddingVertical: 8,
              alignItems: 'center',
              borderRadius: 8,
              backgroundColor: activeTab === t.value ? C.rim : 'transparent',
            }}
          >
            <Text
              style={{
                fontSize: FontSize.sm,
                fontWeight: '700',
                color: activeTab === t.value ? C.text : C.sub,
              }}
            >
              {t.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* â”€â”€ GATE EVENTS â”€â”€ */}
        {activeTab === 'gate' &&
          events.map((ev) => (
            <View
              key={ev.id}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: 16,
                paddingVertical: 10,
                borderBottomWidth: 1,
                borderBottomColor: C.edge,
                backgroundColor: !ev.valid ? 'rgba(232,49,42,0.04)' : 'transparent',
              }}
            >
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  backgroundColor: ev.type === 'TAP_IN' ? C.greenL : C.blueL,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: 12,
                }}
              >
                <Text style={{ fontSize: 16 }}>{ev.type === 'TAP_IN' ? 'â†’' : 'â†'}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={{ color: C.text, fontWeight: '700', fontSize: FontSize.md }}>
                    {ev.user}
                  </Text>
                  {!ev.valid && (
                    <View
                      style={{
                        paddingHorizontal: 6,
                        paddingVertical: 2,
                        borderRadius: 4,
                        backgroundColor: C.redL,
                      }}
                    >
                      <Text style={{ color: C.red, fontSize: 8, fontWeight: '800' }}>INVALID</Text>
                    </View>
                  )}
                </View>
                <Text style={{ color: C.sub, fontSize: FontSize.xs, marginTop: 2 }}>
                  {ev.type.replace('_', ' ')} Â· {ev.station}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                {ev.type === 'TAP_OUT' && (
                  <Text style={{ color: C.green, fontFamily: 'Courier', fontWeight: '700' }}>
                    {ev.fare} ETB
                  </Text>
                )}
                <Text style={{ color: C.sub, fontSize: FontSize.xs, marginTop: 2 }}>
                  {new Date(ev.time).toLocaleTimeString('en-ET', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Text>
              </View>
            </View>
          ))}

        {/* â”€â”€ STATION STATS â”€â”€ */}
        {activeTab === 'stats' && (
          <View style={{ padding: 16, gap: 12 }}>
            <View
              style={{
                backgroundColor: C.surface,
                borderRadius: Radius.xl,
                borderWidth: 1,
                borderColor: C.edge,
                padding: 16,
              }}
            >
              <Text style={{ color: C.text, fontWeight: '700', marginBottom: 16 }}>
                Hourly Throughput
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 4, height: 80 }}>
                {[30, 55, 80, 70, 90, 65, 45, 60, 75, 85, 70, 50].map((pct, i) => (
                  <View key={i} style={{ flex: 1 }}>
                    <View
                      style={{
                        height: pct * 0.72,
                        backgroundColor: C.greenL,
                        borderRadius: 2,
                        borderWidth: 1,
                        borderColor: C.greenB,
                      }}
                    />
                    <Text style={{ color: C.sub, fontSize: 6, textAlign: 'center', marginTop: 3 }}>
                      {(6 + i).toString().padStart(2, '0')}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
            {[
              { label: 'Peak Hour', value: '08:00 â€“ 09:00', icon: 'â°' },
              { label: 'Total Passengers', value: '2,847', icon: '👥' },
              { label: 'Revenue Today', value: `${fmtETB(totalFare + 8420, 0)} ETB`, icon: 'ðŸ’°' },
              { label: 'Avg Fare', value: '4.2 ETB', icon: '📊' },
              { label: 'Gate Errors', value: String(invalidCount), icon: 'âš ï¸' },
            ].map(({ label, value, icon }) => (
              <View
                key={label}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: C.surface,
                  borderRadius: Radius.xl,
                  borderWidth: 1,
                  borderColor: C.edge,
                  padding: 16,
                  gap: 14,
                }}
              >
                <Text style={{ fontSize: 22 }}>{icon}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: C.sub, fontSize: FontSize.xs }}>{label}</Text>
                  <Text style={{ color: C.text, fontWeight: '800', fontSize: FontSize.xl }}>
                    {value}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* â”€â”€ LIVE TRAINS â”€â”€ */}
        {activeTab === 'trains' && (
          <View style={{ padding: 16, gap: 10 }}>
            {TRAINS.map((train) => (
              <View
                key={train.id}
                style={{
                  backgroundColor: C.surface,
                  borderRadius: Radius.xl,
                  borderWidth: 1,
                  borderColor: C.edge,
                  padding: 16,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 14,
                }}
              >
                <View
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 12,
                    backgroundColor: train.line === 'NS' ? C.greenL : C.blueL,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text
                    style={{ color: train.line === 'NS' ? C.green : C.blue, fontWeight: '800' }}
                  >
                    {train.id}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={{ color: C.text, fontWeight: '700' }}>Line {train.line}</Text>
                    <View
                      style={{
                        paddingHorizontal: 6,
                        paddingVertical: 2,
                        borderRadius: 4,
                        backgroundColor:
                          train.status === 'AT_STATION'
                            ? C.greenL
                            : train.status === 'ARRIVING'
                              ? C.amberL
                              : C.blueL,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: FontSize.xs,
                          fontWeight: '700',
                          color:
                            train.status === 'AT_STATION'
                              ? C.green
                              : train.status === 'ARRIVING'
                                ? C.amber
                                : C.blue,
                        }}
                      >
                        {train.status.replace('_', ' ')}
                      </Text>
                    </View>
                  </View>
                  <Text style={{ color: C.sub, marginTop: 2 }}>ðŸ“ {train.station}</Text>
                  <Text style={{ color: C.sub, fontSize: FontSize.xs }}>
                    👥 {train.passengers} passengers
                  </Text>
                </View>
                {train.delay > 0 && (
                  <View style={{ alignItems: 'center' }}>
                    <Text style={{ color: C.red, fontWeight: '800' }}>+{train.delay}m</Text>
                    <Text style={{ color: C.sub, fontSize: FontSize.xs }}>delay</Text>
                  </View>
                )}
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
