import React from 'react';
import { View, Text, TouchableOpacity, Animated, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Fonts } from '../../../theme';
import { useNavigation } from '@react-navigation/native';

export interface AuthWelcomeProps {
  C: any;
  fadeAnim: Animated.Value;
  slideAnim: Animated.Value;
  onLogin: () => void;
  onRegister: () => void;
  onGov: () => void;
}

export const AuthWelcome = ({
  C,
  fadeAnim,
  slideAnim,
  onLogin,
  onRegister,
  onGov,
}: AuthWelcomeProps) => {
  const logoBg = C.primary + '1A';
  const navigation = useNavigation<any>();

  return (
    <Animated.View
      style={[styles.screen, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}
    >
      <View style={styles.heroContainer}>
        <View style={[styles.logoCircle, { backgroundColor: logoBg }]}>
          <Ionicons name="link" size={40} color={C.primary} />
        </View>
        <Text style={[styles.heroTitle, { color: C.text }]}>CityLink</Text>
        <Text style={[styles.heroSubtitle, { color: C.sub }]}>The Heartbeat of Addis Ababa</Text>
      </View>

      <View style={styles.welcomeButtons}>
        <TouchableOpacity
          style={[styles.primaryBtn, { backgroundColor: C.primary, shadowColor: C.primary }]}
          onPress={onLogin}
        >
          <Text style={[styles.primaryBtnText, { color: C.ink }]}>Sign In</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.secondaryBtn, { borderColor: C.edge }]}
          onPress={onRegister}
        >
          <Text style={[styles.secondaryBtnText, { color: C.text }]}>Create Account</Text>
        </TouchableOpacity>

        <View style={styles.divider}>
          <View style={[styles.line, { backgroundColor: C.edge }]} />
          <Text style={[styles.dividerText, { color: C.sub }]}>OR</Text>
          <View style={[styles.line, { backgroundColor: C.edge }]} />
        </View>

        <TouchableOpacity
          style={[styles.govBtn, { backgroundColor: C.surface, borderColor: C.edge }]}
          onPress={onGov}
        >
          <Ionicons
            name="shield-checkmark"
            size={20}
            color={C.primary}
            style={{ marginRight: 8 }}
          />
          <Text style={[styles.govBtnText, { color: C.text }]}>Government Login</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={{ marginTop: 20, alignItems: 'center' }}
          onPress={() => navigation.navigate('DevPortal')}
        >
          <Text style={{ color: C.sub, fontSize: 12, fontFamily: Fonts.label, textDecorationLine: 'underline' }}>
            🛠️ Developer Access
          </Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    padding: 32,
    justifyContent: 'center',
  },
  heroContainer: {
    alignItems: 'center',
    marginBottom: 60,
  },
  logoCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 28,
  },
  heroTitle: {
    fontSize: 42,
    fontFamily: Fonts.headline,
    letterSpacing: -1,
    marginBottom: 12,
  },
  heroSubtitle: {
    fontSize: 17,
    fontFamily: Fonts.body,
    textAlign: 'center',
    maxWidth: '80%',
    lineHeight: 24,
  },
  welcomeButtons: {
    gap: 16,
  },
  primaryBtn: {
    height: 60,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  primaryBtnText: {
    fontSize: 18,
    fontFamily: Fonts.label,
    letterSpacing: 0.5,
  },
  secondaryBtn: {
    height: 60,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
  },
  secondaryBtnText: {
    fontSize: 18,
    fontFamily: Fonts.label,
    letterSpacing: 0.5,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 12,
  },
  line: {
    flex: 1,
    height: 1,
    opacity: 0.3,
  },
  dividerText: {
    marginHorizontal: 16,
    fontSize: 11,
    fontFamily: Fonts.label,
    textTransform: 'uppercase',
  },
  govBtn: {
    flexDirection: 'row',
    height: 60,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    backgroundColor: 'transparent',
  },
  govBtnText: {
    fontSize: 16,
    fontFamily: Fonts.label,
    letterSpacing: 0.5,
  },
});
