import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Dimensions, Modal, TextInput, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MotiView, AnimatePresence } from 'moti';
import { Typography, GlassCard, GlassView } from '..';
import { useTheme } from '../../hooks/useTheme';
import { Radius, Spacing, Fonts, Shadow } from './HospitalityTheme';

const { width } = Dimensions.get('window');
const GRID_COUNT = 8;
const CELL_SIZE = (width - 64) / GRID_COUNT;

export function VisualTableBuilder({ 
  tables = [], 
  onUpdatePosition = () => {}, 
  onAddTable, 
  onDeleteTable,
  onTablePress,
  selectedTableId: externalSelectedId,
  hideControls = false
}: any) {
  const C = useTheme();
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedTableId, setSelectedTableId] = useState<string | null>(externalSelectedId || null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTableNum, setNewTableNum] = useState('');
  const [newCapacity, setNewCapacity] = useState('4');

  useEffect(() => {
    if (externalSelectedId !== undefined) {
      setSelectedTableId(externalSelectedId);
    }
  }, [externalSelectedId]);

  const onTableSelect = (table: any) => {
    if (isEditMode) {
      setSelectedTableId(table.id === selectedTableId ? null : table.id);
    } else {
      setSelectedTableId(table.id); // Immediate visual feedback
      if (onTablePress) onTablePress(table);
    }
  };

  const handleGridPress = (e: any) => {
    if (!isEditMode || !selectedTableId) return;

    const { locationX, locationY } = e.nativeEvent;
    
    // Snap to grid
    const col = Math.floor(locationX / CELL_SIZE);
    const row = Math.floor(locationY / CELL_SIZE);
    
    if (col >= 0 && col < GRID_COUNT && row >= 0 && row < GRID_COUNT) {
      onUpdatePosition(selectedTableId, col * CELL_SIZE, row * CELL_SIZE);
    }
  };

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'occupied': return { color: C.red, bg: C.red + '10', icon: 'restaurant', label: 'Occupied' };
      case 'reserved': return { color: C.secondary, bg: C.secondary + '10', icon: 'calendar', label: 'Reserved' };
      default: return { color: C.primary, bg: C.primary + '10', icon: 'checkmark-circle', label: 'Free' };
    }
  };

  return (
    <GlassCard style={[styles.outerContainer, hideControls && { padding: 0, borderWidth: 0, backgroundColor: 'transparent' }]}>
      {!hideControls && (
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Typography variant="h3">Floor Plan</Typography>
            <Typography variant="body" color="sub" style={{ fontSize: 11 }}>
              {isEditMode ? "Reposition tables on the grid" : "Live service monitoring"}
            </Typography>
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity 
              style={[styles.editToggle, { borderColor: C.primary + '50', backgroundColor: C.primary + '10' }, isEditMode && { backgroundColor: C.primary, borderColor: C.primary }]} 
              onPress={() => {
                setIsEditMode(!isEditMode);
                setSelectedTableId(null);
              }}
            >
              <Ionicons name={isEditMode ? "checkmark" : "build-outline"} size={16} color={isEditMode ? C.base : C.primary} />
              <Typography variant="title" style={{ fontSize: 12, marginLeft: 6, color: isEditMode ? C.base : C.primary }}>
                {isEditMode ? "Save" : "Edit"}
              </Typography>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <GlassView variant="outline" style={[styles.gridWrapper, hideControls && { marginTop: 0 }]}>
        <TouchableOpacity 
          activeOpacity={1} 
          onPress={handleGridPress}
          style={[styles.gridInner, { width: width - 64, height: (width - 64) }]}
        >
          {/* Background Grid Lines */}
          <View style={StyleSheet.absoluteFill}>
            {Array.from({ length: GRID_COUNT + 1 }).map((_, i) => (
              <View key={`h-${i}`} style={[styles.gridLineH, { top: i * CELL_SIZE }]} />
            ))}
            {Array.from({ length: GRID_COUNT + 1 }).map((_, i) => (
              <View key={`v-${i}`} style={[styles.gridLineV, { left: i * CELL_SIZE }]} />
            ))}
          </View>

          {/* Tables */}
          {tables.map((table: any) => {
            const status = getStatusInfo(table.status || 'free');
            const isSelected = table.id === selectedTableId;
            
            return (
              <MotiView
                key={table.id}
                animate={{ 
                  left: table.x_pos || 0, 
                  top: table.y_pos || 0,
                  scale: isSelected ? 1.05 : 1
                }}
                style={[
                  styles.tableCard,
                  { 
                    width: CELL_SIZE - 4, 
                    height: CELL_SIZE - 4,
                    backgroundColor: isSelected ? C.primary + '30' : status.bg,
                    borderColor: isSelected ? C.primary : status.color + '40',
                    borderWidth: isSelected ? 2 : 1,
                  }
                ]}
              >
                <TouchableOpacity 
                  style={styles.tableTouch} 
                  onPress={() => onTableSelect(table)}
                >
                  <View style={[styles.statusDot, { backgroundColor: status.color }]} />
                  <Typography variant="h2" style={{ color: isSelected ? C.primary : C.text, fontSize: 18 }}>
                    {table.table_number}
                  </Typography>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Ionicons name="people" size={8} color={C.sub} />
                    <Typography variant="hint" color="sub" style={{ fontSize: 9, marginLeft: 2 }}>
                      {table.capacity}
                    </Typography>
                  </View>
                  
                  {table.status !== 'free' && (
                    <MotiView 
                      animate={{ opacity: [0.4, 1, 0.4] }}
                      transition={{ loop: true, duration: 2000 }}
                      style={styles.pulseContainer}
                    >
                      <Ionicons name={status.icon as any} size={10} color={status.color} />
                    </MotiView>
                  )}
                </TouchableOpacity>
              </MotiView>
            );
          })}
        </TouchableOpacity>
      </GlassView>

      {!hideControls && (
        <>
          <View style={[styles.legend, { borderTopColor: C.edge }]}>
            {[
              { label: 'Free', color: C.primary },
              { label: 'Reserved', color: C.secondary },
              { label: 'Occupied', color: C.red },
            ].map((item, idx) => (
              <View key={idx} style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: item.color }]} />
                <Typography variant="hint" color="sub">{item.label}</Typography>
              </View>
            ))}
          </View>

          <AnimatePresence>
            {isEditMode && (
              <MotiView 
                from={{ opacity: 0, translateY: 10 }}
                animate={{ opacity: 1, translateY: 0 }}
                exit={{ opacity: 0, translateY: 10 }}
                style={styles.editActions}
              >
                <TouchableOpacity 
                  style={[styles.addTableBtn, { backgroundColor: C.primary + '10' }]} 
                  onPress={() => setShowAddModal(true)}
                >
                  <Ionicons name="add-circle" size={20} color={C.primary} />
                  <Typography variant="title" style={{ marginLeft: 8, color: C.primary }}>Add Table</Typography>
                </TouchableOpacity>

                {selectedTableId && (
                  <TouchableOpacity 
                    style={[styles.deleteTableBtn, { backgroundColor: C.red + '10' }]} 
                    onPress={() => {
                      Alert.alert("Remove Table", "Delete this table from the grid?", [
                        { text: "Cancel", style: "cancel" },
                        { text: "Delete", style: "destructive", onPress: () => {
                          onDeleteTable(selectedTableId);
                          setSelectedTableId(null);
                        }}
                      ]);
                    }}
                  >
                    <Ionicons name="trash" size={20} color={C.red} />
                  </TouchableOpacity>
                )}
              </MotiView>
            )}
          </AnimatePresence>

          <Modal visible={showAddModal} transparent animationType="fade">
            <View style={styles.modalOverlay}>
              <GlassCard style={styles.modalContent}>
                <Typography variant="h2" style={{ marginBottom: Spacing.lg }}>New Table</Typography>
                
                <View style={styles.inputGroup}>
                  <Typography variant="hint" color="sub" style={{ marginBottom: 4 }}>TABLE NUMBER</Typography>
                  <TextInput 
                    style={[styles.input, { backgroundColor: C.base, color: C.text, borderColor: C.edge }]} 
                    placeholder="1, 2, 3..." 
                    placeholderTextColor={C.sub}
                    keyboardType="numeric"
                    value={newTableNum}
                    onChangeText={setNewTableNum}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Typography variant="hint" color="sub" style={{ marginBottom: 4 }}>SEATING CAPACITY</Typography>
                  <TextInput 
                    style={[styles.input, { backgroundColor: C.base, color: C.text, borderColor: C.edge }]} 
                    placeholder="2, 4, 6..." 
                    placeholderTextColor={C.sub}
                    keyboardType="numeric"
                    value={newCapacity}
                    onChangeText={setNewCapacity}
                  />
                </View>

                <View style={styles.modalButtons}>
                  <TouchableOpacity onPress={() => setShowAddModal(false)} style={styles.cancelBtn}>
                    <Typography variant="title" color="sub">Cancel</Typography>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    onPress={() => {
                      if (!newTableNum) return;
                      onAddTable(parseInt(newTableNum), parseInt(newCapacity) || 4, 'square');
                      setShowAddModal(false);
                      setNewTableNum('');
                    }} 
                    style={[styles.createBtn, { backgroundColor: C.primary }]}
                  >
                    <Typography variant="title" style={{ color: C.base }}>Create Table</Typography>
                  </TouchableOpacity>
                </View>
              </GlassCard>
            </View>
          </Modal>
        </>
      )}
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    padding: Spacing.lg,
    borderRadius: Radius.xl,
    marginVertical: Spacing.md,
  },
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: Spacing.md 
  },
  editToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
    borderWidth: 1,
  },
  gridWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.lg,
    padding: Spacing.sm,
    marginTop: Spacing.md,
  },
  gridInner: {
    position: 'relative',
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderRadius: Radius.md,
    overflow: 'hidden',
  },
  gridLineH: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  gridLineV: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  tableCard: {
    position: 'absolute',
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    margin: 2,
  },
  tableTouch: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusDot: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  pulseContainer: {
    position: 'absolute',
    bottom: 6,
    right: 6,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  editActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.lg,
  },
  addTableBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: Radius.lg,
    flex: 1,
    marginRight: Spacing.md,
  },
  deleteTableBtn: {
    padding: Spacing.md,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalOverlay: { 
    flex: 1, 
    backgroundColor: 'rgba(0,0,0,0.8)', 
    justifyContent: 'center', 
    padding: Spacing.xl 
  },
  modalContent: { 
    padding: Spacing.xl, 
    borderRadius: Radius.xl 
  },
  inputGroup: {
    marginBottom: Spacing.lg,
  },
  input: { 
    borderRadius: Radius.lg, 
    padding: Spacing.md, 
    fontFamily: Fonts.bold,
    borderWidth: 1, 
  },
  modalButtons: { 
    flexDirection: 'row', 
    justifyContent: 'flex-end', 
    marginTop: Spacing.lg,
    gap: Spacing.md,
  },
  cancelBtn: { 
    paddingHorizontal: Spacing.lg, 
    paddingVertical: Spacing.md, 
    borderRadius: Radius.lg 
  },
  createBtn: { 
    paddingHorizontal: Spacing.xl, 
    paddingVertical: Spacing.md, 
    borderRadius: Radius.lg,
    ...Shadow.primary,
  },
});
