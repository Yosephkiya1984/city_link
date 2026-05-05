import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Modal,
  TextInput,
  Alert,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MotiView, AnimatePresence } from 'moti';
import { D, Radius, Fonts, Spacing, Shadow } from './StitchTheme';
import { Typography, Surface } from '../../../components';

const { width } = Dimensions.get('window');
const GRID_COUNT = 8;
const CELL_SIZE = (width - 64) / GRID_COUNT;

export const VisualTableBuilder = ({ 
  tables = [], 
  onUpdatePosition, 
  onAddTable, 
  onDeleteTable,
  onTablePress,
}: any) => {
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTableNum, setNewTableNum] = useState('');
  const [newCapacity, setNewCapacity] = useState('4');

  const onCellPress = (row: number, col: number) => {
    if (!isEditMode) {
      const table = tables.find((t: any) => 
        Math.floor((t.x_pos || 0) / CELL_SIZE) === col && 
        Math.floor((t.y_pos || 0) / CELL_SIZE) === row
      );
      if (table && onTablePress) onTablePress(table);
      return;
    }
    
    if (selectedTableId) {
      const x = col * CELL_SIZE;
      const y = row * CELL_SIZE;
      onUpdatePosition(selectedTableId, x, y);
      setSelectedTableId(null);
    } else {
      const tableAtCell = tables.find((t: any) => 
        Math.floor((t.x_pos || 0) / CELL_SIZE) === col && 
        Math.floor((t.y_pos || 0) / CELL_SIZE) === row
      );
      if (tableAtCell) {
        setSelectedTableId(tableAtCell.id);
      }
    }
  };

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'free': return { color: D.primary, icon: 'checkmark-circle-outline', label: 'AVAILABLE', bg: D.primary + '10' };
      case 'reserved': return { color: D.secondary, icon: 'calendar-outline', label: 'RESERVED', bg: D.secondary + '10' };
      case 'occupied': return { color: D.gold, icon: 'people-outline', label: 'OCCUPIED', bg: D.gold + '10' };
      case 'vip': return { color: D.violet, icon: 'star-outline', label: 'VIP GUEST', bg: D.violet + '10' };
      case 'ordering': return { color: D.blue, icon: 'cart-outline', label: 'ORDERING', bg: D.blue + '10' };
      case 'paying': return { color: D.green, icon: 'card-outline', label: 'PAYING', bg: D.green + '10' };
      case 'cleaning': return { color: D.red, icon: 'brush-outline', label: 'CLEANING', bg: D.red + '10' };
      default: return { color: D.sub, icon: 'help-circle-outline', label: 'UNKNOWN', bg: D.lift };
    }
  };

  const renderGrid = () => {
    const grid = [];
    for (let r = 0; r < GRID_COUNT; r++) {
      const row = [];
      for (let c = 0; c < GRID_COUNT; c++) {
        const table = tables.find((t: any) => 
          Math.floor((t.x_pos || 0) / CELL_SIZE) === c && 
          Math.floor((t.y_pos || 0) / CELL_SIZE) === r
        );
        
        const status = getStatusInfo(table?.status || 'free');

        row.push(
          <TouchableOpacity
            key={`${r}-${c}`}
            activeOpacity={0.7}
            style={[
              styles.cell,
              { width: CELL_SIZE, height: CELL_SIZE },
              table && { 
                backgroundColor: table.id === selectedTableId ? D.primary + '30' : status.bg,
                borderColor: table.id === selectedTableId ? D.primary : status.color + '40',
                borderRadius: Radius.m,
                borderWidth: table.id === selectedTableId ? 2 : 1,
              }
            ]}
            onPress={() => onCellPress(r, c)}
          >
            {table ? (
              <MotiView 
                from={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                style={styles.tableMarker}
              >
                <View style={[styles.statusDot, { backgroundColor: status.color }]} />
                <Typography variant="h2" style={{ color: table.id === selectedTableId ? D.primary : D.text, fontSize: 18 }}>
                  {table.table_number}
                </Typography>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
                  <Ionicons name="people" size={8} color={D.sub} />
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
              </MotiView>
            ) : isEditMode && selectedTableId ? (
              <View style={styles.dropZone}>
                <Ionicons name="download-outline" size={16} color={D.primary} />
              </View>
            ) : null}
          </TouchableOpacity>
        );
      }
      grid.push(<View key={r} style={styles.row}>{row}</View>);
    }
    return grid;
  };

  return (
    <Surface variant="lift" style={styles.outerContainer}>
      <View style={styles.topBar}>
        <View style={{ flex: 1 }}>
          <Typography variant="h3">Floor Plan</Typography>
          <Typography variant="body" color="sub" style={{ fontSize: 11 }}>
            {isEditMode ? "Reposition tables on the grid" : "Monitor live service status"}
          </Typography>
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity 
             style={styles.miniActionBtn}
             onPress={() => Alert.alert("QR Codes", "Digital Menu QR Codes have been generated for all tables. You can print them from the Merchant Portal Web Dashboard.")}
          >
            <Ionicons name="qr-code-outline" size={18} color={D.primary} />
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.editToggle, isEditMode && styles.editToggleActive]} 
            onPress={() => {
              setIsEditMode(!isEditMode);
              setSelectedTableId(null);
            }}
          >
            <Ionicons name={isEditMode ? "checkmark" : "build-outline"} size={16} color={isEditMode ? D.ink : D.primary} />
            <Text style={[styles.editToggleText, isEditMode && { color: D.ink }]}>
              {isEditMode ? "Save" : "Edit"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.gridWrapper}>
        <View style={styles.gridInner}>
          {renderGrid()}
        </View>
      </View>

      <View style={styles.legend}>
        {[
          { label: 'Free', color: D.primary },
          { label: 'Live', color: D.gold },
          { label: 'Pay', color: D.green },
          { label: 'VIP', color: D.violet },
        ].map(item => (
          <View key={item.label} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: item.color }]} />
            <Text style={styles.legendText}>{item.label}</Text>
          </View>
        ))}
      </View>

      <View style={styles.gridWrapper}>
        <View style={styles.gridInner}>
          {renderGrid()}
        </View>
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
              style={styles.addTableBtn} 
              onPress={() => setShowAddModal(true)}
            >
              <Ionicons name="add-circle" size={20} color={D.primary} />
              <Typography variant="title" color="primary" style={{ marginLeft: 8 }}>Add Table</Typography>
            </TouchableOpacity>

            {selectedTableId && (
              <TouchableOpacity 
                style={styles.deleteTableBtn} 
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
                <Ionicons name="trash" size={20} color={D.red} />
              </TouchableOpacity>
            )}
          </MotiView>
        )}
      </AnimatePresence>

      <Modal visible={showAddModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <Surface variant="lift" style={styles.modalContent}>
            <Typography variant="h2" style={{ marginBottom: Spacing.lg }}>New Table</Typography>
            
            <View style={styles.inputGroup}>
              <Typography variant="hint" color="sub" style={{ marginBottom: 4 }}>TABLE NUMBER</Typography>
              <TextInput 
                style={styles.input} 
                placeholder="1, 2, 3..." 
                placeholderTextColor={D.edge}
                keyboardType="numeric"
                value={newTableNum}
                onChangeText={setNewTableNum}
              />
            </View>

            <View style={styles.inputGroup}>
              <Typography variant="hint" color="sub" style={{ marginBottom: 4 }}>SEATING CAPACITY</Typography>
              <TextInput 
                style={styles.input} 
                placeholder="2, 4, 6..." 
                placeholderTextColor={D.edge}
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
                style={styles.createBtn}
              >
                <Typography variant="title" style={{ color: D.ink }}>Create Table</Typography>
              </TouchableOpacity>
            </View>
          </Surface>
        </View>
      </Modal>
    </Surface>
  );
};

