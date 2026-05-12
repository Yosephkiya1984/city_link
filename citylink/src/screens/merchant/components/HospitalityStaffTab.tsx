import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Typography, GlassCard, GlassView, SectionTitle } from '../../../components';
import { useTheme } from '../../../hooks/useTheme';
import { Radius, Spacing, Fonts, Shadow, D } from '../../../components/hospitality/HospitalityTheme';

export function HospitalityStaffTab({ staff, loading, onAddStaff, onRemoveStaff, t }: any) {
  const C = useTheme();
  const D = C;
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <SectionTitle 
        title="TEAM MEMBERS" 
        rightLabel="ADD STAFF" 
        onRightPress={onAddStaff} 
      />

      {staff.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="people-outline" size={64} color={C.text} opacity={0.3} />
          <Typography variant="body" color="sub" style={{ marginTop: 16 }}>No staff members added</Typography>
        </View>
      ) : (
        staff.map((member: any) => (
          <GlassCard key={member.id} accentColor={member.role === 'manager' ? C.gold : C.primary} style={{ marginBottom: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 }}>
              <View style={[styles.avatar, { backgroundColor: C.primary + '15' }]}>
                <Typography variant="h2" color="primary">
                  {(member.profile?.full_name || member.role || '?').charAt(0).toUpperCase()}
                </Typography>
              </View>
              
              <View style={styles.info}>
                <Typography variant="title">{member.profile?.full_name || 'Unnamed Member'}</Typography>
                <View style={[styles.roleTag, { backgroundColor: C.surface }]}>
                  <Typography variant="hint" style={{ fontSize: 8, letterSpacing: 1, color: C.sub }}>
                    {member.role?.toUpperCase() || 'STAFF'}
                  </Typography>
                </View>
                <Typography variant="hint" color="sub" style={{ marginTop: 4 }}>
                  {member.profile?.phone}
                </Typography>
              </View>

              <View style={styles.statusBox}>
                <View style={[styles.dot, { backgroundColor: member.status === 'active' ? C.primary : C.sub }]} />
                <Typography variant="hint" color="sub" style={{ fontSize: 10 }}>
                  {member.status || 'offline'}
                </Typography>
              </View>

              <TouchableOpacity 
                style={styles.deleteBtn}
                onPress={() => onRemoveStaff(member.id)}
              >
                <Ionicons name="trash-outline" size={20} color={C.red} />
              </TouchableOpacity>
            </View>
          </GlassCard>
        ))
      )}
      
      <GlassView variant="outline" style={styles.rolesInfo}>
        <Typography variant="h3">Role Permissions</Typography>
        <View style={styles.roleDesc}>
          <Text style={styles.bold}>WAITER:</Text>
          <Text style={styles.desc}>Floor plan access, table ordering, KDS ready view.</Text>
        </View>
        <View style={styles.roleDesc}>
          <Text style={styles.bold}>CHEF:</Text>
          <Text style={styles.desc}>Full KDS access, inventory management.</Text>
        </View>
        <View style={styles.roleDesc}>
          <Text style={styles.bold}>MANAGER:</Text>
          <Text style={styles.desc}>Full dashboard access, finance, team management.</Text>
        </View>
      </GlassView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: D.base },
  content: { padding: Spacing.md },
  card: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    padding: Spacing.md, 
    borderRadius: Radius.xl, 
    marginBottom: Spacing.md,
    gap: 12,
  },
  avatar: { 
    width: 50, 
    height: 50, 
    borderRadius: 25, 
    backgroundColor: D.primary + '20', 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  info: { flex: 1 },
  roleTag: { 
    alignSelf: 'flex-start', 
    backgroundColor: D.text + '10', 
    paddingHorizontal: 8, 
    paddingVertical: 2, 
    borderRadius: Radius.sm,
    marginTop: 2,
  },
  roleText: { fontFamily: Fonts.black, fontSize: 8, color: D.text, letterSpacing: 1 },
  phone: { fontFamily: Fonts.medium, fontSize: 12, color: D.textSecondary, marginTop: 4 },
  statusBox: { flexDirection: 'row', alignItems: 'center', gap: 6, marginRight: 8 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { fontFamily: Fonts.bold, fontSize: 10, color: D.textSecondary, textTransform: 'uppercase' },
  deleteBtn: { padding: 8 },
  rolesInfo: { marginTop: Spacing.xl, padding: Spacing.lg, backgroundColor: D.edge, borderRadius: Radius.xl },
  roleDesc: { flexDirection: 'row', marginTop: 8, gap: 8 },
  bold: { fontFamily: Fonts.black, fontSize: 10, color: D.text, width: 70 },
  desc: { flex: 1, fontFamily: Fonts.medium, fontSize: 11, color: D.textSecondary },
  empty: { alignItems: 'center', paddingVertical: 100, opacity: 0.5 },
  emptyText: { fontFamily: Fonts.bold, color: D.textSecondary, marginTop: Spacing.md },
});
