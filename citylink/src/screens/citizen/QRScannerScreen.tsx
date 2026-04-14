import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useNavigation } from '@react-navigation/native';
import TopBar from '../../components/TopBar';
import { useAppStore } from '../../store/AppStore';
import { Colors, LightColors, FontSize } from '../../theme';
import { CButton } from '../../components';
import { t } from '../../utils';

export function QRScannerScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const navigation: any = useNavigation();
  const isDark = useAppStore((s) => s.isDark);
  const C = isDark ? Colors : LightColors;
  const lang = useAppStore((s) => s.lang);
  const showToast = useAppStore((s) => s.showToast);

  if (!permission) {
    return (
      <View style={{ flex: 1, backgroundColor: C.ink }}>
        <TopBar title="ðŸ“· QR Scanner" />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={{ flex: 1, backgroundColor: C.ink }}>
        <TopBar title="ðŸ“· QR Scanner" />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <Text style={{ fontSize: 60, marginBottom: 16 }}>ðŸ“·</Text>
          <Text
            style={{
              color: C.text,
              fontSize: FontSize.xl,
              fontWeight: '700',
              textAlign: 'center',
              marginBottom: 12,
            }}
          >
            {t('Camera Permission Required', lang)}
          </Text>
          <Text style={{ color: C.sub, textAlign: 'center', marginBottom: 24 }}>
            {t('CityLink needs access to your camera to scan peer-to-peer ETB QR codes.', lang)}
          </Text>
          <CButton title={t('Allow Camera Access', lang)} onPress={requestPermission} />
        </View>
      </View>
    );
  }

  const handleBarcodeScanned = ({ type, data }: any) => {
    if (scanned) return;
    setScanned(true);

    try {
      const payload = JSON.parse(data);
      if (payload.type === 'profile' && payload.phone) {
        showToast(t('QR Scanned! Redirecting...', lang), 'success');
        navigation.navigate('SendMoney', { autoFillPhone: payload.phone });
      } else {
        showToast(t('Invalid CityLink QR Code', lang), 'error');
        setTimeout(() => setScanned(false), 2000); // Reset after 2s if invalid
      }
    } catch (error) {
      showToast(t('Unrecognized QR Format', lang), 'error');
      setTimeout(() => setScanned(false), 2000);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.ink }}>
      <TopBar title="ðŸ“· Scan to Pay" />

      <View style={{ flex: 1 }}>
        <CameraView
          style={StyleSheet.absoluteFillObject}
          facing="back"
          onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
          barcodeScannerSettings={{
            barcodeTypes: ['qr'],
          }}
        />

        {/* Overlay Overlay logic purely for visual UI */}
        <View style={StyleSheet.absoluteFillObject}>
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' }} />
          <View style={{ flexDirection: 'row', height: 250 }}>
            <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' }} />
            <View
              style={{
                width: 250,
                backgroundColor: 'transparent',
                borderWidth: 2,
                borderColor: C.green,
              }}
            />
            <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' }} />
          </View>
          <View
            style={{
              flex: 1,
              backgroundColor: 'rgba(0,0,0,0.6)',
              alignItems: 'center',
              paddingTop: 40,
            }}
          >
            <Text style={{ color: '#fff', fontSize: FontSize.lg, fontWeight: '600' }}>
              {t('Align QR code within the frame to send ETB', lang)}
            </Text>
            {scanned && (
              <CButton
                title={t('Tap to Scan Again', lang)}
                onPress={() => setScanned(false)}
                style={{ marginTop: 24 }}
              />
            )}
          </View>
        </View>
      </View>
    </View>
  );
}

export default QRScannerScreen;
