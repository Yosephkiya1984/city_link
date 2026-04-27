import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useBiometricStore } from '../../store/BiometricStore';
import { useTheme } from '../../hooks/useTheme';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';

export function BiometricLockScreen() {
  const theme = useTheme();
  const { authenticate, biometryType, isLocked } = useBiometricStore();
  const opacity = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isLocked) {
      Animated.timing(opacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
      
      // Auto-trigger authentication
      handleAuthenticate();
    }
  }, [isLocked]);

  const handleAuthenticate = async () => {
    const success = await authenticate('Unlock CityLink');
    if (success) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  if (!isLocked) return null;

  return (
    <Animated.View style={[StyleSheet.absoluteFill, { opacity, zIndex: 9999 }]}>
      <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill}>
        <View style={[styles.container, { backgroundColor: 'transparent' }]}>
          <View style={styles.content}>
            <View style={[styles.iconContainer, { backgroundColor: theme.primary + '20' }]}>
              <Ionicons 
                name={biometryType.includes(1) ? "scan" : "finger-print"} 
                size={64} 
                color={theme.primary} 
              />
            </View>
            
            <Text style={[styles.title, { color: theme.text }]}>
              App Locked
            </Text>
            <Text style={[styles.subtitle, { color: theme.sub }]}>
              Please authenticate to access your account
            </Text>

            <TouchableOpacity 
              style={[styles.button, { backgroundColor: theme.primary }]}
              onPress={handleAuthenticate}
            >
              <Text style={styles.buttonText}>Unlock App</Text>
            </TouchableOpacity>
          </View>
        </View>
      </BlurView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  content: {
    alignItems: 'center',
    width: '100%',
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
    fontFamily: 'SpaceGrotesk_700Bold',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 40,
    paddingHorizontal: 20,
    lineHeight: 24,
  },
  button: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 16,
    width: '100%',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
});
