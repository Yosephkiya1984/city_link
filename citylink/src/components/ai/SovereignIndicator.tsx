import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MotiView } from 'moti';
import { useSystemStore } from '../../store/SystemStore';
import { Colors, DarkColors } from '../../theme';

export const SovereignIndicator = () => {
  const isDark = useSystemStore((s) => s.isDark);
  const C = isDark ? DarkColors : Colors;
  const [status, setStatus] = useState<'local' | 'cloud' | 'checking'>('checking');

  useEffect(() => {
    const checkConnectivity = async () => {
      try {
        // Try to reach the local AI proxy (assuming it's running on the edge function fallback path)
        // Or we can just mock it for now based on a system store flag if we have one
        // For this demo, let's pretend we check the actual local AI health
        const start = Date.now();
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 2000);

        // This is a placeholder for the actual local AI health check
        // In a real sovereign app, this would ping the local Ollama endpoint or bridge
        const isLocalHealthy = Math.random() > 0.2; // 80% chance for demo
        
        clearTimeout(timeout);
        setStatus(isLocalHealthy ? 'local' : 'cloud');
      } catch (e) {
        setStatus('cloud');
      }
    };

    checkConnectivity();
    const interval = setInterval(checkConnectivity, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <MotiView
      from={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      style={[
        styles.container,
        { backgroundColor: status === 'local' ? '#00A86B20' : '#3B82F620' }
      ]}
    >
      <Ionicons 
        name={status === 'local' ? "shield-checkmark" : "cloud-done"} 
        size={14} 
        color={status === 'local' ? "#00A86B" : "#3B82F6"} 
      />
      <View style={[
        styles.dot, 
        { backgroundColor: status === 'local' ? "#00A86B" : "#3B82F6" }
      ]} />
    </MotiView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  }
});
