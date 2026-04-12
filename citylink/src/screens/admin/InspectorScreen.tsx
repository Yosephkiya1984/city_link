import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useNavigation } from '@react-navigation/native';
import TopBar from '../../components/TopBar';
import { useAppStore } from '../../store/AppStore';
import { Colors, LightColors, FontSize, Radius } from '../../theme';
import { CButton, SectionTitle } from '../../components';
import { signOut } from '../../services/auth.service';
import { saveSession } from '../../store/AppStore';
import { fmtETB, fmtDateTime } from '../../utils';
import { supabase } from '../../services/supabase';

const PENALTIES = [
  { id: 'p1', offense: 'No valid ticket', fine: 50, points: -5 },
  { id: 'p2', offense: 'Riding without tapping in', fine: 100, points: -10 },
  { id: 'p3', offense: 'Tailgating / fare evasion', fine: 200, points: -20 },
  { id: 'p4', offense: 'Disruptive behaviour', fine: 150, points: -15 },
  { id: 'p5', offense: 'Smoking on LRT', fine: 500, points: -30 },
];

// Simulated valid QR token registry
const VALID_TOKENS = [
  {
    token: 'LRT-ABC123',
    user: 'Abebe Bikila',
    origin: 'Lideta',
    status: 'tapped-in',
    tapIn: '2025-01-15T08:22:00Z',
    fare: 0,
  },
  {
    token: 'LRT-DEF456',
    user: 'Tigist Bekele',
    origin: 'Mexico',
    status: 'completed',
    tapIn: '2025-01-15T07:55:00Z',
    fare: 5.2,
  },
  {
    token: 'PRK-XYZ789',
    user: 'Dawit Haile',
    spot: 'B3',
    type: 'parking',
    lot: 'Bole Road',
    status: 'active',
  },
];

