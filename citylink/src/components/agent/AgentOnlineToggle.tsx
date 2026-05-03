import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DarkColors as T, Fonts } from '../../theme';

interface AgentOnlineToggleProps {
  isOnline: boolean;
  onToggle: () => void;
  loading?: boolean;
}

export function AgentOnlineToggle({ isOnline, onToggle, loading }: AgentOnlineToggleProps) {
  return (
    <TouchableOpacity
      onPress={onToggle}
      disabled={loading}
      activeOpacity={0.8}
      style={[styles.container, isOnline && styles.containerOnline]}
    >
      <View style={[styles.iconBox, isOnline && styles.iconBoxOnline]}>
        <Ionicons
          name={isOnline ? 'radio' : 'radio-outline'}
          size={24}
          color={isOnline ? T.green : T.textSoft}
        />
      </View>
      <View style={styles.content}>
        <Text style={styles.title}>{isOnline ? 'YOU ARE ONLINE' : 'YOU ARE OFFLINE'}</Text>
        <Text style={styles.subtitle}>
          {isOnline ? 'Searching for jobs nearby...' : 'Go online to start receiving orders'}
        </Text>
      </View>
      {loading ? (
        <ActivityIndicator size="small" color={T.primary} />
      ) : (
        <View style={[styles.toggleTrack, isOnline && styles.toggleTrackOnline]}>
          <View style={[styles.toggleThumb, isOnline && styles.toggleThumbOnline]} />
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: T.surface,
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: T.edge,
    marginHorizontal: 20,
    marginBottom: 20,
  },
  containerOnline: {
    borderColor: T.green + '40',
    backgroundColor: T.green + '05',
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: T.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBoxOnline: {
    backgroundColor: T.green + '15',
  },
  content: {
    flex: 1,
    marginLeft: 14,
  },
  title: {
    color: T.text,
    fontSize: 14,
    fontFamily: Fonts.black,
    letterSpacing: 0.5,
  },
  subtitle: {
    color: T.textSoft,
    fontSize: 11,
    fontFamily: Fonts.medium,
    marginTop: 2,
  },
  toggleTrack: {
    width: 44,
    height: 24,
    borderRadius: 12,
    backgroundColor: T.bg,
    padding: 2,
    borderWidth: 1,
    borderColor: T.edge,
  },
  toggleTrackOnline: {
    backgroundColor: T.green,
    borderColor: T.green,
  },
  toggleThumb: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: T.textSoft,
  },
  toggleThumbOnline: {
    backgroundColor: '#FFF',
    transform: [{ translateX: 20 }],
  },
});