const styles = StyleSheet.create({
  outerContainer: {
    padding: Spacing.lg,
    borderRadius: Radius.xl,
    marginVertical: Spacing.md,
  },
  topBar: { 
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
    borderRadius: Radius.m,
    borderWidth: 1,
    borderColor: D.primary + '50',
    backgroundColor: D.primary + '10',
  },
  editToggleActive: {
    backgroundColor: D.primary,
    borderColor: D.primary,
  },
  editToggleText: {
    fontSize: 12,
    fontFamily: Fonts.black,
    color: D.primary,
    marginLeft: 6,
  },
  gridWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: D.base,
    borderRadius: Radius.l,
    padding: Spacing.sm,
    borderWidth: 1,
    borderColor: D.edge,
  },
  gridInner: {
    padding: 4,
  },
  row: { flexDirection: 'row' },
  cell: {
    alignItems: 'center',
    justifyContent: 'center',
    margin: 2,
    overflow: 'hidden',
  },
  tableMarker: { 
    alignItems: 'center', 
    justifyContent: 'center',
    width: '100%',
    height: '100%',
  },
  statusDot: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  pulseContainer: {
    position: 'absolute',
    bottom: 4,
    right: 4,
  },
  dropZone: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: D.primary + '05',
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: D.primary + '30',
    borderRadius: Radius.m,
  },
  miniActionBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: D.lift,
    borderWidth: 1,
    borderColor: D.edge,
    alignItems: 'center',
    justifyContent: 'center',
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: D.edge,
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
  legendText: {
    fontSize: 10,
    fontFamily: Fonts.bold,
    color: D.sub,
    textTransform: 'uppercase',
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
    backgroundColor: D.primary + '10',
    borderRadius: Radius.l,
    flex: 1,
    marginRight: Spacing.md,
  },
  deleteTableBtn: {
    padding: Spacing.md,
    backgroundColor: D.red + '10',
    borderRadius: Radius.l,
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
    backgroundColor: D.base, 
    borderRadius: Radius.l, 
    padding: Spacing.md, 
    color: D.text, 
    fontFamily: Fonts.bold,
    borderWidth: 1, 
    borderColor: D.edge 
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
    borderRadius: Radius.l 
  },
  createBtn: { 
    paddingHorizontal: Spacing.xl, 
    paddingVertical: Spacing.md, 
    backgroundColor: D.primary,
    borderRadius: Radius.l,
    ...Shadow.primary,
  },
});
