import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity } from 'react-native';
import LottieView from 'lottie-react-native';
import { MotiView } from 'moti';
import { Fonts, Radius, DarkColors as T } from '../../theme';
import * as Haptics from 'expo-haptics';
import { Confetti } from '../ui/Confetti';

interface SuccessOverlayProps {
  visible: boolean;
  title: string;
  subtitle: string;
  onClose: () => void;
  actionLabel?: string;
}

export const SuccessOverlay: React.FC<SuccessOverlayProps> = ({
  visible,
  title,
  subtitle,
  onClose,
  actionLabel = 'CONTINUE',
}) => {
  useEffect(() => {
    if (visible) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.container}>
        <Confetti />
        <MotiView
          from={{ opacity: 0, scale: 0.8, translateY: 20 }}
          animate={{ opacity: 1, scale: 1, translateY: 0 }}
          style={styles.card}
        >
          <View style={styles.animationContainer}>
            <LottieView
              source={{
                uri: 'https://lottie.host/81b29a67-1601-443b-8211-7360214878a8/fTf4DqR3Rk.json',
              }}
              autoPlay
              loop={false}
              style={styles.skottie}
            />
          </View>

          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>

          <TouchableOpacity style={styles.button} onPress={onClose}>
            <Text style={styles.buttonText}>{actionLabel}</Text>
          </TouchableOpacity>
        </MotiView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    backgroundColor: T.surface,
    borderRadius: Radius.card,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: T.edge,
  },
  animationContainer: {
    width: 160,
    height: 160,
    marginBottom: 24,
  },
  skottie: {
    flex: 1,
  },
  title: {
    color: T.text,
    fontSize: 28,
    fontFamily: Fonts.headline,
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    color: T.sub,
    fontSize: 16,
    fontFamily: Fonts.body,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 40,
    opacity: 0.8,
  },
  button: {
    width: '100%',
    height: 56,
    backgroundColor: T.primary,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: T.ink,
    fontSize: 14,
    fontFamily: Fonts.black,
    letterSpacing: 1,
  },
});
