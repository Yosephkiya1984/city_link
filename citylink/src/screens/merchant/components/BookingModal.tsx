import React, { useState, useMemo } from 'react';
import { View, StyleSheet, TouchableOpacity, Modal, ScrollView, Dimensions, Alert, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MotiView, AnimatePresence } from 'moti';
import { Typography, GlassCard, GlassView } from '../../../components';
import { useTheme } from '../../../hooks/useTheme';
import { Radius, Spacing, Fonts, Shadow, D } from '../../../components/hospitality/HospitalityTheme';
import { VisualTableBuilder } from '../../../components/hospitality/VisualTableBuilder';

const { width, height } = Dimensions.get('window');

interface BookingModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  tables: any[];
  merchantId: string;
}

export function BookingModal({ visible, onClose, onSubmit, tables, merchantId }: BookingModalProps) {
  const C = useTheme();
  const [step, setStep] = useState(1);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedTime, setSelectedTime] = useState('19:00');
  const [selectedTable, setSelectedTable] = useState<any>(null);
  const [guestCount, setGuestCount] = useState(2);
  const [guestName, setGuestName] = useState('');
  const [guestPhone, setGuestPhone] = useState('');

  const daysInMonth = useMemo(() => {
    const year = selectedDate.getFullYear();
    const month = selectedDate.getMonth();
    const date = new Date(year, month, 1);
    const days = [];
    while (date.getMonth() === month) {
      days.push(new Date(date));
      date.setDate(date.getDate() + 1);
    }
    return days;
  }, [selectedDate.getMonth()]);

  const timeSlots = [
    '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
    '18:00', '18:30', '19:00', '19:30', '20:00', '20:30', '21:00', '21:30', '22:00'
  ];

  const handleNext = () => {
    if (step === 3 && !selectedTable) {
      Alert.alert("Select Table", "Please select a table from the floor plan to continue.");
      return;
    }
    setStep(step + 1);
  };

  const handleBack = () => {
    if (step === 1) onClose();
    else setStep(step - 1);
  };

  const handleSubmit = () => {
    const reservationTime = new Date(selectedDate);
    const [hours, minutes] = selectedTime.split(':');
    reservationTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);

    onSubmit({
      reservation_time: reservationTime.toISOString(),
      guest_count: guestCount,
      table_id: selectedTable?.id,
      table_number: selectedTable?.table_number,
      metadata: {
        guest_name: guestName,
        guest_phone: guestPhone,
        is_manual: true
      }
    });
    
    // Reset
    setStep(1);
    setSelectedTable(null);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <GlassCard style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
              <Ionicons name={step === 1 ? "close" : "chevron-back"} size={24} color={C.text} />
            </TouchableOpacity>
            <Typography variant="h2" style={styles.title}>
              {step === 1 && "Select Date"}
              {step === 2 && "Select Time"}
              {step === 3 && "Select Table"}
              {step === 4 && "Guest Details"}
            </Typography>
            <View style={styles.stepIndicator}>
              {[1, 2, 3, 4].map(s => (
                <View 
                  key={s} 
                  style={[
                    styles.stepDot, 
                    { backgroundColor: s <= step ? C.primary : C.glass2 }
                  ]} 
                />
              ))}
            </View>
          </View>

          <View style={styles.content}>
            {step === 1 && (
              <MotiView from={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                <View style={styles.calendarHeader}>
                  <Typography variant="title">
                    {selectedDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
                  </Typography>
                </View>
                <View style={styles.calendarGrid}>
                  {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, idx) => (
                    <Typography key={`${d}-${idx}`} variant="hint" color="sub" style={styles.dayLabel}>{d}</Typography>
                  ))}
                  {daysInMonth.map((day, idx) => {
                    const isSelected = day.getDate() === selectedDate.getDate();
                    const isPast = day < new Date(new Date().setHours(0,0,0,0));
                    return (
                      <TouchableOpacity
                        key={idx}
                        disabled={isPast}
                        onPress={() => setSelectedDate(day)}
                        style={[
                          styles.dayCell,
                          isSelected && { backgroundColor: C.primary, borderRadius: 12 },
                          isPast && { opacity: 0.2 }
                        ]}
                      >
                        <Typography 
                          variant="body" 
                          style={{ color: isSelected ? C.base : C.text, fontWeight: isSelected ? 'bold' : 'normal' }}
                        >
                          {day.getDate()}
                        </Typography>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </MotiView>
            )}

            {step === 2 && (
              <MotiView from={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                <ScrollView contentContainerStyle={styles.timeGrid}>
                  {timeSlots.map(slot => (
                    <TouchableOpacity
                      key={slot}
                      onPress={() => setSelectedTime(slot)}
                      style={[
                        styles.timeSlot,
                        { borderColor: C.edge },
                        selectedTime === slot && { backgroundColor: C.primary, borderColor: C.primary }
                      ]}
                    >
                      <Typography 
                        variant="title" 
                        style={{ color: selectedTime === slot ? C.base : C.text }}
                      >
                        {slot}
                      </Typography>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </MotiView>
            )}

            {step === 3 && (
              <MotiView from={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} style={{ flex: 1 }}>
                <VisualTableBuilder 
                  tables={tables}
                  onTablePress={(table: any) => setSelectedTable(table)}
                  selectedTableId={selectedTable?.id}
                  hideControls={true}
                />
                {selectedTable && (
                  <GlassView variant="outline" style={styles.selectionInfo}>
                    <Typography variant="body">Selected: Table {selectedTable.table_number}</Typography>
                    <Typography variant="hint" color="sub">Capacity: {selectedTable.capacity} persons</Typography>
                  </GlassView>
                )}
              </MotiView>
            )}

            {step === 4 && (
              <MotiView from={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                <View style={styles.form}>
                  <View style={styles.inputGroup}>
                    <Typography variant="hint" color="sub">GUEST NAME</Typography>
                    <GlassView variant="outline" style={styles.input}>
                      <Ionicons name="person-outline" size={16} color={C.sub} />
                      <TextInput
                        value={guestName}
                        onChangeText={setGuestName}
                        placeholder="Guest Name"
                        placeholderTextColor={C.sub}
                        style={[styles.textInput, { color: C.text }]}
                      />
                    </GlassView>
                  </View>

                  <View style={styles.inputGroup}>
                    <Typography variant="hint" color="sub">GUEST PHONE</Typography>
                    <GlassView variant="outline" style={styles.input}>
                      <Ionicons name="call-outline" size={16} color={C.sub} />
                      <TextInput
                        value={guestPhone}
                        onChangeText={setGuestPhone}
                        placeholder="+251 ..."
                        placeholderTextColor={C.sub}
                        keyboardType="phone-pad"
                        style={[styles.textInput, { color: C.text }]}
                      />
                    </GlassView>
                  </View>

                  <View style={styles.counterGroup}>
                    <Typography variant="hint" color="sub">NUMBER OF GUESTS</Typography>
                    <View style={styles.counter}>
                      <TouchableOpacity onPress={() => setGuestCount(Math.max(1, guestCount - 1))} style={styles.counterBtn}>
                        <Ionicons name="remove" size={20} color={C.text} />
                      </TouchableOpacity>
                      <Typography variant="h2" style={{ marginHorizontal: 20 }}>{guestCount}</Typography>
                      <TouchableOpacity onPress={() => setGuestCount(guestCount + 1)} style={styles.counterBtn}>
                        <Ionicons name="add" size={20} color={C.text} />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              </MotiView>
            )}
          </View>

          {/* Footer Actions */}
          <View style={styles.footer}>
            {step < 4 ? (
              <TouchableOpacity 
                style={[styles.nextBtn, { backgroundColor: C.primary }]}
                onPress={handleNext}
              >
                <Typography variant="title" style={{ color: C.base }}>NEXT STEP</Typography>
                <Ionicons name="arrow-forward" size={18} color={C.base} style={{ marginLeft: 8 }} />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity 
                style={[styles.nextBtn, { backgroundColor: C.primary }]}
                onPress={handleSubmit}
              >
                <Typography variant="title" style={{ color: C.base }}>CONFIRM BOOKING</Typography>
              </TouchableOpacity>
            )}
          </View>
        </GlassCard>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    height: height * 0.85,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    padding: Spacing.xl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    flex: 1,
    textAlign: 'center',
  },
  stepIndicator: {
    flexDirection: 'row',
    gap: 4,
  },
  stepDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  content: {
    flex: 1,
  },
  calendarHeader: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  dayLabel: {
    width: (width - 80) / 7,
    textAlign: 'center',
    marginBottom: 8,
  },
  dayCell: {
    width: (width - 80) / 7,
    height: (width - 80) / 7,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  timeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'center',
  },
  timeSlot: {
    width: (width - 100) / 3,
    paddingVertical: 12,
    borderRadius: Radius.md,
    borderWidth: 1,
    alignItems: 'center',
  },
  selectionInfo: {
    padding: Spacing.md,
    marginTop: Spacing.md,
    borderRadius: Radius.md,
    alignItems: 'center',
  },
  form: {
    gap: Spacing.xl,
  },
  inputGroup: {
    gap: 8,
  },
  input: {
    height: 56,
    borderRadius: Radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  textInput: {
    flex: 1,
    marginLeft: 8,
    fontFamily: Fonts.medium,
    fontSize: 16,
    height: '100%',
  },
  counterGroup: {
    alignItems: 'center',
    gap: 16,
  },
  counter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  counterBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: {
    paddingTop: Spacing.xl,
  },
  nextBtn: {
    height: 56,
    borderRadius: Radius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
