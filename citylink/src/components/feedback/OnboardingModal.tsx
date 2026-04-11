import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Modal, Animated, Dimensions, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme, CButton } from '../index';
import { Fonts, Shadow } from '../../theme';
import { ONBOARDING_STEPS, OnboardingService } from '../../services/onboarding.service';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export function OnboardingModal() {
  const C = useTheme();
  const [visible, setVisible] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const opacity = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    OnboardingService.checkStatus().then(setVisible);
  }, []);

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.spring(slide, { toValue: 0, useNativeDriver: true, tension: 50, friction: 8 }),
      ]).start();
    }
  }, [visible, stepIndex]);

  const step = ONBOARDING_STEPS[stepIndex];

  const handleNext = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (stepIndex < ONBOARDING_STEPS.length - 1) {
      setStepIndex(s => s + 1);
    } else {
      await OnboardingService.markCompleted();
      setVisible(false);
    }
  };

  const handleSkip = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    await OnboardingService.markCompleted();
    setVisible(false);
  };

  if (!visible || !step) return null;

  return (
    <Modal visible={visible} transparent animationType="none">
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' }}>
        <Animated.View style={{
          backgroundColor: C.surface,
          borderTopLeftRadius: 32,
          borderTopRightRadius: 32,
          padding: 24,
          paddingBottom: 40,
          maxHeight: SCREEN_HEIGHT * 0.8,
          opacity,
          transform: [{ translateY: slide }],
        }}>
          <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: step.color + '20',
            alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginBottom: 24 }}>
            <Ionicons name={step.icon} size={40} color={step.color} />
          </View>

          <Text style={{ color: C.text, fontSize: 28, fontFamily: Fonts.black, textAlign: 'center', marginBottom: 12 }}>
            {step.title}
          </Text>
          <Text style={{ color: C.sub, fontSize: 16, fontFamily: Fonts.medium, textAlign: 'center', lineHeight: 24, marginBottom: 24 }}>
            {step.description}
          </Text>

          <View style={{ marginBottom: 32 }}>
            {step.features.map((f, i) => (
              <View key={i} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: step.color + '20',
                  alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                  <Ionicons name="checkmark" size={14} color={step.color} />
                </View>
                <Text style={{ color: C.text, fontSize: 14, fontFamily: Fonts.medium, flex: 1 }}>{f}</Text>
              </View>
            ))}
          </View>

          <View style={{ flexDirection: 'row', gap: 12 }}>
            {stepIndex > 0 && (
              <CButton title="Back" variant="ghost" onPress={() => setStepIndex(s => s - 1)} style={{ flex: 1 }} />
            )}
            <CButton 
              title={stepIndex === ONBOARDING_STEPS.length - 1 ? "Get Started" : "Next"} 
              onPress={handleNext} 
              style={{ flex: 2 }} 
            />
          </View>

          {stepIndex < ONBOARDING_STEPS.length - 2 && (
            <TouchableOpacity onPress={handleSkip} style={{ alignItems: 'center', marginTop: 24 }}>
              <Text style={{ color: C.sub, fontSize: 14, fontFamily: Fonts.medium }}>Skip tour</Text>
            </TouchableOpacity>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
}
