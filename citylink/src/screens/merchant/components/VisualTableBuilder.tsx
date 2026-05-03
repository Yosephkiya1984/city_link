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
import { D, Radius, Fonts } from './StitchTheme';
import { TableModel } from '../../../services/hospitality.service';

const { width } = Dimensions.get('window');
const GRID_COUNT = 8; // 8x8 grid for simplicity and size
const CELL_SIZE = (width - 64) / GRID_COUNT;

export const VisualTableBuilder = ({ 
  tables, 
  onUpdatePosition, 
  onAddTable, 
  onDeleteTable,
}: any) => {
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTableNum, setNewTableNum] = useState('');
  const [newCapacity, setNewCapacity] = useState('4');

  const onCellPress = (row: number, col: number) => {
    if (!isEditMode) return;
    
    if (selectedTableId) {
      // Move selected table to this cell
      const x = col * CELL_SIZE;
      const y = row * CELL_SIZE;
      onUpdatePosition(selectedTableId, x, y);
      setSelectedTableId(null);
    } else {
      // Check if a table exists here to select it
      const tableAtCell = tables.find((t: any) => 
        Math.floor(t.x_pos / CELL_SIZE) === col && 
        Math.floor(t.y_pos / CELL_SIZE) === row
      );
      if (tableAtCell) {
        setSelectedTableId(tableAtCell.id);
      }
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'free': return '#4CAF50';
      case 'reserved': return '#F44336';
      case 'serving': return '#FFC107';
      default: return D.sub;
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
        
        row.push(
          <TouchableOpacity
            key={`${r}-${c}`}
            style={[
              styles.cell,
              { width: CELL_SIZE, height: CELL_SIZE },
              table && { 
                backgroundColor: table.id === selectedTableId ? D.primary + '40' : getStatusColor(table.status) + '20',
                borderColor: table.id === selectedTableId ? D.primary : getStatusColor(table.status)
              }
            ]}
            onPress={() => onCellPress(r, c)}
          >
            {table ? (
              <View style={styles.tableMarker}>
                <Text style={[styles.tableNum, { color: getStatusColor(table.status) }]}>{table.table_number}</Text>
                <Text style={styles.capText}>{table.capacity}p</Text>
              </View>
            ) : isEditMode && selectedTableId ? (
              <Ionicons name="add-circle-outline" size={20} color={D.edge} />
            ) : null}
          </TouchableOpacity>
        );
      }
      grid.push(<View key={r} style={styles.row}>{row}</View>);
    }
    return grid;
  };

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <View>
          <Text style={styles.title}>Floor Plan Grid</Text>
          <Text style={styles.subtitle}>Select a table, then tap an empty square</Text>
        </View>
        <View style={{ flexDirection: 'row' }}>
          <TouchableOpacity 
            style={[styles.actionBtn, isEditMode && { backgroundColor: D.primary }]} 
            onPress={() => {
              setIsEditMode(!isEditMode);
              setSelectedTableId(null);
            }}
          >
            <Text style={[styles.btnText, isEditMode && { color: D.ink }]}>
              {isEditMode ? "Finish Setup" : "Edit Grid"}
            </Text>
          </TouchableOpacity>
          {isEditMode && (
            <TouchableOpacity 
              style={[styles.actionBtn, { marginLeft: 8 }]} 
              onPress={() => setShowAddModal(true)}
            >
              <Ionicons name="add" size={20} color={D.primary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={styles.gridContainer}>
        {renderGrid()}
      </View>

      {selectedTableId && (
        <TouchableOpacity 
          style={styles.deleteBtn} 
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
          <Ionicons name="trash-outline" size={20} color={D.red} />
          <Text style={styles.deleteBtnText}>Remove Selected</Text>
        </TouchableOpacity>
      )}

      {/* Add Table Modal */}
      <Modal visible={showAddModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add New Table</Text>
            <TextInput 
              style={styles.input} 
              placeholder="Table Number" 
              placeholderTextColor={D.sub}
              keyboardType="numeric"
              value={newTableNum}
              onChangeText={setNewTableNum}
            />
            <TextInput 
              style={styles.input} 
              placeholder="Capacity" 
              placeholderTextColor={D.sub}
              keyboardType="numeric"
              value={newCapacity}
              onChangeText={setNewCapacity}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity onPress={() => setShowAddModal(false)} style={styles.modalBtn}>
                <Text style={{ color: D.sub }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                onPress={() => {
                  onAddTable(parseInt(newTableNum), parseInt(newCapacity), 'square');
                  setShowAddModal(false);
                  setNewTableNum('');
                }} 
                style={[styles.modalBtn, { backgroundColor: D.primary }]}
              >
                <Text style={{ color: D.ink }}>Create</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { marginVertical: 16 },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  title: { fontSize: 20, fontFamily: Fonts.black, color: D.ink },
  subtitle: { fontSize: 12, color: D.sub },
  actionBtn: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: D.lift, 
    paddingHorizontal: 12, 
    paddingVertical: 8, 
    borderRadius: Radius.m,
    borderWidth: 1,
    borderColor: D.edge
  },
  btnText: { fontSize: 12, fontFamily: Fonts.bold, color: D.primary },
  gridContainer: {
    backgroundColor: D.base,
    padding: 8,
    borderRadius: Radius.l,
    borderWidth: 1,
    borderColor: D.edge,
    alignItems: 'center',
  },
  row: { flexDirection: 'row' },
  cell: {
    borderWidth: 0.5,
    borderColor: D.edge,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tableMarker: { alignItems: 'center' },
  tableNum: { fontSize: 14, fontFamily: Fonts.black },
  capText: { fontSize: 9, color: D.sub, fontFamily: Fonts.bold },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    padding: 12,
    backgroundColor: D.red + '10',
    borderRadius: Radius.m,
    borderWidth: 1,
    borderColor: D.red + '20'
  },
  deleteBtnText: { color: D.red, marginLeft: 8, fontFamily: Fonts.bold },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: D.lift, borderRadius: Radius.l, padding: 24 },
  modalTitle: { fontSize: 20, fontFamily: Fonts.black, color: D.ink, marginBottom: 20 },
  input: { backgroundColor: D.base, borderRadius: Radius.m, padding: 12, color: D.ink, marginBottom: 12, borderWidth: 1, borderColor: D.edge },
  modalButtons: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 12 },
  modalBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: Radius.m, marginLeft: 12 },
});
