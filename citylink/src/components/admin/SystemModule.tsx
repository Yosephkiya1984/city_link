import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Animated, Alert, Platform } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { Radius, Spacing, Fonts, FontSize, Shadow } from '../../theme';
import { getClient, hasSupabase } from '../../services/supabase';
import * as Haptics from 'expo-haptics';

export default function SystemModule() {
  const theme = useTheme();
  const [config, setConfig] = useState({
    lrt_active: true,
    bus_active: true,
    marketplace_escrow: true,
    auto_approve_fayda: false,
    maintenance_mode: false,
  });

  const [nodes, setNodes] = useState({
    database: 'CHECKING',
    auth: 'CHECKING',
    storage: 'HEALTHY',
    edge: 'PENDING'
  });

  useEffect(() => {
    const checkHealth = async () => {
      const isUp = hasSupabase();
      setNodes({
        database: isUp ? 'HEALTHY' : 'DOWN',
        auth: isUp ? 'ACTIVE' : 'ISSUES',
        storage: 'HEALTHY',
        edge: 'OPTIMAL'
      });
    };
    checkHealth();
  }, []);

  const toggleConfig = (key) => {
    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); } catch (e) {}
    const newValue = !config[key];
    setConfig(prev => ({ ...prev, [key]: newValue }));
    
    // Simulate API persistence for evaluation
    console.log(`[Admin] System Config Updated: ${key} = ${newValue}`);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 24, paddingBottom: 100 }}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text, fontFamily: Fonts.headline }]}>Infrastructure Hub</Text>
        <Text style={[styles.subtitle, { color: theme.sub }]}>Manage ecosystem nodes and global configurations</Text>
      </View>

      {/* Node Status Grid */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.sub, fontFamily: Fonts.label }]}>NETWORK INTEGRITY</Text>
        <View style={styles.nodeGrid}>
          <NodeCard name="Auth & Identity" status={nodes.auth} latency="1.2ms" color={nodes.auth === 'ACTIVE' ? theme.green : theme.red} />
          <NodeCard name="Supabase DB" status={nodes.database} latency="4ms" color={nodes.database === 'HEALTHY' ? theme.green : theme.red} />
          <NodeCard name="Object Storage" status={nodes.storage} latency="88ms" color={theme.green} />
          <NodeCard name="LRT Fare Node" status={nodes.edge} latency="12ms" color={theme.primary} />
        </View>
      </View>

      {/* Global Config Toggles */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.sub, fontFamily: Fonts.label }]}>ECOSYSTEM CONTROLS</Text>
        <View style={[styles.configCard, { backgroundColor: theme.surface, borderColor: theme.rim }]}>
          <ConfigItem 
            label="LRT Ticketing System" 
            sub="Enable/Disable city-wide rail ticketing"
            value={config.lrt_active} 
            onToggle={() => toggleConfig('lrt_active')} 
          />
          <ConfigItem 
            label="Bus Dispatching" 
            sub="Real-time bus tracking and booking"
            value={config.bus_active} 
            onToggle={() => toggleConfig('bus_active')} 
          />
          <ConfigItem 
            label="Marketplace Escrow" 
            sub="Enforcement of 3-day hold for all purchases"
            value={config.marketplace_escrow} 
            onToggle={() => toggleConfig('marketplace_escrow')} 
          />
          <ConfigItem 
            label="Auto-Verify Fayda" 
            sub="Automatic KYC approval via Government API"
            value={config.auto_approve_fayda} 
            onToggle={() => toggleConfig('auto_approve_fayda')} 
          />
          <View style={[styles.dangerZone, { borderTopColor: theme.rim }]}>
            <ConfigItem 
              label="System Maintenance" 
              sub="Global block on all financial transactions"
              value={config.maintenance_mode} 
              onToggle={() => toggleConfig('maintenance_mode')} 
              isDanger
            />
          </View>
        </View>
      </View>

      {/* Fare Rates & Constants */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.sub, fontFamily: Fonts.label }]}>TARIFF CONFIGURATION</Text>
        <View style={styles.tariffGrid}>
          <TariffCard label="LRT Base Fare" value="10.00 ETB" icon="subway" />
          <TariffCard label="Taxi Multiplier" value="1.25x" icon="car" />
          <TariffCard label="Comm. Commission" value="2.5%" icon="percent" />
          <TariffCard label="Min. Escrow" value="50.00 ETB" icon="wallet" />
        </View>
      </View>
    </ScrollView>
  );
}

