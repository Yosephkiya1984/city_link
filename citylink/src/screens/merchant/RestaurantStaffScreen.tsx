import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '../../components';
import { D, Radius, Fonts } from './components/StitchTheme';
import { useAuthStore } from '../../store/AuthStore';
import { useSystemStore } from '../../store/SystemStore';
import { HospitalityService } from '../../services/hospitality.service';

export default function RestaurantStaffScreen() {
  const currentUser = useAuthStore((s) => s.currentUser);
  const showToast = useSystemStore((s) => s.showToast);
  const [staff, setStaff] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<'waiter' | 'hostess' | 'manager'>('waiter');

  const loadStaff = async () => {
    if (!currentUser?.id) return;
    try {
      const data = await HospitalityService.getMerchantStaff(currentUser.id);
      setStaff(data || []);
    } catch (err) {
      console.error('Failed to load staff:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStaff();
  }, []);

  const onAddStaff = async () => {
    if (!phone || phone.length < 9) {
      showToast('Please enter a valid phone number', 'warning');
      return;
    }
    
    try {
      setLoading(true);
      await HospitalityService.addStaffMember(currentUser!.id, phone, role);
      showToast('Staff member added successfully', 'success');
      setPhone('');
      setShowAddModal(false);
      loadStaff();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to add staff');
    } finally {
      setLoading(false);
    }
  };

  const onRemoveStaff = async (staffId: string) => {
    Alert.alert(
      'Remove Staff',
      'Are you sure you want to remove this staff member?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await HospitalityService.removeStaffMember(staffId);
              showToast('Staff member removed', 'info');
              loadStaff();
            } catch (err: any) {
              showToast('Failed to remove staff', 'error');
            }
          },
        },
      ]
    );
  };

  return (
    <Screen style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Staff Management</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => setShowAddModal(true)}>
          <Ionicons name="person-add" size={20} color={D.ink} />
          <Text style={styles.addBtnText}>Add Staff</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {loading && staff.length === 0 ? (
          <ActivityIndicator color={D.primary} style={{ marginTop: 40 }} />
        ) : staff.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="people-outline" size={64} color={D.lift} />
            <Text style={styles.emptyText}>No staff members added yet.</Text>
          </View>
        ) : (
          staff.map((s) => (
            <View key={s.id} style={styles.staffCard}>
              <View style={styles.avatar}>
                <Ionicons name="person" size={24} color={D.primary} />
              </View>
              <View style={styles.info}>
                <Text style={styles.name}>{s.profile?.full_name || 'Pending...'}</Text>
                <Text style={styles.role}>{s.role.toUpperCase()}</Text>
                <Text style={styles.phone}>{s.profile?.phone}</Text>
              </View>
              <TouchableOpacity onPress={() => onRemoveStaff(s.id)}>
                <Ionicons name="trash-outline" size={20} color={D.red} />
              </TouchableOpacity>
            </View>
          ))
        )}
      </ScrollView>

      {/* Add Staff Modal */}
      <Modal visible={showAddModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Staff Member</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <Ionicons name="close" size={24} color={D.sub} />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Phone Number</Text>
            <TextInput
              style={styles.input}
              placeholder="0911..."
              placeholderTextColor={D.sub}
              keyboardType="phone-pad"
              value={phone}
              onChangeText={setPhone}
            />

            <Text style={styles.inputLabel}>Role</Text>
            <View style={styles.roleContainer}>
              {(['waiter', 'hostess', 'manager'] as const).map((r) => (
                <TouchableOpacity
                  key={r}
                  style={[styles.roleBtn, role === r && styles.roleBtnActive]}
                  onPress={() => setRole(r)}
                >
                  <Text style={[styles.roleBtnText, role === r && styles.roleBtnTextActive]}>
                    {r.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity 
              style={[styles.submitBtn, loading && { opacity: 0.7 }]} 
              onPress={onAddStaff}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={D.ink} />
              ) : (
                <Text style={styles.submitBtnText}>Add to Team</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: D.ink },
  header: {
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: D.edge,
  },
  title: { fontSize: 24, fontFamily: Fonts.black, color: D.white },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: D.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: Radius.m,
  },
  addBtnText: { marginLeft: 8, fontFamily: Fonts.bold, color: D.ink },
  content: { padding: 20 },
  staffCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: D.surface,
    padding: 16,
    borderRadius: Radius.l,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: D.edge,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: D.lift,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  info: { flex: 1 },
  name: { fontSize: 16, fontFamily: Fonts.bold, color: D.white },
  role: { fontSize: 12, color: D.primary, marginTop: 2, fontFamily: Fonts.black },
  phone: { fontSize: 12, color: D.sub, marginTop: 2 },
  emptyState: { alignItems: 'center', marginTop: 100 },
  emptyText: { color: D.sub, marginTop: 16, fontFamily: Fonts.medium },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: D.surface,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: { fontSize: 20, fontFamily: Fonts.black, color: D.white },
  inputLabel: { fontSize: 14, fontFamily: Fonts.bold, color: D.sub, marginBottom: 8 },
  input: {
    backgroundColor: D.lift,
    borderRadius: Radius.m,
    padding: 16,
    color: D.white,
    fontFamily: Fonts.medium,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: D.edge,
  },
  roleContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 32,
  },
  roleBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: Radius.m,
    backgroundColor: D.lift,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: D.edge,
  },
  roleBtnActive: {
    backgroundColor: D.primary,
    borderColor: D.primary,
  },
  roleBtnText: { fontSize: 11, fontFamily: Fonts.black, color: D.sub },
  roleBtnTextActive: { color: D.ink },
  submitBtn: {
    backgroundColor: D.primary,
    paddingVertical: 18,
    borderRadius: Radius.l,
    alignItems: 'center',
  },
  submitBtnText: { fontSize: 16, fontFamily: Fonts.black, color: D.ink },
});
