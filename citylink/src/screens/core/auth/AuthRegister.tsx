import React from 'react';
import { View, Text, TouchableOpacity, Animated, StyleSheet, ScrollView } from 'react-native';
import { YStack } from 'tamagui';
import { Ionicons } from '@expo/vector-icons';
import { Fonts } from '../../../theme';
import { CButton, CInput, CSelect, FaydaVerificationModal } from '../../../components';
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
  onFaydaVerify: (profile: any) => void;
  t: (key: string) => string;
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
  onRegister,
  onFaydaVerify,
  t,
}: AuthRegisterProps) => {
  const [isFaydaModalVisible, setIsFaydaModalVisible] = React.useState(false);
  const [faydaIdInput, setFaydaIdInput] = React.useState('');

  const handleFaydaSuccess = (profile: any) => {
    setIsFaydaModalVisible(false);
    onFaydaVerify(profile);
  };
  return (
    <Animated.View
      style={[styles.screen, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}
    >
      <View style={styles.header}>
        <TouchableOpacity style={[styles.backButton, { borderColor: C.edge }]} onPress={onBack}>
          <Ionicons name="chevron-back" size={24} color={C.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: C.text }]}>{t('create_account')}</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <View style={[styles.typeSelector, { backgroundColor: C.surface, borderColor: C.edge }]}>
          <TouchableOpacity
            style={[styles.typeBtn, userType === 'citizen' && { backgroundColor: C.primary }]}
            onPress={() => setUserType('citizen')}
          >
            <Text style={[styles.typeText, { color: userType === 'citizen' ? C.ink : C.sub }]}>
              {t('citizen')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.typeBtn, userType === 'merchant' && { backgroundColor: C.primary }]}
            onPress={() => setUserType('merchant')}
          >
            <Text style={[styles.typeText, { color: userType === 'merchant' ? C.ink : C.sub }]}>
              {t('merchant')}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.form}>
          <CInput
            label={t('full_name')}
            value={fullName}
            onChangeText={setFullName}
            placeholder={t('name_placeholder')}
            iconName="person-outline"
          />

          {userType === 'citizen' && (
            <YStack gap="$3" marginBottom="$4">
              <View style={styles.faydaContainer}>
                <CInput
                  label={t('national_id_label')}
                  value={faydaIdInput}
                  onChangeText={setFaydaIdInput}
                  placeholder="1000 0000 0000"
                  iconName="id-card-outline"
                  keyboardType="number-pad"
                  maxLength={12}
                />
                <TouchableOpacity
                  style={[styles.faydaVerifyBtn, { backgroundColor: C.primary }]}
                  onPress={() => setIsFaydaModalVisible(true)}
                  disabled={faydaIdInput.length < 12}
                >
                  <Ionicons name="shield-checkmark" size={18} color={C.ink} />
                  <Text style={[styles.faydaVerifyText, { color: C.ink }]}>{t('verify')}</Text>
                </TouchableOpacity>
              </View>
              <Text style={{ fontSize: 11, color: C.sub, textAlign: 'center' }}>
                {t('fayda_verify_desc')}
              </Text>
            </YStack>
          )}

          <FaydaVerificationModal
            isVisible={isFaydaModalVisible}
            faydaId={faydaIdInput}
            onSuccess={handleFaydaSuccess}
            onCancel={() => setIsFaydaModalVisible(false)}
          />

          <CInput
            label={t('phone_number')}
            value={phone}
            onChangeText={setPhone}
            placeholder="+251 9XX XXX XXX"
            iconName="call-outline"
            keyboardType="phone-pad"
          />

          {userType === 'merchant' && (
            <View style={{ gap: 20 }}>
              <CSelect
                label={t('business_category')}
                value={merchantType}
                onValueChange={setMerchantType}
                options={MERCHANT_TYPES}
              />

              <CInput
                label={t('business_name')}
                value={businessName}
                onChangeText={setBusinessName}
                placeholder={t('business_name_field_placeholder')}
                iconName="business-outline"
              />

              <CInput
                label={t('tin_number')}
                value={tin}
                onChangeText={setTin}
                placeholder={t('tin_field_placeholder')}
                iconName="card-outline"
                keyboardType="number-pad"
              />

              <CInput
                label={t('trade_license_no')}
                value={licenseNo}
                onChangeText={setLicenseNo}
                placeholder={t('license_field_placeholder')}
                iconName="shield-checkmark-outline"
              />

              <CSelect
                label={t('subcity')}
                value={subcity}
                onValueChange={setSubcity}
                options={SUBCITIES.map((sc) => ({ label: sc, value: sc }))}
              />

              <CInput
                label={t('business_address')}
                value={businessAddress}
                onChangeText={setBusinessAddress}
                placeholder={t('subcity_field_placeholder')}
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
            title={loading ? '' : t('complete_registration')}
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
    padding: 32,
    paddingTop: 16,
  },
  backButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    borderWidth: 1.5,
  },
  title: {
    fontSize: 28,
    fontFamily: Fonts.headline,
    letterSpacing: -0.5,
  },
  scroll: {
    padding: 32,
    paddingTop: 0,
    paddingBottom: 48,
  },
  typeSelector: {
    flexDirection: 'row',
    height: 56,
    borderRadius: 18,
    borderWidth: 1.5,
    padding: 6,
    marginBottom: 40,
  },
  typeBtn: {
    flex: 1,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  typeText: {
    fontSize: 15,
    fontFamily: Fonts.label,
    letterSpacing: 0.5,
  },
  form: {
    gap: 24,
  },
  errorBox: {
    padding: 14,
    borderRadius: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E8312A30',
  },
  errorText: {
    color: '#E8312A',
    fontSize: 14,
    fontFamily: Fonts.label,
    textAlign: 'center',
  },
  faydaContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 12,
  },
  faydaVerifyBtn: {
    height: 52,
    paddingHorizontal: 16,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 0,
  },
  faydaVerifyText: {
    fontSize: 14,
    fontFamily: Fonts.label,
    fontWeight: 'bold',
  },
});
