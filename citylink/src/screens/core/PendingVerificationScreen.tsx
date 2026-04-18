import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useAuthStore } from '../../store/AuthStore';
import { useSystemStore } from '../../store/SystemStore';
import { useWalletStore } from '../../store/WalletStore';
import { Colors, DarkColors, Fonts } from '../../theme';
import { Ionicons } from '@expo/vector-icons';

export default function PendingVerificationScreen({ navigation }: any) {
  const isDark = useSystemStore((s) => s.isDark);
  const C = isDark ? DarkColors : Colors;
  const resetAuth = useAuthStore((s) => s.reset);
  const resetWallet = useWalletStore((s) => s.reset);
  const resetSystem = useSystemStore((s) => s.reset);
  const currentUser = useAuthStore((s) => s.currentUser);

  const handleSignOut = () => {
    resetAuth();
    resetWallet();
    resetSystem();
    navigation.reset({
      index: 0,
      routes: [{ name: 'Auth' }],
    });
  };

  return (
    <View style={[styles.container, { backgroundColor: C.ink }]}>
      <Ionicons
        name="shield-half-outline"
        size={80}
        color={C.primary}
        style={{ marginBottom: 24 }}
      />
      <Text style={[styles.title, { color: C.text }]}>Verification Pending</Text>
      <Text style={[styles.subtitle, { color: C.sub }]}>
        Your account ({currentUser?.role}) is currently awaiting verification. Please complete KYC
        or wait for an administrator to approve your account.
      </Text>

      <TouchableOpacity
        style={[styles.btn, { backgroundColor: C.surface, borderColor: C.edge }]}
        onPress={handleSignOut}
        accessible={true}
        accessibilityRole="button"
        accessibilityLabel="Sign out"
        accessibilityHint="Signs you out of the app"
        accessibilityState={{ busy: false }}
      >
        <Text style={[styles.btnText, { color: C.text }]}>Sign Out</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontFamily: Fonts.bold,
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: Fonts.medium,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 40,
  },
  btn: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 1,
    minWidth: 200,
    alignItems: 'center',
  },
  btnText: {
    fontSize: 16,
    fontFamily: Fonts.bold,
  },
});