export default function InspectorScreen() {
  const navigation = useNavigation();
  const isDark = useAppStore((s) => s.isDark);
  const C = isDark ? Colors : LightColors;
  const currentUser = useAppStore((s) => s.currentUser);
  const reset = useAppStore((s) => s.reset);
  const showToast = useAppStore((s) => s.showToast);

  const [scanInput, setScanInput] = useState('');
  const [scanResult, setScanResult] = useState(null); // null | { valid, data, message }
  const [penalties, setPenalties] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('scan');

  async function handleLogout() {
    await signOut();
    await saveSession(null);
    reset();
  }

  function scanToken() {
    if (!scanInput.trim()) {
      showToast('Enter a QR token to scan', 'error');
      return;
    }
    const token = scanInput.trim().toUpperCase();
    const match = VALID_TOKENS.find((t) => t.token === token);
    if (match) {
      setScanResult({
        valid: true,
        data: match,
        message: 'Valid ticket â€” passenger is authorised',
      });
    } else {
      setScanResult({
        valid: false,
        data: null,
        message: 'Invalid or expired token â€” not found in system',
      });
    }
    setScanInput('');
  }

  async function issuePenalty(penalty) {
    if (!currentUser) return;
    setLoading(true);
    try {
      const res = await supabase.rpc('issue_traffic_fine_atomic', {
        p_plate_number: 'LP-SIM-' + Math.floor(Math.random() * 9000),
        p_violation: penalty.offense,
        p_amount: penalty.fine,
        p_inspector_id: currentUser.id,
      });

      if (res.error) throw res.error;

      const record = {
        id: res.data.fine_id,
        offense: penalty.offense,
        fine: penalty.fine,
        points: penalty.points,
        issuedAt: new Date().toISOString(),
        issuedBy: currentUser?.full_name || 'Inspector',
        status: 'ISSUED',
        notice_number: res.data.notice_number,
      };
      setPenalties((prev) => [record, ...prev]);
      setScanResult(null);
      showToast(`Penalty Issued: ${res.data.notice_number}`, 'warning');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    } catch (e) {
      console.error('Issue Fine Error:', e);
      showToast('Failed to issue penalty', 'error');
    } finally {
      setLoading(false);
    }
  }

  const TABS = [
    { value: 'scan', label: 'Scan' },
    { value: 'penalties', label: 'Penalties' },
    { value: 'stats', label: 'Stats' },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: C.ink }}>
      <View
        style={{
          backgroundColor: C.surface,
          borderBottomWidth: 1,
          borderBottomColor: C.edge,
          paddingHorizontal: 16,
          paddingTop: 48,
          paddingBottom: 12,
          flexDirection: 'row',
          alignItems: 'center',
        }}
      >
        <View style={{ flex: 1 }}>
          <Text style={{ color: C.text, fontSize: FontSize.xl, fontWeight: '800' }}>
            Inspector Dashboard
          </Text>
          <Text style={{ color: C.sub, marginTop: 2 }}>
            {currentUser?.full_name} Â· Badge #{currentUser?.badge_id || 'INS-001'}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
          <TouchableOpacity
            onPress={() => navigation.navigate('ChatInbox')}
            style={{ padding: 8, borderRadius: Radius.lg, backgroundColor: C.surfaceLow }}
          >
            <Ionicons name="chatbubbles-outline" size={20} color={C.blue} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => navigation.navigate('Notifications')}
            style={{ padding: 8, borderRadius: Radius.lg, backgroundColor: C.surfaceLow }}
          >
            <Ionicons name="notifications-outline" size={20} color={C.blue} />
          </TouchableOpacity>
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
        {/* â”€â”€ SCAN TAB â”€â”€ */}
        {activeTab === 'scan' && (
          <View style={{ padding: 16 }}>
            {/* Scan button / QR area */}
            <TouchableOpacity
              style={{
                padding: 32,
                backgroundColor: C.surface,
                borderRadius: 20,
                borderWidth: 2,
                borderColor: 'rgba(45,126,240,0.3)',
                alignItems: 'center',
                marginBottom: 16,
                backgroundColor: 'rgba(13,22,46,0.8)',
              }}
            >
              <Text style={{ fontSize: 52, marginBottom: 8 }}>ðŸ“·</Text>
              <Text style={{ color: C.blue, fontWeight: '700', fontSize: FontSize.xl }}>
                Tap to Scan QR Code
              </Text>
              <Text style={{ color: C.sub, fontSize: FontSize.sm, marginTop: 4 }}>
                Camera access required
              </Text>
            </TouchableOpacity>

            {/* Manual entry */}
            <Text
              style={{
                color: C.sub,
                fontSize: FontSize.xs,
                fontWeight: '700',
                textTransform: 'uppercase',
                marginBottom: 8,
              }}
            >
              Or Enter Token Manually
            </Text>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
              <TextInput
                value={scanInput}
                onChangeText={setScanInput}
                placeholder="e.g. LRT-ABC123"
                placeholderTextColor={C.sub}
                autoCapitalize="characters"
                style={{
                  flex: 1,
                  backgroundColor: C.lift,
                  borderWidth: 1,
                  borderColor: C.edge2,
                  borderRadius: Radius.lg,
                  color: C.text,
                  fontSize: FontSize.lg,
                  fontFamily: 'Courier',
                  paddingHorizontal: 14,
                  paddingVertical: 12,
                  letterSpacing: 2,
                }}
              />
              <TouchableOpacity
                onPress={scanToken}
                style={{
                  paddingHorizontal: 16,
                  backgroundColor: C.blue,
                  borderRadius: Radius.lg,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ color: '#fff', fontWeight: '800' }}>â†’</Text>
              </TouchableOpacity>
            </View>

            {/* Demo tokens */}
            <Text style={{ color: C.sub, fontSize: FontSize.xs, marginBottom: 8 }}>
              Demo tokens:
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
              {VALID_TOKENS.map((t) => (
                <TouchableOpacity
                  key={t.token}
                  onPress={() => setScanInput(t.token)}
                  style={{
                    paddingHorizontal: 10,
                    paddingVertical: 5,
                    borderRadius: Radius.lg,
                    backgroundColor: C.blueL,
                    borderWidth: 1,
                    borderColor: C.blue + '44',
                  }}
                >
                  <Text
                    style={{
                      color: C.blue,
                      fontSize: FontSize.xs,
                      fontWeight: '700',
                      fontFamily: 'Courier',
                    }}
                  >
                    {t.token}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Scan result */}
            {scanResult && (
              <View
                style={{
                  borderRadius: Radius.xl,
                  padding: 20,
                  borderWidth: 2,
                  borderColor: scanResult.valid ? C.green : C.red,
                  backgroundColor: scanResult.valid
                    ? 'rgba(0,168,107,0.06)'
                    : 'rgba(232,49,42,0.06)',
                  marginBottom: 16,
                }}
              >
                <Text style={{ fontSize: 44, textAlign: 'center', marginBottom: 8 }}>
                  {scanResult.valid ? 'âœ…' : 'âŒ'}
                </Text>
                <Text
                  style={{
                    color: C.text,
                    fontSize: FontSize['2xl'],
                    fontWeight: '800',
                    textAlign: 'center',
                    marginBottom: 4,
                  }}
                >
                  {scanResult.valid ? 'VALID' : 'INVALID'}
                </Text>
                <Text
                  style={{
                    color: C.sub,
                    textAlign: 'center',
                    fontSize: FontSize.md,
                    marginBottom: 16,
                  }}
                >
                  {scanResult.message}
                </Text>

                {scanResult.valid && scanResult.data && (
                  <View style={{ gap: 8 }}>
                    {Object.entries({
                      Passenger: scanResult.data.user,
                      Token: scanResult.data.token,
                      Status: scanResult.data.status,
                      ...(scanResult.data.origin ? { Origin: scanResult.data.origin } : {}),
                      ...(scanResult.data.spot
                        ? { Spot: `${scanResult.data.lot} â€” ${scanResult.data.spot}` }
                        : {}),
                    }).map(([k, v]) => (
                      <View
                        key={k}
                        style={{
                          flexDirection: 'row',
                          justifyContent: 'space-between',
                          paddingVertical: 6,
                          borderBottomWidth: 1,
                          borderBottomColor: C.edge,
                        }}
                      >
                        <Text style={{ color: C.sub }}>{k}</Text>
                        <Text style={{ color: C.text, fontWeight: '700' }}>{v}</Text>
                      </View>
                    ))}
                  </View>
                )}

                {!scanResult.valid && (
                  <>
                    <Text
                      style={{
                        color: C.red,
                        fontWeight: '700',
                        marginBottom: 12,
                        textAlign: 'center',
                      }}
                    >
                      Issue a Penalty
                    </Text>
                    {PENALTIES.map((p) => (
                      <TouchableOpacity
                        key={p.id}
                        onPress={() => issuePenalty(p)}
                        style={{
                          backgroundColor: C.surface,
                          borderRadius: Radius.lg,
                          borderWidth: 1,
                          borderColor: C.edge,
                          padding: 12,
                          marginBottom: 8,
                          flexDirection: 'row',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}
                      >
                        <View>
                          <Text style={{ color: C.text, fontWeight: '700' }}>{p.offense}</Text>
                          <Text style={{ color: C.red, fontSize: FontSize.xs }}>
                            {p.points} credit pts
                          </Text>
                        </View>
                        <Text style={{ color: C.red, fontWeight: '800', fontSize: FontSize.xl }}>
                          {p.fine} ETB
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </>
                )}

                <CButton
                  title="Clear"
                  onPress={() => setScanResult(null)}
                  variant="ghost"
                  style={{ marginTop: 12 }}
                />
              </View>
            )}
          </View>
        )}

        {/* â”€â”€ PENALTIES TAB â”€â”€ */}
        {activeTab === 'penalties' &&
          (penalties.length === 0 ? (
            <View style={{ padding: 40, alignItems: 'center' }}>
              <Text style={{ fontSize: 48 }}>ðŸ“‹</Text>
              <Text style={{ color: C.sub, marginTop: 12, textAlign: 'center' }}>
                No penalties issued today.
              </Text>
            </View>
          ) : (
            penalties.map((p) => (
              <View
                key={p.id}
                style={{
                  marginHorizontal: 16,
                  marginBottom: 10,
                  backgroundColor: C.surface,
                  borderRadius: Radius.xl,
                  borderWidth: 1,
                  borderColor: C.edge,
                  padding: 16,
                }}
              >
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ color: C.text, fontWeight: '700', flex: 1 }}>{p.offense}</Text>
                  <Text style={{ color: C.red, fontWeight: '800', fontSize: FontSize.xl }}>
                    {p.fine} ETB
                  </Text>
                </View>
                <Text style={{ color: C.sub, fontSize: FontSize.xs, marginTop: 6 }}>
                  Issued by {p.issuedBy} Â· {fmtDateTime(p.issuedAt)}
                </Text>
                <View
                  style={{
                    paddingHorizontal: 8,
                    paddingVertical: 3,
                    borderRadius: 6,
                    backgroundColor: C.amberL,
                    alignSelf: 'flex-start',
                    marginTop: 8,
                  }}
                >
                  <Text style={{ color: C.amber, fontSize: FontSize.xs, fontWeight: '700' }}>
                    {p.status}
                  </Text>
                </View>
              </View>
            ))
          ))}

        {/* â”€â”€ STATS TAB â”€â”€ */}
        {activeTab === 'stats' && (
          <View style={{ padding: 16, gap: 10 }}>
            {[
              { label: 'Tickets Scanned', value: '47', icon: 'ðŸŽ«', color: C.blue },
              { label: 'Valid', value: '44', icon: 'âœ…', color: C.green },
              { label: 'Invalid', value: '3', icon: 'âŒ', color: C.red },
              {
                label: 'Penalties Issued',
                value: String(penalties.length),
                icon: 'ðŸ“‹',
                color: C.amber,
              },
              {
                label: 'Total Fines',
                value: `${fmtETB(
                  penalties.reduce((s, p) => s + p.fine, 0),
                  0
                )} ETB`,
                icon: 'ðŸ’°',
                color: C.amber,
              },
            ].map(({ label, value, icon, color }) => (
              <View
                key={label}
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
                <Text style={{ fontSize: 24 }}>{icon}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: C.sub, fontSize: FontSize.xs }}>{label}</Text>
                  <Text style={{ color, fontWeight: '800', fontSize: FontSize['2xl'] }}>
                    {value}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
