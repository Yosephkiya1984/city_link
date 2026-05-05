import React from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MotiView, AnimatePresence } from 'moti';
import { D, Radius, Fonts, Spacing, Shadow } from './StitchTheme';
import { Typography, Surface } from '../../../components';

interface TableManagementModalProps {
  visible: boolean;
  onClose: () => void;
  table: any;
  staff: any[];
  onSetStatus: (tableId: string, status: any) => void;
  onAssignStaff: (tableId: string, staffId: string) => void;
}

export const TableManagementModal: React.FC<TableManagementModalProps> = ({
  visible,
  onClose,
  table,
  staff = [],
  onSetStatus,
  onAssignStaff,
}) => {
  if (!table) return null;

  const STATUSES = [
    { id: 'free', label: 'FREE', color: D.primary, icon: 'checkmark-circle' },
    { id: 'reserved', label: 'RESERVED', color: D.secondary, icon: 'calendar' },
    { id: 'serving', label: 'SERVING', color: D.gold, icon: 'restaurant' },
    { id: 'cleaning', label: 'CLEANING', color: D.red, icon: 'brush' },
  ];

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <Surface variant="lift" style={styles.container}>
          <View style={styles.header}>
            <View>
              <Typography variant="h1">Table {table.table_number}</Typography>
              <Typography variant="body" color="sub">Capacity: {table.capacity} Guests</Typography>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color={D.text} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.section}>
              <Typography variant="h3" style={{ marginBottom: 12 }}>Change Status</Typography>
              <View style={styles.statusGrid}>
                {STATUSES.map((s) => (
                  <TouchableOpacity
                    key={s.id}
                    onPress={() => onSetStatus(table.id, s.id)}
                    style={[
                      styles.statusBtn,
                      table.status === s.id && { backgroundColor: s.color + '20', borderColor: s.color }
                    ]}
                  >
                    <Ionicons name={s.icon as any} size={20} color={table.status === s.id ? s.color : D.sub} />
                    <Text style={[styles.statusText, table.status === s.id && { color: s.color }]}>
                      {s.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.section}>
              <Typography variant="h3" style={{ marginBottom: 12 }}>Assign Waiter</Typography>
              {staff.length === 0 ? (
                <Typography variant="body" color="sub">No staff members available.</Typography>
              ) : (
                <View style={styles.staffList}>
                  {staff.map((s) => (
                    <TouchableOpacity
                      key={s.id}
                      onPress={() => onAssignStaff(table.id, s.id)}
                      style={[
                        styles.staffCard,
                        table.waiter_id === s.id && { borderColor: D.primary, backgroundColor: D.primary + '10' }
                      ]}
                    >
                      <View style={styles.staffAvatar}>
                        <Typography variant="h3" color="ink">{s.full_name?.charAt(0)}</Typography>
                      </View>
                      <View style={{ flex: 1, marginLeft: 12 }}>
                        <Typography variant="title">{s.full_name}</Typography>
                        <Typography variant="hint" color="sub">{s.role}</Typography>
                      </View>
                      {table.waiter_id === s.id && (
                        <Ionicons name="checkmark-circle" size={20} color={D.primary} />
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          </ScrollView>

          <TouchableOpacity style={styles.doneBtn} onPress={onClose}>
            <Text style={styles.doneBtnText}>Save & Close</Text>
          </TouchableOpacity>
        </Surface>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  container: {
    maxHeight: '80%',
    padding: Spacing.xl,
    borderRadius: Radius.xl,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: D.lift,
    alignItems: 'center',
    justifyContent: 'center',
  },
  section: {
    marginBottom: 24,
  },
  statusGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statusBtn: {
    flexBasis: '48%',
    flexGrow: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    backgroundColor: D.lift,
    borderWidth: 1,
    borderColor: D.edge,
  },
  statusText: {
    fontSize: 12,
    fontFamily: Fonts.black,
    color: D.sub,
    marginLeft: 10,
    letterSpacing: 1,
  },
  staffList: {
    gap: 10,
  },
  staffCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 16,
    backgroundColor: D.lift,
    borderWidth: 1,
    borderColor: D.edge,
  },
  staffAvatar: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: D.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneBtn: {
    backgroundColor: D.primary,
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 12,
    ...Shadow.primary,
  },
  doneBtnText: {
    fontSize: 15,
    fontFamily: Fonts.black,
    color: D.ink,
  },
});