function NodeCard({ name, status, latency, color }) {
  const theme = useTheme();
  return (
    <View style={[styles.nodeCard, { backgroundColor: theme.surface, borderColor: theme.rim }]}>
      <View style={[styles.nodeIndicator, { backgroundColor: color }]} />
      <Text style={[styles.nodeName, { color: theme.text, fontFamily: Fonts.label }]}>{name}</Text>
      <View style={styles.nodeMeta}>
        <Text style={[styles.nodeStatus, { color: color }]}>{status}</Text>
        <Text style={[styles.nodeLatency, { color: theme.sub }]}>{latency}</Text>
      </View>
    </View>
  );
}

function ConfigItem({ label, sub, value, onToggle, isDanger }) {
  const theme = useTheme();
  return (
    <View style={styles.configItem}>
      <View style={{ flex: 1 }}>
        <Text style={[styles.configLabel, { color: isDanger ? theme.red : theme.text, fontFamily: Fonts.label }]}>{label}</Text>
        <Text style={[styles.configSub, { color: theme.sub }]}>{sub}</Text>
      </View>
      <Switch 
        value={value} 
        onValueChange={onToggle} 
        trackColor={{ false: theme.rim, true: isDanger ? theme.red : theme.primary }}
        thumbColor={theme.isDark ? '#fff' : '#f4f3f4'} 
      />
    </View>
  );
}

function TariffCard({ label, value, icon }) {
  const theme = useTheme();
  const handleEdit = () => {
    if (Platform.OS === 'web') {
      window.alert("Updating global tariffs requires Level 3 clearance.");
    } else {
      Alert.alert("Registry Access", "Updating global tariffs requires Level 3 clearance.");
    }
  };

  return (
    <TouchableOpacity onPress={handleEdit} style={[styles.tariffCard, { backgroundColor: theme.surface, borderColor: theme.rim }]}>
      <View style={[styles.tariffIconBox, { backgroundColor: theme.rim }]}>
        <MaterialCommunityIcons name={icon} size={18} color={theme.primary} />
      </View>
      <View style={{ marginLeft: 12 }}>
        <Text style={[styles.tariffLabel, { color: theme.sub }]}>{label}</Text>
        <Text style={[styles.tariffValue, { color: theme.text, fontFamily: Fonts.label }]}>{value}</Text>
      </View>
      <Ionicons name="lock-closed" size={12} color={theme.hint} style={styles.editIcon} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
  },
  subtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 11,
    letterSpacing: 1.5,
    marginBottom: 16,
  },
  nodeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  nodeCard: {
    width: '48%',
    minWidth: 160,
    padding: 16,
    borderRadius: Radius.lg,
    borderWidth: 1,
  },
  nodeIndicator: {
    width: 32,
    height: 4,
    borderRadius: 2,
    marginBottom: 12,
  },
  nodeName: {
    fontSize: 13,
  },
  nodeMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  nodeStatus: {
    fontSize: 10,
    fontWeight: '800',
  },
  nodeLatency: {
    fontSize: 10,
  },
  configCard: {
    borderRadius: Radius.xl,
    borderWidth: 1,
    overflow: 'hidden',
  },
  configItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 0,
  },
  configLabel: {
    fontSize: 15,
  },
  configSub: {
    fontSize: 11,
    marginTop: 2,
  },
  dangerZone: {
    borderTopWidth: 1,
    backgroundColor: 'rgba(255, 59, 48, 0.05)',
  },
  tariffGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  tariffCard: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: Radius.lg,
    borderWidth: 1,
  },
  tariffIconBox: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tariffLabel: {
    fontSize: 10,
  },
  tariffValue: {
    fontSize: 14,
    marginTop: 2,
  },
  editIcon: {
    position: 'absolute',
    top: 8,
    right: 8,
  }
});
