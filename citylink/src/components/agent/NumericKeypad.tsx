import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { DarkColors as T, Fonts } from '../../theme';

interface NumericKeypadProps {
  value: string;
  setValue: (v: string) => void;
  maxLength: number;
  onConfirm: () => void;
  confirmLoading?: boolean;
}

export function NumericKeypad({
  value,
  setValue,
  maxLength,
  onConfirm,
  confirmLoading,
}: NumericKeypadProps) {
  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'delete'];

  const onPress = (key: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (key === 'delete') {
      setValue(value.slice(0, -1));
    } else if (key === '') {
      // Gap
    } else if (value.length < maxLength) {
      setValue(value + key);
    }
  };

  return (
    <View style={s.keypadContainer}>
      {/* Pin Display */}
      <View style={s.keypadDisplay}>
        {Array.from({ length: maxLength }).map((_, i) => (
          <View
            key={i}
            style={[
              s.keypadDot,
              { backgroundColor: value.length > i ? T.primary : T.surfaceHigh },
              value.length === i && { borderColor: T.primary, borderWidth: 1 },
            ]}
          >
            {value.length > i && (
              <Text style={{ color: T.bg, fontWeight: '900', fontSize: 18 }}>{value[i]}</Text>
            )}
          </View>
        ))}
      </View>

      {/* Buttons */}
      <View style={s.keypadGrid}>
        {keys.map((key, i) => (
          <TouchableOpacity
            key={i}
            style={[s.keypadKey, key === '' && { opacity: 0 }]}
            onPress={() => onPress(key)}
            disabled={key === ''}
          >
            {key === 'delete' ? (
              <Ionicons name="backspace-outline" size={24} color={T.text} />
            ) : (
              <Text style={s.keypadKeyText}>{key}</Text>
            )}
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity
        style={[
          s.keypadConfirmBtn,
          { backgroundColor: value.length === maxLength ? T.green : T.surfaceHigh },
          confirmLoading && { opacity: 0.7 },
        ]}
        onPress={() => onConfirm()}
        disabled={value.length < maxLength || confirmLoading}
      >
        {confirmLoading ? (
          <ActivityIndicator color={T.bg} size="small" />
        ) : (
          <Text
            style={[
              s.keypadConfirmText,
              { color: value.length === maxLength ? T.bg : T.textSub, fontFamily: Fonts.headline },
            ]}
          >
            {maxLength === 6 ? 'CONFIRM PICKUP' : 'CONFIRM DELIVERY'}
          </Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  keypadContainer: {
    padding: 24,
    backgroundColor: '#0B0D11',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
  },
  keypadDisplay: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 32,
  },
  keypadDot: {
    width: 44,
    height: 52,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keypadGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 16,
  },
  keypadKey: {
    width: '28%',
    aspectRatio: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 16,
  },
  keypadKeyText: {
    color: '#E2E8F0',
    fontSize: 24,
    fontWeight: '800',
  },
  keypadConfirmBtn: {
    height: 60,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 32,
  },
  keypadConfirmText: {
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 1,
  },
});
