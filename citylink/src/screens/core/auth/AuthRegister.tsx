import React from 'react';
import { View, Text, TouchableOpacity, Animated, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Fonts } from '../../../theme';
import { CButton, CInput, CSelect } from '../../../components';
import { SUBCITIES, MERCHANT_TYPES } from '../../../config';

export interface AuthRegisterProps {
  C: any;
  fadeAnim: Animated.Value;
  slideAnim: Animated.Value;
  userType: 'citizen' | 'merchant';
  setUserType: React.Dispatch<React.SetStateAction<'citizen' | 'merchant'>>;
  fullName: string;
  setFullName: React.Dispatch<React.SetStateAction<string>>;
  phone: string;
  setPhone: React.Dispatch<React.SetStateAction<string>>;
  merchantType: string;
  setMerchantType: React.Dispatch<React.SetStateAction<string>>;
  businessName: string;
  setBusinessName: React.Dispatch<React.SetStateAction<string>>;
  tin: string;
  setTin: React.Dispatch<React.SetStateAction<string>>;
  licenseNo: string;
  setLicenseNo: React.Dispatch<React.SetStateAction<string>>;
  subcity: string;
  setSubcity: React.Dispatch<React.SetStateAction<string>>;
  businessAddress: string;
  setBusinessAddress: React.Dispatch<React.SetStateAction<string>>;
  loading: boolean;
  error: string | null;
  onBack: () => void;
  onRegister: () => void;
}

export const AuthRegister = ({
  C,
  fadeAnim,
  slideAnim,
  userType,
  setUserType,
  fullName,
  setFullName,
  phone,
  setPhone,
  merchantType,
  setMerchantType,
  businessName,
  setBusinessName,
  tin,
  setTin,
  licenseNo,
  setLicenseNo,
  subcity,
  setSubcity,
  businessAddress,
  setBusinessAddress,
  loading,
  error,
  onBack,
  onRegister
}: AuthRegisterProps) => {
  return (
    <Animated.View style={[styles.screen, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Ionicons name="arrow-back" size={24} color={C.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: C.text }]}>Create Account</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <View style={[styles.typeSelector, { backgroundColor: C.surface, borderColor: C.edge }]}>
          <TouchableOpacity 
            style={[styles.typeBtn, userType === 'citizen' && { backgroundColor: C.primary }]} 
            onPress={() => setUserType('citizen')}
          >
            <Text style={[styles.typeText, { color: userType === 'citizen' ? C.ink : C.sub }]}>Citizen</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.typeBtn, userType === 'merchant' && { backgroundColor: C.primary }]} 
            onPress={() => setUserType('merchant')}
          >
            <Text style={[styles.typeText, { color: userType === 'merchant' ? C.ink : C.sub }]}>Merchant</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.form}>
          <CInput
            label="Full Name"
            value={fullName}
            onChangeText={setFullName}
            placeholder="John Doe"
            iconName="person-outline"
          />

          <CInput
            label="Phone Number"
            value={phone}
            onChangeText={setPhone}
            placeholder="+251 9XX XXX XXX"
            iconName="call-outline"
            keyboardType="phone-pad"
          />

          {userType === 'merchant' && (
            <View style={{ gap: 20 }}>
              <CSelect
                label="Business Category"
                value={merchantType}
                onValueChange={setMerchantType}
                options={MERCHANT_TYPES}
              />

              <CInput
                label="Business Name"
                value={businessName}
                onChangeText={setBusinessName}
                placeholder="Business Name"
                iconName="business-outline"
              />

              <CInput
                label="TIN Number"
                value={tin}
                onChangeText={setTin}
                placeholder="123456789"
                iconName="card-outline"
                keyboardType="number-pad"
              />

              <CInput
                label="Trade License No."
                value={licenseNo}
                onChangeText={setLicenseNo}
                placeholder="L-12345"
                iconName="shield-checkmark-outline"
              />

              <CSelect
                label="Subcity"
                value={subcity}
                onValueChange={setSubcity}
                options={SUBCITIES.map(sc => ({ label: sc, value: sc }))}
              />

              <CInput
                label="Business Address"
                value={businessAddress}
                onChangeText={setBusinessAddress}
                placeholder="Bole, Addis Ababa"
                iconName="location-outline"
              />
            </View>
          )}

          {error ? (
            <View style={[styles.errorBox, { backgroundColor: 'rgba(255,100,100,0.1)' }]}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <CButton
            title={loading ? "" : "Complete Registration"}
            onPress={onRegister}
            loading={loading}
            disabled={loading}
            style={{ marginTop: 16 }}
          />
        </View>
      </ScrollView>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 24,
    paddingTop: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  title: {
    fontSize: 24,
    fontFamily: Fonts.bold,
  },
  scroll: {
    padding: 24,
    paddingTop: 0,
    paddingBottom: 40,
  },
  typeSelector: {
    flexDirection: 'row',
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    padding: 4,
    marginBottom: 32,
  },
  typeBtn: {
    flex: 1,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  typeText: {
    fontSize: 14,
    fontFamily: Fonts.bold,
  },
  form: {
    gap: 20,
  },
  errorBox: {
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  errorText: {
    color: '#ff6b6b',
    fontSize: 14,
    fontFamily: Fonts.medium,
    textAlign: 'center',
  },
});
