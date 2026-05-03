import React from 'react';
import { View, Text, StyleSheet, Modal } from 'react-native';
import LottieView from 'lottie-react-native';
import { Fonts, DarkColors as T } from '../../theme';

interface ProcessingOverlayProps {
  visible: boolean;
  message?: string;
}

export const ProcessingOverlay: React.FC<ProcessingOverlayProps> = ({
  visible,
  message = 'Processing secure transaction...',
}) => {
  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.container}>
        <View style={styles.animationContainer}>
          <LottieView
            source={{
              uri: 'https://lottie.host/dfb71891-628d-4a1e-8798-89c5643a6d4d/6f8Hj3T7oT.json',
            }}
            autoPlay
            loop
            style={styles.skottie}
          />
        </View>
        <Text style={styles.message}>{message}</Text>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  animationContainer: {
    width: 200,
    height: 200,
    marginBottom: 20,
  },
  skottie: {
    flex: 1,
  },
  message: {
    color: T.text,
    fontSize: 16,
    fontFamily: Fonts.medium,
    textAlign: 'center',
    opacity: 0.8,
    letterSpacing: 0.5,
  },
});
