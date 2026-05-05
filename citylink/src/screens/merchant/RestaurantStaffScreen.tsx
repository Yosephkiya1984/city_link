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
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MotiView, MotiText } from 'moti';
import { Screen, Typography, Surface, SectionTitle } from '../../components';
import { D, Radius, Fonts, Spacing, Shadow } from './components/StitchTheme';
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
  const [role, setRole] = useState<'waiter' | 'hostess' | 'manager' | 'chef' | 'bouncer'>('waiter');

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
        <View>
          <Typography variant="h1">Team Fleet</Typography>
          <Typography variant="hint" color="sub">Manage restaurant staff & permissions</Typography>
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={() => setShowAddModal(true)}>
          <Ionicons name="person-add" size={20} color={D.ink} />
          <Text style={styles.addBtnText}>Invite</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.summaryRow}>
          <Surface variant="flat" style={styles.summaryCard}>
            <Typography variant="h2">{staff.length}</Typography>
            <Typography variant="hint" color="sub">TOTAL STAFF</Typography>
          </Surface>
          <Surface variant="flat" style={styles.summaryCard}>
            <Typography variant="h2" color="primary">{staff.filter(s => s.role === 'waiter').length}</Typography>
            <Typography variant="hint" color="sub">WAITERS</Typography>
          </Surface>
          <Surface variant="flat" style={styles.summaryCard}>
            <Typography variant="h2" color="secondary">{staff.filter(s => s.role === 'manager').length}</Typography>
            <Typography variant="hint" color="sub">MANAGERS</Typography>
          </Surface>
        </View>

        <SectionTitle title="Current Team" />

        {loading && staff.length === 0 ? (
          <ActivityIndicator color={D.primary} style={{ marginTop: 40 }} />
        ) : staff.length === 0 ? (
          <View style={styles.emptyState}>
            <MotiView 
              from={{ scale: 0 }} 
              animate={{ scale: 1 }} 
              transition={{ type: 'spring' }}
            >
              <Ionicons name="people-outline" size={80} color={D.lift} />
            </MotiView>
            <Typography variant="title" color="sub" style={{ marginTop: 16 }}>No staff members yet</Typography>
            <Typography variant="body" color="sub" style={{ textAlign: 'center' }}>Add your waiters and managers to start managing tables.</Typography>
          </View>
        ) : (
          staff.map((s, index) => (
            <MotiView 
              key={s.id} 
              from={{ opacity: 0, translateX: -20 }}
              animate={{ opacity: 1, translateX: 0 }}
              transition={{ delay: index * 100 }}
            >
              <Surface variant="lift" style={styles.staffCard}>
                <View style={styles.avatar}>
                  {s.profile?.avatar_url ? (
                    <Image source={{ uri: s.profile.avatar_url }} style={styles.avatarImg} />
                  ) : (
                    <Ionicons name="person" size={24} color={D.primary} />
                  )}
                  <View style={styles.onlineIndicator} />
                </View>
                <View style={styles.info}>
                  <Typography variant="title">{s.profile?.full_name || 'Pending Invite...'}</Typography>
                  <View style={styles.roleBadge}>
                    <Text style={styles.roleText}>{s.role.toUpperCase()}</Text>
                  </View>
                  <Typography variant="hint" color="sub">{s.profile?.phone || s.phone}</Typography>
                </View>
                <TouchableOpacity onPress={() => onRemoveStaff(s.id)} style={styles.removeBtn}>
                  <Ionicons name="close-circle" size={24} color={D.red + '80'} />
                </TouchableOpacity>
              </Surface>
            </MotiView>
          ))
        )}
      </ScrollView>

      {/* Add Staff Modal */}
      <Modal visible={showAddModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <Surface variant="lift" style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View>
                <Typography variant="h2">Invite Staff</Typography>
                <Typography variant="hint" color="sub">Enter phone to send invitation</Typography>
              </View>
              <TouchableOpacity onPress={() => setShowAddModal(false)} style={styles.closeBtn}>
                <Ionicons name="close" size={24} color={D.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.inputGroup}>
              <Typography variant="hint" color="sub" style={styles.label}>PHONE NUMBER</Typography>
              <TextInput
                style={styles.input}
                placeholder="0911..."
                placeholderTextColor={D.edge}
                keyboardType="phone-pad"
                value={phone}
                onChangeText={setPhone}
              />
            </View>

            <Typography variant="hint" color="sub" style={styles.label}>ASSIGN ROLE</Typography>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.roleScroll}>
              {(['waiter', 'hostess', 'chef', 'manager', 'bouncer'] as const).map((r) => (
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
            </ScrollView>

            <TouchableOpacity 
              style={[styles.submitBtn, loading && { opacity: 0.7 }]} 
              onPress={onAddStaff}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={D.ink} />
              ) : (
                <Typography variant="h3" style={{ color: D.ink }}>Send Invitation</Typography>
              )}
            </TouchableOpacity>
          </Surface>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: D.ink },
  header: { padding: Spacing.xl, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  addBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: D.primary, paddingHorizontal: 20, paddingVertical: 12, borderRadius: Radius.lg, ...Shadow.primary },
  addBtnText: { marginLeft: 8, fontFamily: Fonts.bold, color: D.ink },
  content: { padding: Spacing.xl },
  summaryRow: { flexDirection: 'row', gap: 12, marginBottom: 32 },
  summaryCard: { flex: 1, padding: 16, borderRadius: Radius.lg, alignItems: 'center', backgroundColor: D.surface },
  staffCard: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: Radius.xl, marginBottom: 12 },
  avatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: D.surface, alignItems: 'center', justifyContent: 'center', marginRight: 16, borderWidth: 2, borderColor: D.edge },
  avatarImg: { width: '100%', height: '100%', borderRadius: 28 },
  onlineIndicator: { position: 'absolute', bottom: 2, right: 2, width: 14, height: 14, borderRadius: 7, backgroundColor: '#4CAF50', borderWidth: 2, borderColor: D.surface },
  info: { flex: 1 },
  roleBadge: { alignSelf: 'flex-start', backgroundColor: D.primary + '20', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, marginVertical: 4 },
  roleText: { fontSize: 10, fontFamily: Fonts.black, color: D.primary },
  removeBtn: { padding: 8 },
  emptyState: { alignItems: 'center', marginTop: 60, padding: 40 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: Radius.xl, borderTopRightRadius: Radius.xl, padding: Spacing.xl, paddingBottom: 40 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 },
  closeBtn: { padding: 8, backgroundColor: D.surface, borderRadius: 20 },
  inputGroup: { marginBottom: 24 },
  label: { marginBottom: 8, letterSpacing: 1 },
  input: { backgroundColor: D.surface, borderRadius: Radius.lg, padding: 16, color: D.text, fontFamily: Fonts.bold, borderWidth: 1, borderColor: D.edge },
  roleScroll: { marginBottom: 32 },
  roleBtn: { paddingHorizontal: 20, paddingVertical: 12, borderRadius: Radius.md, backgroundColor: D.surface, marginRight: 8, borderWidth: 1, borderColor: D.edge },
  roleBtnActive: { backgroundColor: D.primary, borderColor: D.primary },
  roleBtnText: { fontSize: 12, fontFamily: Fonts.bold, color: D.sub },
  roleBtnTextActive: { color: D.ink },
  submitBtn: { backgroundColor: D.primary, paddingVertical: 18, borderRadius: Radius.xl, alignItems: 'center', ...Shadow.primary },
});
