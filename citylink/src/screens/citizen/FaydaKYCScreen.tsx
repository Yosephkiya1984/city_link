import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Dimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import TopBar from '../../components/TopBar';
import { useAppStore } from '../../store/AppStore';
import { Colors, DarkColors, Radius, Spacing, Shadow, Fonts, FontSize } from '../../theme';
import { CButton, CInput, SectionTitle, Card } from '../../components';
import { fmtETB, fmtDateTime, uid } from '../../utils';
import { t } from '../../utils/i18n';
import {
  FaydaKYCService,
  FAYDA_STATUS,
  FAYDA_MOCK_DATABASE,
  FaydaAPIIntegration,
} from '../../services/fayda-kyc.service';
import { Config } from '../../config';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function FaydaKYCScreen() {
  const navigation = useNavigation();
  const isDark = useAppStore((s) => s.isDark);
  const C = isDark ? DarkColors : Colors;
  const currentUser = useAppStore((s) => s.currentUser);
  const showToast = useAppStore((s) => s.showToast);

  const [kycStatus, setKycStatus] = useState(FAYDA_STATUS.NOT_STARTED);
  const [kycData, setKycData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('overview'); // 'overview', 'verification', 'centers'

  // Verification form states
  const [faydaId, setFaydaId] = useState('');
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [region, setRegion] = useState('');
  const [showVerificationForm, setShowVerificationForm] = useState(false);

  // Load KYC status on mount
  useEffect(() => {
    loadKYCStatus();
  }, []);

  const loadKYCStatus = async () => {
    try {
      const statusData = await FaydaKYCService.getKYCStatus();
      setKycStatus(statusData.status);
      setKycData(statusData.kyc_data);

      // Pre-fill form with current user data if available
      if (currentUser) {
        setPhoneNumber(currentUser.phone || '');
        setRegion(currentUser.region || 'Addis Ababa');
      }
    } catch (error) {
      console.error('Load KYC status error:', error);
      showToast('Failed to load KYC status', 'error');
    }
  };

  // Handle KYC initiation
  const handleInitiateKYC = async () => {
    setLoading(true);
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      const result = await FaydaKYCService.initiateKYC({
        user_id: currentUser?.id,
        full_name: currentUser?.full_name,
        phone: currentUser?.phone,
        email: currentUser?.email,
      });

      if (result.success) {
        setKycStatus(FAYDA_STATUS.INITIATED);
        showToast('KYC process initiated successfully!', 'success');
        Alert.alert(
          'KYC Process Started',
          `Reference: ${result.reference_number}\n\n${result.message}\n\nNext steps:\n${result.next_steps.join('\n')}`,
          [{ text: 'OK' }]
        );
      } else {
        showToast(result.error || 'Failed to initiate KYC', 'error');
      }
    } catch (error) {
      console.error('Initiate KYC error:', error);
      showToast('Failed to initiate KYC process', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Handle Fayda ID verification
  const handleVerifyFaydaID = async () => {
    if (!FaydaKYCService.validateFaydaID(faydaId)) {
      showToast('Please enter a valid 13-digit Fayda ID', 'error');
      return;
    }

    if (!fullName || !phoneNumber || !dateOfBirth || !region) {
      showToast('Please fill in all required fields', 'error');
      return;
    }

    setLoading(true);
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      const result = await FaydaKYCService.verifyFaydaID(faydaId, {
        userId: currentUser?.id,
        full_name: fullName,
        phone: phoneNumber,
        date_of_birth: dateOfBirth,
        region: region,
      });

      if (result.success) {
        setKycStatus(FAYDA_STATUS.VERIFIED);
        setKycData(result.kyc_data);
        showToast(result.message, 'success');
        setShowVerificationForm(false);

        // Update user verification status
        if (currentUser) {
          const updatedUser = {
            ...currentUser,
            fayda_verified: true,
            fayda_id: faydaId,
            kyc_status: 'VERIFIED',
            full_name: result.kyc_data.full_name, // Update with verified name
          };
          // This would update the user in the store
          useAppStore.getState().setCurrentUser(updatedUser);
        }
      } else {
        showToast(result.error || 'Verification failed', 'error');
        if (result.validation_errors) {
          Alert.alert('Validation Errors', result.validation_errors.join('\n'));
        }
      }
    } catch (error) {
      console.error('Verify Fayda ID error:', error);
      showToast('Verification service temporarily unavailable', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Get status color and icon
  const getStatusInfo = (status) => {
    const statusMap = {
      [FAYDA_STATUS.NOT_STARTED]: {
        color: C.hint,
        icon: 'document-text-outline',
        label: 'Not Started',
      },
      [FAYDA_STATUS.INITIATED]: { color: C.amber, icon: 'time-outline', label: 'In Progress' },
      [FAYDA_STATUS.PENDING_VERIFICATION]: {
        color: C.amber,
        icon: 'hourglass-outline',
        label: 'Pending',
      },
      [FAYDA_STATUS.VERIFIED]: { color: C.green, icon: 'checkmark-circle', label: 'Verified' },
      [FAYDA_STATUS.REJECTED]: { color: C.red, icon: 'close-circle', label: 'Rejected' },
      [FAYDA_STATUS.EXPIRED]: { color: C.red, icon: 'warning-outline', label: 'Expired' },
      [FAYDA_STATUS.SUSPENDED]: { color: C.red, icon: 'alert-circle', label: 'Suspended' },
    };
    return statusMap[status] || statusMap[FAYDA_STATUS.NOT_STARTED];
  };

  const statusInfo = getStatusInfo(kycStatus);
  const progress = FaydaKYCService.getKYCProgress(kycStatus);

  // Test with mock data
  const testWithMockData = (mockId) => {
    const mockRecord = FAYDA_MOCK_DATABASE[mockId];
    if (mockRecord) {
      setFaydaId(mockRecord.fayda_id);
      setPhoneNumber(mockRecord.phone);
      setDateOfBirth(mockRecord.date_of_birth);
      setRegion(mockRecord.region);

      // Show toast with exact data for verification
      showToast(
        `Loaded test data for ${mockRecord.full_name}\nPhone: ${mockRecord.phone}\nDOB: ${mockRecord.date_of_birth}\nRegion: ${mockRecord.region}`,
        'success'
      );
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.background }}>
      <TopBar title="Fayda KYC Verification" />

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 20 }}>
        {/* KYC Status Card */}
        <Card style={{ marginBottom: 20 }}>
          <View style={{ alignItems: 'center', marginBottom: 16 }}>
            <View
              style={{
                width: 80,
                height: 80,
                borderRadius: 40,
                backgroundColor: statusInfo.color + '20',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 12,
              }}
            >
              <Ionicons name={statusInfo.icon} size={40} color={statusInfo.color} />
            </View>

            <Text
              style={{
                color: C.text,
                fontSize: 20,
                fontFamily: Fonts.black,
                textAlign: 'center',
                marginBottom: 8,
              }}
            >
              {statusInfo.label}
            </Text>

            {/* Progress Bar */}
            <View
              style={{
                width: '100%',
                height: 8,
                backgroundColor: C.edge2,
                borderRadius: 4,
                marginBottom: 8,
              }}
            >
              <View
                style={{
                  width: `${progress}%`,
                  height: '100%',
                  backgroundColor: statusInfo.color,
                  borderRadius: 4,
                }}
              />
            </View>

            <Text style={{ color: C.sub, fontSize: 12, fontFamily: Fonts.medium }}>
              {progress}% Complete
            </Text>
          </View>

          {kycData && (
            <View
              style={{
                padding: 12,
                backgroundColor: C.green + '10',
                borderRadius: Radius.lg,
                borderWidth: 1,
                borderColor: C.green + '30',
              }}
            >
              <Text
                style={{
                  color: C.green,
                  fontSize: 12,
                  fontFamily: Fonts.medium,
                  textAlign: 'center',
                }}
              >
                âœ“ Verified: {kycData.full_name}
              </Text>
              <Text
                style={{
                  color: C.green,
                  fontSize: 11,
                  fontFamily: Fonts.regular,
                  textAlign: 'center',
                }}
              >
                Fayda ID: {FaydaKYCService.formatFaydaID(kycData.fayda_id)}
              </Text>
            </View>
          )}
        </Card>

        {/* Tab Navigation */}
        <View
          style={{
            flexDirection: 'row',
            backgroundColor: C.surface,
            borderRadius: Radius.xl,
            padding: 4,
            marginBottom: 20,
            ...Shadow.md,
          }}
        >
          {['overview', 'verification', 'centers'].map((tab) => (
            <TouchableOpacity
              key={tab}
              onPress={() => setActiveTab(tab)}
              style={{
                flex: 1,
                paddingVertical: 12,
                paddingHorizontal: 8,
                borderRadius: Radius.lg,
                backgroundColor: activeTab === tab ? C.primary : 'transparent',
                alignItems: 'center',
              }}
            >
              <Text
                style={{
                  color: activeTab === tab ? C.white : C.sub,
                  fontSize: 12,
                  fontFamily: Fonts.bold,
                  textTransform: 'uppercase',
                  textAlign: 'center',
                }}
              >
                {tab === 'overview' ? 'Overview' : tab === 'verification' ? 'Verify' : 'Centers'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <View>
            <SectionTitle title="KYC Requirements" />
            {FaydaKYCService.getKYCRequirements().map((req) => (
              <View
                key={req.id}
                style={{
                  backgroundColor: C.surface,
                  borderRadius: Radius.lg,
                  padding: 16,
                  marginBottom: 12,
                  flexDirection: 'row',
                  alignItems: 'center',
                  ...Shadow.sm,
                }}
              >
                <View
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: 12,
                    backgroundColor: kycStatus === FAYDA_STATUS.VERIFIED ? C.green + '20' : C.edge2,
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: 12,
                  }}
                >
                  <Ionicons
                    name={kycStatus === FAYDA_STATUS.VERIFIED ? 'checkmark' : 'ellipse-outline'}
                    size={14}
                    color={kycStatus === FAYDA_STATUS.VERIFIED ? C.green : C.hint}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: C.text, fontSize: 14, fontFamily: Fonts.black }}>
                    {req.title}
                  </Text>
                  <Text style={{ color: C.sub, fontSize: 12, fontFamily: Fonts.medium }}>
                    {req.description}
                  </Text>
                </View>
              </View>
            ))}

            {kycStatus === FAYDA_STATUS.NOT_STARTED && (
              <CButton
                title="Start KYC Process"
                onPress={handleInitiateKYC}
                loading={loading}
                icon="arrow-forward"
                style={{ marginTop: 20 }}
              />
            )}

            {kycStatus === FAYDA_STATUS.INITIATED && (
              <View
                style={{
                  backgroundColor: C.amber + '10',
                  borderRadius: Radius.lg,
                  padding: 16,
                  borderWidth: 1,
                  borderColor: C.amber + '30',
                }}
              >
                <Text
                  style={{
                    color: C.amber,
                    fontSize: 14,
                    fontFamily: Fonts.medium,
                    textAlign: 'center',
                  }}
                >
                  Your KYC process has been initiated. Please visit the nearest Fayda registration
                  center to complete biometric verification.
                </Text>
              </View>
            )}
          </View>
        )}

        {activeTab === 'verification' && (
          <View>
            <SectionTitle title="Verify Fayda ID" />

            {!showVerificationForm ? (
              <View>
                <Text
                  style={{
                    color: C.sub,
                    fontSize: 14,
                    fontFamily: Fonts.medium,
                    marginBottom: 20,
                    textAlign: 'center',
                  }}
                >
                  Enter your Fayda ID and personal information to verify your identity
                </Text>

                <CButton
                  title="Start Verification"
                  onPress={() => setShowVerificationForm(true)}
                  icon="finger-print"
                  style={{ marginBottom: 20 }}
                                {/* Test Data Buttons (for development) */}
                {Config.devMode && (
                  <View style={{ marginBottom: 20 }}>
                    <Text
                      style={{
                        color: C.hint,
                        fontSize: 12,
                        fontFamily: Fonts.medium,
                        marginBottom: 8,
                        textAlign: 'center',
                      }}
                    >
                      Test with mock data (development only):
                    </Text>
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      {Object.keys(FAYDA_MOCK_DATABASE)
                        .slice(0, 3)
                        .map((mockId) => (
                          <TouchableOpacity
                            key={mockId}
                            onPress={() => testWithMockData(mockId)}
                            style={{
                              flex: 1,
                              backgroundColor: C.surface,
                              borderRadius: Radius.lg,
                              padding: 8,
                              borderWidth: 1,
                              borderColor: C.border,
                              alignItems: 'center',
                            }}
                          >
                            <Text style={{ color: C.sub, fontSize: 10, fontFamily: Fonts.medium }}>
                              {FAYDA_MOCK_DATABASE[mockId].full_name.split(' ')[0]}
                            </Text>
                          </TouchableOpacity>
                        ))}
                    </View>
                    <View
                      style={{
                        marginTop: 12,
                        padding: 12,
                        backgroundColor: C.amber + '10',
                        borderRadius: Radius.lg,
                        borderWidth: 1,
                        borderColor: C.amber + '30',
                      }}
                    >
                      <Text
                        style={{
                          color: C.amber,
                          fontSize: 11,
                          fontFamily: Fonts.medium,
                          textAlign: 'center',
                        }}
                      >
                        Available Test IDs (Click to auto-fill):
                      </Text>
                      {Object.keys(FAYDA_MOCK_DATABASE).map((mockId, index) => {
                        const mockRecord = FAYDA_MOCK_DATABASE[mockId];
                        return (
                          <View key={mockId} style={{ marginTop: 4 }}>
                            <Text
                              style={{
                                color: C.amber,
                                fontSize: 9,
                                fontFamily: Fonts.regular,
                                textAlign: 'center',
                              }}
                            >
                              {index + 1}. {mockId} - {mockRecord.full_name}
                            </Text>
                            <Text
                              style={{
                                color: C.amber,
                                fontSize: 8,
                                fontFamily: Fonts.regular,
                                textAlign: 'center',
                                opacity: 0.8,
                              }}
                            >
                              📱 {mockRecord.phone} | 🎂 {mockRecord.date_of_birth} | 📍{' '}
                              {mockRecord.region}
                            </Text>
                          </View>
                        );
                      })}
                    </View>
                  </View>
                )}
           </View>
              </View>
            ) : (
              <View>
                <CInput
                  label="Full Name"
                  value={fullName}
                  onChangeText={setFullName}
                  placeholder="Enter your full name"
                  iconName="person"
                />

                <CInput
                  label="Fayda ID (13 digits)"
                  value={faydaId}
                  onChangeText={setFaydaId}
                  placeholder="Enter any 13-digit ID"
                  keyboardType="numeric"
                  maxLength={13}
                  iconName="finger-print"
                />

                <CInput
                  label="Phone Number"
                  value={phoneNumber}
                  onChangeText={setPhoneNumber}
                  placeholder="+251911234567"
                  keyboardType="phone-pad"
                  iconName="phone-portrait"
                />

                <CInput
                  label="Date of Birth"
                  value={dateOfBirth}
                  onChangeText={setDateOfBirth}
                  placeholder="YYYY-MM-DD"
                  iconName="calendar"
                />

                <CInput
                  label="Region"
                  value={region}
                  onChangeText={setRegion}
                  placeholder="Addis Ababa"
                  iconName="location"
                />

                <View style={{ flexDirection: 'row', gap: 12, marginTop: 20 }}>
                  <CButton
                    title="Cancel"
                    variant="ghost"
                    onPress={() => setShowVerificationForm(false)}
                    style={{ flex: 1 }}
                  />
                  <CButton
                    title="Verify"
                    onPress={handleVerifyFaydaID}
                    loading={loading}
                    icon="checkmark-circle"
                    style={{ flex: 2 }}
                  />
                </View>
              </View>
            )}
          </View>
        )}

        {activeTab === 'centers' && (
          <View>
            <SectionTitle title="Registration Centers" />
            {FaydaKYCService.getRegistrationCenters(region).map((center) => (
              <Card key={center.id} style={{ marginBottom: 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 }}>
                  <View
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 20,
                      backgroundColor: C.primary + '20',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginRight: 12,
                    }}
                  >
                    <Ionicons name="business" size={20} color={C.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        color: C.text,
                        fontSize: 16,
                        fontFamily: Fonts.black,
                        marginBottom: 4,
                      }}
                    >
                      {center.name}
                    </Text>
                    <Text
                      style={{
                        color: C.sub,
                        fontSize: 12,
                        fontFamily: Fonts.medium,
                        marginBottom: 4,
                      }}
                    >
                      {center.address}
                    </Text>
                    <Text style={{ color: C.sub, fontSize: 12, fontFamily: Fonts.medium }}>
                      ðŸ“ž {center.phone} | ðŸ•’ {center.hours}
                    </Text>
                  </View>
                </View>

                <View style={{ flexDirection: 'row', gap: 4, flexWrap: 'wrap' }}>
                  {center.services.map((service) => (
                    <View
                      key={service}
                      style={{
                        paddingHorizontal: 8,
                        paddingVertical: 4,
                        backgroundColor: C.primary + '10',
                        borderRadius: 4,
                        borderWidth: 1,
                        borderColor: C.primary + '30',
                      }}
                    >
                      <Text style={{ color: C.primary, fontSize: 10, fontFamily: Fonts.medium }}>
                        {service}
                      </Text>
                    </View>
                  ))}
                </View>
              </Card>
            ))}
          </View>
        )}

        {/* API Integration Info */}
        {kycStatus === FAYDA_STATUS.VERIFIED && (
          <View
            style={{
              backgroundColor: C.green + '10',
              borderRadius: Radius.lg,
              padding: 16,
              borderWidth: 1,
              borderColor: C.green + '30',
              marginTop: 20,
            }}
          >
            <Text style={{ color: C.green, fontSize: 12, fontFamily: Fonts.bold, marginBottom: 8 }}>
              âœ“ API Ready for Production
            </Text>
            <Text style={{ color: C.green, fontSize: 11, fontFamily: Fonts.medium }}>
              This mock implementation is ready for real Fayda API integration when available.
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}
