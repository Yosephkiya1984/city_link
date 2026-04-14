import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';

export default function OfflineBanner() {
  const C = useTheme();
  const [visible, setVisible] = React.useState(true);

  if (!visible) return null;

  return (
    <View style={[styles.container, { backgroundColor: C.amber, borderColor: C.amber }]}>
      <Ionicons name="alert-circle" size={16} color={C.white} />
      <Text style={[styles.text, { color: C.white }]}>
        No internet connection - Some features may be limited
      </Text>
      <TouchableOpacity onPress={() => setVisible(false)}>
        <Ionicons name="close" size={16} color={C.white} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    gap: 8,
  },
  text: {
    flex: 1,
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
  },
});
