import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { D, Spacing, Radius, Fonts, Shadow } from './StitchTheme';
import { Typography, Surface, SectionTitle } from '../../../components';

export function HospitalityStaffTab({ staff, loading, onAddStaff, onRemoveStaff, t }: any) {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <SectionTitle 
        title="TEAM MEMBERS" 
        rightLabel="ADD STAFF" 
        onRightPress={onAddStaff} 
      />

      {staff.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="people-outline" size={64} color={D.edge} />
          <Text style={styles.emptyText}>No staff members added</Text>
        </View>
      ) : (
        staff.map((member: any) => (
          <Surface key={member.id} variant="lift" style={styles.card}>
            <View style={styles.avatar}>
              <Typography variant="h2" color="ink">
                {(member.profile?.full_name || member.role || '?').charAt(0).toUpperCase()}
              </Typography>
            </View>
            
            <View style={styles.info}>
              <Typography variant="title">{member.profile?.full_name || 'Unnamed Member'}</Typography>
              <View style={styles.roleTag}>
                <Text style={styles.roleText}>{member.role?.toUpperCase() || 'STAFF'}</Text>
              </View>
              <Text style={styles.phone}>{member.profile?.phone}</Text>
            </View>

            <View style={styles.statusBox}>
              <View style={[styles.dot, { backgroundColor: member.status === 'active' ? D.primary : D.sub }]} />
              <Text style={styles.statusText}>{member.status || 'offline'}</Text>
            </View>

            <TouchableOpacity 
              style={styles.deleteBtn}
              onPress={() => onRemoveStaff(member.id)}
            >
              <Ionicons name="trash-outline" size={20} color={D.error} />
            </TouchableOpacity>
          </Surface>
        ))
      )}
      
      <View style={styles.rolesInfo}>
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
      </View>
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
    borderRadius: Radius.s,
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
