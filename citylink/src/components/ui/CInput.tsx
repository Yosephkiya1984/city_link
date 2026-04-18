import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TextInput, Animated, TouchableOpacity, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Colors, Radius, FontSize, Spacing, Shadow, Fonts } from '../../theme';
import { useTheme } from '../../hooks/useTheme';

interface CInputProps {
  label?: any;
  value?: any;
  onChangeText?: any;
  placeholder?: any;
  keyboardType?: any;
  secureTextEntry?: any;
  maxLength?: any;
  multiline?: any;
  numberOfLines?: any;
  style?: any;
  inputStyle?: any;
  editable?: boolean;
  autoFocus?: any;
  onSubmitEditing?: any;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  autoCorrect?: boolean;
  iconName?: any;
  hint?: any;
}

export function CInput({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  secureTextEntry,
  maxLength,
  multiline,
  numberOfLines,
  style,
  inputStyle,
  editable = true,
  autoFocus,
  onSubmitEditing,
  autoCapitalize,
  autoCorrect,
  iconName,
  hint,
}: CInputProps) {
  const C = useTheme();
  const [isFocused, setIsFocused] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const borderAnim = useRef(new Animated.Value(0)).current;
  const labelAnim = useRef(new Animated.Value(0)).current;
  const iconAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(borderAnim, {
        toValue: isFocused ? 1 : 0,
        duration: 250,
        useNativeDriver: false,
      }),
      Animated.timing(labelAnim, {
        toValue: isFocused ? 1 : 0,
        duration: 200,
        useNativeDriver: false,
      }),
      Animated.spring(iconAnim, {
        toValue: isFocused ? 1.1 : 1,
        useNativeDriver: true,
        tension: 200,
        friction: 8,
      }),
    ]).start();
  }, [isFocused]);

  const borderColor = borderAnim?.interpolate
    ? borderAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [C?.edge2 || '#ddd', C?.primary || '#000'],
      })
    : C?.edge2 || '#ddd';

  const labelColor = labelAnim?.interpolate
    ? labelAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [C?.sub || '#666', C?.primary || '#000'],
      })
    : C?.sub || '#666';

  const handleFocus = () => {
    setIsFocused(true);
    setIsActive(true);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (_) {}
  };

  const handleBlur = () => {
    setIsFocused(false);
    setIsActive(false);
  };

  return (
    <View style={[{ marginBottom: Spacing.lg }, style]}>
      {label && (
        <Animated.Text
          style={{
            fontSize: FontSize.xs,
            fontFamily: Fonts.bold,
            color: labelColor,
            marginBottom: 8,
            textTransform: 'uppercase',
            letterSpacing: 1.2,
            transform: [
              {
                translateY: (labelAnim?.interpolate
                  ? labelAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -2] })
                  : 0) as any,
              },
            ],
          }}
        >
          {label}
        </Animated.Text>
      )}
      <Animated.View
        style={{
          borderWidth: 2,
          borderColor,
          borderRadius: Radius.lg,
          backgroundColor: isActive ? C.surface : C.lift,
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 16,
          ...Shadow.md,
          transform: [{ scale: isActive ? 1.02 : 1 }],
        }}
      >
        {iconName && (
          <Animated.View style={{ transform: [{ scale: iconAnim }] }}>
            <Ionicons
              name={iconName}
              size={20}
              color={isFocused ? C.primary : C.hint}
              style={{ marginRight: 12 }}
            />
          </Animated.View>
        )}
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={C.hint}
          keyboardType={keyboardType}
          secureTextEntry={secureTextEntry}
          maxLength={maxLength}
          multiline={multiline}
          numberOfLines={numberOfLines}
          editable={editable}
          autoFocus={autoFocus}
          autoCapitalize={autoCapitalize}
          autoCorrect={autoCorrect}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onSubmitEditing={onSubmitEditing}
          style={[
            {
              flex: 1,
              color: C.text,
              fontSize: FontSize.lg,
              fontFamily: Fonts.medium,
              paddingVertical: 14,
              minHeight: multiline ? 100 : undefined,
            },
            inputStyle,
          ]}
        />
        {value?.length > 0 && (
          <TouchableOpacity
            onPress={() => {
              onChangeText('');
              try {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              } catch (_) {}
            }}
            style={{ padding: 4 }}
          >
            <Ionicons name="close-circle" size={18} color={C.hint} />
          </TouchableOpacity>
        )}
      </Animated.View>
      {hint && (
        <Text
          style={{ fontSize: FontSize.xs, color: C.hint, marginTop: 6, fontFamily: Fonts.regular }}
        >
          {hint}
        </Text>
      )}
    </View>
  );
}
