import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CameraView } from 'expo-camera';
import { DarkColors as T } from '../../theme';

interface ProofOfDeliveryModalProps {
  visible: boolean;
  onClose: () => void;
  onCapture: () => void;
  capturing: boolean;
  cameraRef: React.RefObject<any>;
}

export function ProofOfDeliveryModal({
  visible,
  onClose,
  onCapture,
  capturing,
  cameraRef,
}: ProofOfDeliveryModalProps) {
  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <View style={s.root}>
        <CameraView style={s.camera} ref={cameraRef}>
          <View style={s.overlay}>
            <View style={s.header}>
              <Text style={s.instruction}>Capture Package at Doorstep</Text>
            </View>

            <View style={s.viewfinder} />

            <View style={s.controls}>
              <TouchableOpacity style={s.closeBtn} onPress={onClose} disabled={capturing}>
                <Ionicons name="close" size={30} color="#fff" />
              </TouchableOpacity>

              <TouchableOpacity style={s.shutterBtn} onPress={onCapture} disabled={capturing}>
                {capturing ? (
                  <ActivityIndicator color={T.bg} size="large" />
                ) : (
                  <View style={s.shutterInner} />
                )}
              </TouchableOpacity>

              <View style={{ width: 44 }} />
            </View>
          </View>
        </CameraView>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000',
  },
  camera: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'transparent',
    justifyContent: 'space-between',
    paddingVertical: 60,
  },
  header: {
    alignItems: 'center',
  },
  instruction: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '900',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    overflow: 'hidden',
  },
  viewfinder: {
    width: '80%',
    aspectRatio: 1,
    alignSelf: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
    borderRadius: 32,
    borderStyle: 'dashed',
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 32,
  },
  closeBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterBtn: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: '#fff',
  },
  shutterInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#fff',
  },
});
