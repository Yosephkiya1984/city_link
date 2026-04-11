import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  KeyboardAvoidingView, Platform, Animated, Pressable, Dimensions, StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useAppStore } from '../../store/AppStore';
import { Colors, DarkColors, FontSize, Radius, Spacing, Shadow, Fonts } from '../../theme';
import { CButton, CInput, CSelect } from '../../components';
import { LinearGradient } from 'expo-linear-gradient';
import { hasSupabase } from '../../services/supabase';
import { sendOtp, verifyOtp, checkPhoneExists } from '../../services/auth.service';
import { upsertProfile, loadSessionProfile } from '../../services/profile.service';
import { claimWelcomeBonus } from '../../services/wallet.service';

import { saveSession } from '../../store/AppStore';
import { isValidEthPhone, normalizePhone, uid } from '../../utils';
import { Config, SUBCITIES, MERCHANT_TYPES, WELCOME_BONUS_ETB } from '../../config';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function AuthScreen() {
  const navigation = useNavigation();
  const isDark = useAppStore((s) => s.isDark);
  const C = isDark ? DarkColors : Colors;
  const setCurrentUser = useAppStore((s) => s.setCurrentUser);
  const setBalance = useAppStore((s) => s.setBalance);
  const showToast = useAppStore((s) => s.showToast);
  const insets = useSafeAreaInsets();

  // Check KYC status from database and force KYC if needed
  useEffect(() => {
    const checkKycStatus = async () => {
      const currentUser = useAppStore.getState ? useAppStore.getState().currentUser : null;
      if (currentUser) {
        // Load fresh KYC status from database
        const profileData = await loadSessionProfile(currentUser, currentUser.phone);
        console.log('🔧 KYC Check - kyc_status from DB:', profileData?.profile?.kyc_status);
        console.log('🔧 KYC Check - fayda_verified from DB:', profileData?.profile?.fayda_verified);
        
        const isVerified = profileData?.profile?.fayda_verified || profileData?.profile?.kyc_status === 'VERIFIED';
        
        if (!isVerified) {
          console.log('🔧 KYC Check - User not verified, forcing to KYC');
          // Force user to KYC verification
          setAuthMode('register');
          setCurrentScreen('fayda');
          showToast('Please complete Fayda KYC verification to access CityLink services', 'warning');
        }
      }
    };
    
    checkKycStatus();
  }, []);

  // State management
  const [currentScreen, setCurrentScreen] = useState('welcome'); // welcome, login, register, otp, fayda, kyc, station, inspector
  const [authMode, setAuthMode] = useState('login'); // login, register, gov, station, inspector
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [devOtp, setDevOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [authUserId, setAuthUserId] = useState(null);

  // Fayda KYC State
  const [faydaFIN, setFaydaFIN] = useState('');
  const [faydaOTP, setFaydaOTP] = useState('');
  const [biometricSimulated, setBiometricSimulated] = useState(false);
  const [kycStep, setKycStep] = useState(1); // 1: FIN entry, 2: OTP, 3: Biometric, 4: Review
  const [faydaVerified, setFaydaVerified] = useState(false);

  // Station Tablet State
  const [stationName, setStationName] = useState('');
  const [stationCode, setStationCode] = useState('');

  // Inspector State
  const [inspectorBadge, setInspectorBadge] = useState('');
  const [inspectorPIN, setInspectorPIN] = useState('');

  // State for KYB fields
  const [tin, setTin] = useState('');
  const [licenseNo, setLicenseNo] = useState('');
  const [tradeLicense, setTradeLicense] = useState('');
  const [subcity, setSubcity] = useState('');
  const [woreda, setWoreda] = useState('');
  const [businessAddress, setBusinessAddress] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [numberOfEmployees, setNumberOfEmployees] = useState('');
  const [businessEmail, setBusinessEmail] = useState('');
  const [operatingHours, setOperatingHours] = useState('');
  const [parkingSpaces, setParkingSpaces] = useState('');
  const [vehicleTypes, setVehicleTypes] = useState([]);
  const [propertyType, setPropertyType] = useState('');
  const [serviceArea, setServiceArea] = useState('');
  const [specialization, setSpecialization] = useState('');
  const [clinicLicense, setClinicLicense] = useState('');
  const [professionalLicense, setProfessionalLicense] = useState('');
  
  // Ekub specific fields
  const [associationName, setAssociationName] = useState('');
  const [associationType, setAssociationType] = useState('');
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [licenseType, setLicenseType] = useState('');
  const [licenseExpiry, setLicenseExpiry] = useState('');
  const [associationEmail, setAssociationEmail] = useState('');
  const [associationPhone, setAssociationPhone] = useState('');
  const [numberOfMembers, setNumberOfMembers] = useState('');
  const [location, setLocation] = useState('');

  // Registration fields
  const [userType, setUserType] = useState('citizen');
  const [fullName, setFullName] = useState('');
  const [merchantType, setMerchantType] = useState('');
  const [businessName, setBusinessName] = useState('');
  
  // Government fields
  const [badgeId, setBadgeId] = useState('');
  const [secPin, setSecPin] = useState('');

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    animateIn();
  }, [currentScreen]);

  const animateIn = () => {
    fadeAnim.setValue(0);
    slideAnim.setValue(30);
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 50, friction: 8, useNativeDriver: true }),
    ]).start();
  };

  // Navigation functions
  const goToLogin = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setAuthMode('login');
    setCurrentScreen('login');
    setError('');
  };

  const goToRegister = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setAuthMode('register');
    setCurrentScreen('register'); // Go to registration form first
    setError('');
  };

  const goToOTP = () => {
    setCurrentScreen('otp');
    setError('');
  };

  const goToFayda = () => {
    setKycStep(1);
    setCurrentScreen('fayda');
    setError('');
  };

  const goToStation = () => {
    setAuthMode('station');
    setCurrentScreen('station');
    setError('');
  };

  const goToInspector = () => {
    setAuthMode('inspector');
    setCurrentScreen('inspector');
    setError('');
  };

  const goBack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (currentScreen === 'otp') {
      setCurrentScreen('login');
    } else if (currentScreen === 'register') {
      setCurrentScreen('login');
    } else if (currentScreen === 'fayda') {
      if (authMode === 'register') {
        setCurrentScreen('register'); // Go back to registration form
      } else {
        setCurrentScreen('login');
      }
    } else if (currentScreen === 'station' || currentScreen === 'inspector') {
      setCurrentScreen('welcome');
    } else {
      setCurrentScreen('welcome');
    }
    setError('');
  };

  // Authentication functions
  const handleSendOTP = async () => {
    setError('');
    
    // Enhanced validation
    if (!phone || phone.trim().length === 0) {
      setError('Please enter your phone number');
      return;
    }
    
    const normalized = normalizePhone(phone);
    console.log('🔧 Sending OTP to:', normalized);
    
    if (!isValidEthPhone(normalized)) {
      setError('Please enter a valid Ethiopian phone number (+251 9XX XXX XXX)');
      return;
    }

    // Government auth flow
    if (authMode === 'gov') {
      if (!badgeId || badgeId.trim().length === 0) {
        setError('Badge ID is required');
        return;
      }
      if (!secPin || secPin.length !== 4) {
        setError('Security PIN must be 4 digits');
        return;
      }
      
      setLoading(true);
      try {
        if (badgeId.startsWith('ST-') || badgeId.startsWith('INSP-')) {
          const govProfile = {
            id: uid(),
            phone: normalized,
            full_name: 'Government Official',
            role: 'minister',
            is_verified: true,
            kyc_status: 'VERIFIED',
            fayda_verified: true,
            credit_score: 900,
          };
          await finishLogin(govProfile, 0);
        } else {
          setError('Invalid Badge ID format');
        }
      } catch (e) {
        console.error('Gov auth error:', e);
        setError('Authentication failed');
      } finally {
        setLoading(false);
      }
      return;
    }

    // Regular OTP flow
    setLoading(true);
    try {
      if (authMode === 'login') {
        const existing = await checkPhoneExists(normalized);
        if (!existing && !Config.otpBypass) {
          setError('No account found with this phone number. Please register first.');
          setLoading(false);
          return;
        }
      }
      
      console.log('🔧 Calling sendOtp with:', normalized);
      const result = await sendOtp(normalized);
      console.log('🔧 sendOtp result:', result);
      
      if (result.success || result.devOtp) {
        setDevOtp(result.devOtp || '');
        goToOTP();
        showToast('Verification code sent!', 'success');
      } else {
        setError(result.error || 'Failed to send verification code');
      }
    } catch (e) {
      console.error('OTP send error:', e);
      setError('System error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    setError('');
    
    if (!otp || otp.trim().length === 0) {
      setError('Please enter verification code');
      return;
    }
    
    if (otp.length !== 6) {
      setError('Code must be 6 digits');
      return;
    }
    
    setLoading(true);
    try {
      const result = await verifyOtp(normalizePhone(phone), otp);
      if (result.user && !result.error) {
        if (result.user) setAuthUserId(result.user.id);
        
        if (authMode === 'login') {
          const profileData = await loadSessionProfile(result.user, normalizePhone(phone));
          if (profileData) {
            // Check if user has completed KYC verification
            const isVerified = profileData.profile.fayda_verified || profileData.profile.kyc_status === 'VERIFIED';
            console.log('🔧 Login - profileData:', profileData);
            console.log('🔧 Login - isVerified:', isVerified);
            console.log('🔧 Login - kyc_status:', profileData.profile.kyc_status);
            
            if (!isVerified) {
              setError('Please complete Fayda KYC verification to login. Complete KYC first, then try again.');
              // Force user to KYC - use existing user ID
              setAuthUserId(profileData.profile.id);
              goToFayda();
              return;
            }
            
            // Check if merchant is approved
            if (profileData.profile.role === 'merchant' && profileData.profile.kyc_status !== 'VERIFIED') {
              setError('Your merchant account is pending admin approval. Please contact support or wait for approval email.');
              return;
            }
            
            await finishLogin(profileData.profile, profileData.balance);
          } else {
            // For login, if no profile exists, show error instead of redirecting to register
            setError('No account found with this phone number. Please register first.');
            setAuthMode('register');
            goToRegister();
          }
        } else {
          // For register flow
          if (userType === 'merchant') {
            showToast('Merchant application submitted! We will review your application and notify you.', 'success');
            setCurrentScreen('welcome');
            // Reset merchant state
            setMerchantType('');
            setBusinessName('');
            setFullName('');
            setPhone('');
          } else {
            // Citizens go to Fayda KYC
            showToast('Phone verified! Please complete Fayda KYC.', 'success');
            goToFayda();
          }
        }
      } else {
        setError(result.error || 'Incorrect code');
      }
    } catch (e) {
      setError('Verification failed');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    console.log('🔧 handleRegister called');
    setError('');
    
    // Enhanced validation for name and phone
    if (!fullName || fullName.trim().length < 2) {
      setError('Please enter your full name');
      return;
    }
    
    if (!/^[a-zA-Z\s]+$/.test(fullName.trim())) {
      setError('Name should only contain letters');
      return;
    }
    
    if (!phone || phone.trim().length === 0) {
      setError('Please enter your phone number');
      return;
    }
    
    const normalized = normalizePhone(phone);
    if (!isValidEthPhone(normalized)) {
      setError('Please enter a valid Ethiopian phone number (+251 9XX XXX XXX)');
      return;
    }
    
    // Check if phone already exists before proceeding
    const existingPhone = await checkPhoneExists(normalized);
    if (existingPhone) {
      setError('This phone number is already registered. Please login instead.');
      setAuthMode('login');
      return;
    }
    
    if (userType === 'merchant') {
      if (!merchantType) {
        setError('Please select a business category');
        return;
      }
      if (!businessName || businessName.trim().length < 2) {
        setError('Please enter a business name');
        return;
      }
      
      // Additional KYB validation for merchants
      if (!tin || tin.trim().length < 9) {
        setError('Please enter a valid TIN number');
        return;
      }
      
      if (!licenseNo || licenseNo.trim().length < 5) {
        setError('Please enter a valid license number');
        return;
      }
      
      if (!subcity) {
        setError('Please select a subcity');
        return;
      }
      
      if (!businessAddress || businessAddress.trim().length < 5) {
        setError('Please enter a business address');
        return;
      }
    }
    
    setLoading(true);
    try {
      const normalized = normalizePhone(phone);
      const isMinister = authMode === 'gov' && secPin === Config.adminCode;
      const role = isMinister ? 'minister' : (userType === 'merchant' ? 'merchant' : 'citizen');
      
      // Construct metadata for the background handle_new_user trigger
      const metadata = {
        full_name: fullName.trim(),
        role: role,
        kyc_status: role === 'minister' ? 'VERIFIED' : (userType === 'merchant' ? 'PENDING' : 'NONE'),
      };

      if (userType === 'merchant') {
        Object.assign(metadata, {
          merchant_type: merchantType,
          business_name: businessName?.trim(),
          tin: tin?.trim(),
          license_no: licenseNo?.trim(),
          subcity: subcity,
          business_address: businessAddress?.trim(),
          woreda: woreda?.trim(),
          contact_person: contactPerson?.trim(),
          contact_phone: contactPhone?.trim(),
          business_email: businessEmail?.trim(),
        });
      }

      console.log('🔧 Requesting OTP with registration metadata:', metadata);
      
      const result = await sendOtp(normalized, metadata);
      
      if (result.success || result.devOtp) {
        if (result.devOtp) setDevOtp(result.devOtp);
        showToast(result.devOtp ? `[Dev Mode] Verification code: ${result.devOtp}` : 'Verification code sent!', 'success');
        goToOTP();
      } else {
        setError(result.error || 'Failed to send verification code');
      }
    } catch (e) {
      console.error('Registration error:', e);
      setError(e.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Fayda KYC Functions
  const handleFaydaFINSubmit = async () => {
    setError('');
    
    if (!faydaFIN || faydaFIN.trim().length !== 12) {
      setError('Please enter a valid 12-digit Fayda FIN number');
      return;
    }
    
    if (!/^\d{12}$/.test(faydaFIN.trim())) {
      setError('FIN must contain exactly 12 digits');
      return;
    }
    
    setLoading(true);
    try {
      // Simulate FIN validation
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Generate simulated OTP for development
      const simulatedOTP = Math.floor(100000 + Math.random() * 900000).toString();
      setFaydaOTP(simulatedOTP);
      
      setKycStep(2);
      showToast('OTP sent to your registered phone number', 'success');
    } catch (e) {
      setError('FIN validation failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleFaydaOTPSubmit = async () => {
    setError('');
    
    if (!faydaOTP || faydaOTP.trim().length !== 6) {
      setError('Please enter the 6-digit OTP');
      return;
    }
    
    setLoading(true);
    try {
      // Simulate OTP verification
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setKycStep(3);
      showToast('OTP verified. Please complete biometric scan', 'success');
    } catch (e) {
      setError('OTP verification failed');
    } finally {
      setLoading(false);
    }
  };

  const handleBiometricScan = async () => {
    setError('');
    setLoading(true);
    
    try {
      // Simulate biometric scan
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setBiometricSimulated(true);
      setKycStep(4);
      showToast('Biometric scan completed', 'success');
    } catch (e) {
      setError('Biometric scan failed');
    } finally {
      setLoading(false);
    }
  };

  const handleFaydaComplete = async () => {
    setError('');
    setLoading(true);
    
    try {
      console.log('🔧 Fayda Complete - authUserId:', authUserId);
      console.log('🔧 Fayda Complete - phone:', normalizePhone(phone));
      
      // Load existing user data to preserve name and other info
      const existingProfile = await loadSessionProfile({ id: authUserId }, normalizePhone(phone));
      const userData = existingProfile?.profile || {};
      
      console.log('🔧 Fayda Complete - existing user data:', userData);
      
      // Complete KYC process - only update KYC status that exists in DB
      const profileUpdate = {
        id: authUserId,
        phone: normalizePhone(phone),
        full_name: userData.full_name || fullName || 'Verified User', // Use existing name from DB
        role: userData.role || 'citizen',
        kyc_status: 'VERIFIED', // Only update the KYC status that exists in DB
      };
      
      console.log('🔧 Updating profile with KYC completion:', profileUpdate);
      
      if (hasSupabase()) {
        const result = await upsertProfile(profileUpdate);
        console.log('🔧 KYC update result:', result);
        
        if (result.error) {
          throw new Error(result.error);
        }
        
        console.log('🔧 KYC status updated successfully in database');
      }
      
      showToast('Fayda verification completed! You now have access to CityLink services', 'success');
      
      // Create final profile for login with all verification data
      const finalProfile = {
        ...userData, // Preserve all existing user data from DB
        ...profileUpdate, // Use updated KYC status
        fayda_fin: faydaFIN,
        fayda_verified: true,
        fayda_verified_at: new Date().toISOString(),
        fingerprint_hash: `fp_${faydaFIN}`,
        iris_hash: `iris_${faydaFIN}`,
        verification_method: 'fayda_digital_id',
        credit_score: userData.credit_score || 300,
        welcome_bonus_paid: true,
      };
      
      console.log('🔧 KYC Complete - Final profile for login:', finalProfile);
      await finishLogin(finalProfile, 5000);
      
    } catch (e) {
      console.error('KYC completion error:', e);
      setError(e.message || 'KYC completion failed');
    } finally {
      setLoading(false);
    }
  };

  // Station Tablet Login
  const handleStationLogin = async () => {
    setError('');
    
    if (!stationName || stationName.trim().length < 2) {
      setError('Please enter station name');
      return;
    }
    
    if (!stationCode || stationCode.trim().length < 4) {
      setError('Please enter valid station code');
      return;
    }
    
    setLoading(true);
    try {
      // Validate station credentials (simplified)
      if (stationCode.startsWith('LRT-') || stationCode.startsWith('STN-')) {
        const stationProfile = {
          id: uid(),
          phone: '+251900000000', // Generic station phone
          full_name: `Station: ${stationName}`,
          role: 'station',
          station_name: stationName,
          station_code: stationCode,
          is_verified: true,
        };
        
        await finishLogin(stationProfile, 0);
        showToast('Welcome to Station Tablet Mode', 'success');
      } else {
        setError('Invalid station code format');
      }
    } catch (e) {
      setError('Station login failed');
    } finally {
      setLoading(false);
    }
  };

  // Inspector Login
  const handleInspectorLogin = async () => {
    setError('');
    
    if (!inspectorBadge || inspectorBadge.trim().length < 4) {
      setError('Please enter inspector badge ID');
      return;
    }
    
    if (!inspectorPIN || inspectorPIN.length !== 4) {
      setError('PIN must be 4 digits');
      return;
    }
    
    setLoading(true);
    try {
      // Validate inspector credentials
      if (inspectorBadge.startsWith('INSP-') && inspectorPIN === '1234') {
        const inspectorProfile = {
          id: uid(),
          phone: '+251900000000', // Generic inspector phone
          full_name: 'Transit Inspector',
          role: 'inspector',
          inspector_badge: inspectorBadge,
          is_verified: true,
        };
        
        await finishLogin(inspectorProfile, 0);
        showToast('Welcome to Inspector Mode', 'success');
      } else {
        setError('Invalid inspector credentials');
      }
    } catch (e) {
      setError('Inspector login failed');
    } finally {
      setLoading(false);
    }
  };

  const finishLogin = async (profile, balance) => {
    console.log('🔧 finishLogin called with profile:', profile);
    console.log('🔧 finishLogin - profile.kyc_status:', profile.kyc_status);
    console.log('🔧 finishLogin - profile.fayda_verified:', profile.fayda_verified);
    let finalBal = balance;
    
    await saveSession(profile);
    setCurrentUser(profile);
    setBalance(finalBal);
    
    console.log('🔧 User role:', profile.role);
    
    // Apply welcome bonus for new citizens
    if (profile.role === 'citizen' && finalBal === 0) {
      finalBal = WELCOME_BONUS_ETB;
      await claimWelcomeBonus(profile.id);
      showToast(`Welcome bonus: ${WELCOME_BONUS_ETB} ETB credited! âœ¨`, 'success');
    }
    
    // Navigation will happen automatically due to currentUser state change
    console.log('🔧 Login complete - navigation will trigger automatically');
  };

  // KYB form components for different merchant types
  const renderRestaurantKYB = () => (
    <View style={{ gap: 16 }}>
      <Text style={{ color: C.text, fontSize: 16, fontFamily: Fonts.bold, marginBottom: 8 }}>
        ðŸ½ï¸ Restaurant / CafÃ© KYB Details
      </Text>
      
      <CInput 
        label="Business Name" 
        value={businessName} 
        onChangeText={setBusinessName} 
        placeholder="Grand Addis Hotel" 
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
        label="Food Service License" 
        value={licenseNo} 
        onChangeText={setLicenseNo} 
        placeholder="FS-2024-001" 
        iconName="shield-checkmark-outline"
      />
      
      <CSelect 
        label="Subcity" 
        value={subcity} 
        onValueChange={setSubcity} 
        options={SUBCITIES.map(sc => ({ value: sc, label: sc }))}
      />
      
      <CInput 
        label="Business Address" 
        value={businessAddress} 
        onChangeText={setBusinessAddress} 
        placeholder="Bole, Addis Ababa" 
        iconName="location-outline"
      />
      
      <CInput 
        label="የስራ ሰዓቶች / Operating Hours" 
        value={operatingHours} 
        onChangeText={setOperatingHours} 
        placeholder="8:00 AM - 10:00 PM" 
        iconName="time-outline"
      />
      
      <CInput 
        label="Business Email" 
        value={businessEmail} 
        onChangeText={setBusinessEmail} 
        placeholder="contact@restaurant.com" 
        iconName="mail-outline"
        keyboardType="email-address"
      />
      
      <CInput 
        label="Number of Employees" 
        value={numberOfEmployees} 
        onChangeText={setNumberOfEmployees} 
        placeholder="15" 
        iconName="people-outline"
        keyboardType="number-pad"
      />
    </View>
  );

  const renderParkingKYB = () => (
    <View style={{ gap: 16 }}>
      <Text style={{ color: C.text, fontSize: 16, fontFamily: Fonts.bold, marginBottom: 8 }}>
        ðŸ…¿ï¸ Parking Operator KYB Details
      </Text>
      
      <CInput 
        label="Business Name" 
        value={businessName} 
        onChangeText={setBusinessName} 
        placeholder="Safe Park Addis" 
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
        label="Trade License Number" 
        value={tradeLicense} 
        onChangeText={setTradeLicense} 
        placeholder="TL-2024-001" 
        iconName="document-text-outline"
      />
      
      <CSelect 
        label="Subcity" 
        value={subcity} 
        onValueChange={setSubcity} 
        options={SUBCITIES.map(sc => ({ value: sc, label: sc }))}
      />
      
      <CInput 
        label="የመኪና ማቆሚያ ብዛት / Number of Parking Spaces" 
        value={parkingSpaces} 
        onChangeText={setParkingSpaces} 
        placeholder="50" 
        iconName="car-outline"
        keyboardType="number-pad"
      />
      
      <CInput 
        label="Business Address" 
        value={businessAddress} 
        onChangeText={setBusinessAddress} 
        placeholder="Bole, Addis Ababa" 
        iconName="location-outline"
      />
      
      <CInput 
        label="የስራ ሰዓቶች / Operating Hours" 
        value={operatingHours} 
        onChangeText={setOperatingHours} 
        placeholder="24/7" 
        iconName="time-outline"
      />
      
      <CInput 
        label="Business Email" 
        value={businessEmail} 
        onChangeText={setBusinessEmail} 
        placeholder="info@parking.com" 
        iconName="mail-outline"
        keyboardType="email-address"
      />
    </View>
  );

  const renderShopKYB = () => (
    <View style={{ gap: 16 }}>
      <Text style={{ color: C.text, fontSize: 16, fontFamily: Fonts.bold, marginBottom: 8 }}>
        ðŸ›ï¸ Shop / Retail KYB Details
      </Text>
      
      <CInput 
        label="Business Name" 
        value={businessName} 
        onChangeText={setBusinessName} 
        placeholder="Merkato Electronics" 
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
        label="Trade License Number" 
        value={tradeLicense} 
        onChangeText={setTradeLicense} 
        placeholder="TL-2024-001" 
        iconName="document-text-outline"
      />
      
      <CSelect 
        label="Subcity" 
        value={subcity} 
        onValueChange={setSubcity} 
        options={SUBCITIES.map(sc => ({ value: sc, label: sc }))}
      />
      
      <CInput 
        label="Business Address" 
        value={businessAddress} 
        onChangeText={setBusinessAddress} 
        placeholder="Merkato, Addis Ababa" 
        iconName="location-outline"
      />
      
      <CInput 
        label="የስራ ሰዓቶች / Operating Hours" 
        value={operatingHours} 
        onChangeText={setOperatingHours} 
        placeholder="9:00 AM - 8:00 PM" 
        iconName="time-outline"
      />
      
      <CInput 
        label="Business Email" 
        value={businessEmail} 
        onChangeText={setBusinessEmail} 
        placeholder="contact@shop.com" 
        iconName="mail-outline"
        keyboardType="email-address"
      />
      
      <CInput 
        label="Number of Employees" 
        value={numberOfEmployees} 
        onChangeText={setNumberOfEmployees} 
        placeholder="8" 
        iconName="people-outline"
        keyboardType="number-pad"
      />
    </View>
  );

  const renderEmployerKYB = () => (
    <View style={{ gap: 16 }}>
      <Text style={{ color: C.text, fontSize: 16, fontFamily: Fonts.bold, marginBottom: 8 }}>
        💼 Employer / Company KYB Details
      </Text>
      
      <CInput 
        label="Company Name" 
        value={businessName} 
        onChangeText={setBusinessName} 
        placeholder="Ethio Telecom" 
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
        label="Business License" 
        value={licenseNo} 
        onChangeText={setLicenseNo} 
        placeholder="BL-2024-001" 
        iconName="shield-checkmark-outline"
      />
      
      <CSelect 
        label="Subcity" 
        value={subcity} 
        onValueChange={setSubcity} 
        options={SUBCITIES.map(sc => ({ value: sc, label: sc }))}
      />
      
      <CInput 
        label="የኩባንያ አድራሻ / Company Address" 
        value={businessAddress} 
        onChangeText={setBusinessAddress} 
        placeholder="Bole, Addis Ababa" 
        iconName="location-outline"
      />
      
      <CInput 
        label="የስራ ሰዓቶች / Operating Hours" 
        value={operatingHours} 
        onChangeText={setOperatingHours} 
        placeholder="8:00 AM - 5:00 PM" 
        iconName="time-outline"
      />
      
      <CInput 
        label="Company Email" 
        value={businessEmail} 
        onChangeText={setBusinessEmail} 
        placeholder="hr@company.com" 
        iconName="mail-outline"
        keyboardType="email-address"
      />
      
      <CInput 
        label="Number of Employees" 
        value={numberOfEmployees} 
        onChangeText={setNumberOfEmployees} 
        placeholder="250" 
        iconName="people-outline"
        keyboardType="number-pad"
      />
      
      <CInput 
        label="Contact Person" 
        value={contactPerson} 
        onChangeText={setContactPerson} 
        placeholder="HR Manager Name" 
        iconName="person-outline"
      />
      
      <CInput 
        label="Contact Phone" 
        value={contactPhone} 
        onChangeText={setContactPhone} 
        placeholder="+251 9XX XXX XXX" 
        iconName="call-outline"
        keyboardType="phone-pad"
      />
    </View>
  );

  const renderDelalaKYB = () => (
    <View style={{ gap: 16 }}>
      <Text style={{ color: C.text, fontSize: 16, fontFamily: Fonts.bold, marginBottom: 8 }}>
        ðŸ  Real-Estate Agent KYB Details
      </Text>
      
      <CInput 
        label="Business Name" 
        value={businessName} 
        onChangeText={setBusinessName} 
        placeholder="Ethio Homes Real Estate" 
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
        label="Trade License Number" 
        value={tradeLicense} 
        onChangeText={setTradeLicense} 
        placeholder="TL-2024-001" 
        iconName="document-text-outline"
      />
      
      <CInput 
        label="Agency License Number" 
        value={licenseNo} 
        onChangeText={setLicenseNo} 
        placeholder="AL-2024-001" 
        iconName="shield-checkmark-outline"
      />
      
      <CSelect 
        label="Subcity" 
        value={subcity} 
        onValueChange={setSubcity} 
        options={SUBCITIES.map(sc => ({ value: sc, label: sc }))}
      />
      
      <CInput 
        label="Business Address" 
        value={businessAddress} 
        onChangeText={setBusinessAddress} 
        placeholder="Bole, Addis Ababa" 
        iconName="location-outline"
      />
      
      <CInput 
        label="የስራ ሰዓቶች / Operating Hours" 
        value={operatingHours} 
        onChangeText={setOperatingHours} 
        placeholder="9:00 AM - 6:00 PM" 
        iconName="time-outline"
      />
      
      <CInput 
        label="Business Email" 
        value={businessEmail} 
        onChangeText={setBusinessEmail} 
        placeholder="info@realestate.com" 
        iconName="mail-outline"
        keyboardType="email-address"
      />
      
      <CInput 
        label="Service Area" 
        value={serviceArea} 
        onChangeText={setServiceArea} 
        placeholder="Bole, Kirkos, Yeka" 
        iconName="map-outline"
      />
    </View>
  );

  const renderTransportKYB = () => (
    <View style={{ gap: 16 }}>
      <Text style={{ color: C.text, fontSize: 16, fontFamily: Fonts.bold, marginBottom: 8 }}>
        🚌 Transport Operator KYB Details
      </Text>
      
      <CInput 
        label="Business Name" 
        value={businessName} 
        onChangeText={setBusinessName} 
        placeholder="Selam Bus Service" 
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
        label="Transport License" 
        value={licenseNo} 
        onChangeText={setLicenseNo} 
        placeholder="TP-2024-001" 
        iconName="shield-checkmark-outline"
      />
      
      <CSelect 
        label="Subcity" 
        value={subcity} 
        onValueChange={setSubcity} 
        options={SUBCITIES.map(sc => ({ value: sc, label: sc }))}
      />
      
      <CInput 
        label="Business Address" 
        value={businessAddress} 
        onChangeText={setBusinessAddress} 
        placeholder="Bole, Addis Ababa" 
        iconName="location-outline"
      />
      
      <CInput 
        label="የስራ ሰዓቶች / Operating Hours" 
        value={operatingHours} 
        onChangeText={setOperatingHours} 
        placeholder="5:00 AM - 10:00 PM" 
        iconName="time-outline"
      />
      
      <CInput 
        label="Business Email" 
        value={businessEmail} 
        onChangeText={setBusinessEmail} 
        placeholder="info@transport.com" 
        iconName="mail-outline"
        keyboardType="email-address"
      />
      
      <CInput 
        label="Service Area" 
        value={serviceArea} 
        onChangeText={setServiceArea} 
        placeholder="Addis Ababa - Dire Dawa" 
        iconName="map-outline"
      />
      
      <CInput 
        label="Number of Vehicles" 
        value={numberOfEmployees} 
        onChangeText={setNumberOfEmployees} 
        placeholder="25" 
        iconName="car-outline"
        keyboardType="number-pad"
      />
    </View>
  );

  const renderSalonKYB = () => (
    <View style={{ gap: 16 }}>
      <Text style={{ color: C.text, fontSize: 16, fontFamily: Fonts.bold, marginBottom: 8 }}>
        💈 Salon / Barbershop KYB Details
      </Text>
      
      <CInput 
        label="Business Name" 
        value={businessName} 
        onChangeText={setBusinessName} 
        placeholder="Modern Beauty Salon" 
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
        label="Trade License Number" 
        value={tradeLicense} 
        onChangeText={setTradeLicense} 
        placeholder="TL-2024-001" 
        iconName="document-text-outline"
      />
      
      <CInput 
        label="Professional License" 
        value={professionalLicense} 
        onChangeText={setProfessionalLicense} 
        placeholder="PL-2024-001" 
        iconName="shield-checkmark-outline"
      />
      
      <CSelect 
        label="Subcity" 
        value={subcity} 
        onValueChange={setSubcity} 
        options={SUBCITIES.map(sc => ({ value: sc, label: sc }))}
      />
      
      <CInput 
        label="Business Address" 
        value={businessAddress} 
        onChangeText={setBusinessAddress} 
        placeholder="Bole, Addis Ababa" 
        iconName="location-outline"
      />
      
      <CInput 
        label="የስራ ሰዓቶች / Operating Hours" 
        value={operatingHours} 
        onChangeText={setOperatingHours} 
        placeholder="9:00 AM - 8:00 PM" 
        iconName="time-outline"
      />
      
      <CInput 
        label="Business Email" 
        value={businessEmail} 
        onChangeText={setBusinessEmail} 
        placeholder="contact@salon.com" 
        iconName="mail-outline"
        keyboardType="email-address"
      />
      
      <CInput 
        label="Number of Employees" 
        value={numberOfEmployees} 
        onChangeText={setNumberOfEmployees} 
        placeholder="6" 
        iconName="people-outline"
        keyboardType="number-pad"
      />
    </View>
  );

  const renderClinicKYB = () => (
    <View style={{ gap: 16 }}>
      <Text style={{ color: C.text, fontSize: 16, fontFamily: Fonts.bold, marginBottom: 8 }}>
        ðŸ¥ Medical Clinic KYB Details
      </Text>
      
      <CInput 
        label="Clinic Name" 
        value={businessName} 
        onChangeText={setBusinessName} 
        placeholder="Addis Medical Center" 
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
        label="Practicing License" 
        value={clinicLicense} 
        onChangeText={setClinicLicense} 
        placeholder="CL-2024-001" 
        iconName="shield-checkmark-outline"
      />
      
      <CInput 
        label="Medical License" 
        value={professionalLicense} 
        onChangeText={setProfessionalLicense} 
        placeholder="ML-2024-001" 
        iconName="medical-outline"
      />
      
      <CSelect 
        label="Subcity" 
        value={subcity} 
        onValueChange={setSubcity} 
        options={SUBCITIES.map(sc => ({ value: sc, label: sc }))}
      />
      
      <CInput 
        label="Clinic Address" 
        value={businessAddress} 
        onChangeText={setBusinessAddress} 
        placeholder="Bole, Addis Ababa" 
        iconName="location-outline"
      />
      
      <CInput 
        label="የስራ ሰዓቶች / Operating Hours" 
        value={operatingHours} 
        onChangeText={setOperatingHours} 
        placeholder="8:00 AM - 8:00 PM" 
        iconName="time-outline"
      />
      
      <CInput 
        label="Clinic Email" 
        value={businessEmail} 
        onChangeText={setBusinessEmail} 
        placeholder="info@clinic.com" 
        iconName="mail-outline"
        keyboardType="email-address"
      />
      
      <CInput 
        label="Number of Staff" 
        value={numberOfEmployees} 
        onChangeText={setNumberOfEmployees} 
        placeholder="12" 
        iconName="people-outline"
        keyboardType="number-pad"
      />
      
      <CInput 
        label="Specialization" 
        value={specialization} 
        onChangeText={setSpecialization} 
        placeholder="General Medicine, Pediatrics" 
        iconName="medical-outline"
      />
    </View>
  );

  // Render Ekub KYB form
  const renderEkubKYB = () => (
    <View style={{ gap: 16 }}>
      <CInput 
        label="Association Name" 
        value={associationName} 
        onChangeText={setAssociationName} 
        placeholder="áŠ¥áŠ©á‰¥ áŠ á‰ áˆ‹á‰½á á‹¨áŠ“á‹°á‰£" 
        iconName="people-outline"
      />
      
      <CInput 
        label="Association Type" 
        value={associationType} 
        onChangeText={setAssociationType} 
        placeholder="áŠ¥áŠ©á‰¥á£ áŠ¢á‹µá‹­áˆ­" 
        iconName="flag-outline"
      />
      
      <CInput 
        label="Registration Number" 
        value={registrationNumber} 
        onChangeText={setRegistrationNumber} 
        placeholder="REG-123456" 
        iconName="document-text-outline"
      />
      
      <CInput 
        label="License Number" 
        value={licenseNo} 
        onChangeText={setLicenseNo} 
        placeholder="LIC-789012" 
        iconName="card-outline"
      />
      
      <CInput 
        label="License Type" 
        value={licenseType} 
        onChangeText={setLicenseType} 
        placeholder="áŠ¥áŠ©á‰¥ áˆµá‰°á‹‹á‹žá‰µ" 
        iconName="shield-checkmark-outline"
      />
      
      <CInput 
        label="Expiry Date" 
        value={licenseExpiry} 
        onChangeText={setLicenseExpiry} 
        placeholder="DD/MM/YYYY" 
        iconName="calendar-outline"
      />
      
      <CInput 
        label="Association Email" 
        value={associationEmail} 
        onChangeText={setAssociationEmail} 
        placeholder="info@ekub.com" 
        iconName="mail-outline"
        keyboardType="email-address"
      />
      
      <CInput 
        label="Association Phone" 
        value={associationPhone} 
        onChangeText={setAssociationPhone} 
        placeholder="+251 9X XXX XXXX" 
        iconName="call-outline"
        keyboardType="phone-pad"
      />
      
      <CInput 
        label="Number of Members" 
        value={numberOfMembers} 
        onChangeText={setNumberOfMembers} 
        placeholder="50" 
        iconName="people-outline"
        keyboardType="number-pad"
      />
      
      <CInput 
        label="Location" 
        value={location} 
        onChangeText={setLocation} 
        placeholder="áŠ á‹²áˆµ áŠ á‰ á‰£" 
        iconName="location-outline"
      />
    </View>
  );

  // Render appropriate KYB form based on merchant type
  const renderKYBForm = () => {
    switch (merchantType) {
      case 'restaurant': return renderRestaurantKYB();
      case 'parking': return renderParkingKYB();
      case 'shop': return renderShopKYB();
      case 'employer': return renderEmployerKYB();
      case 'delala': return renderDelalaKYB();
      case 'transport': return renderTransportKYB();
      case 'salon': return renderSalonKYB();
      case 'clinic': return renderClinicKYB();
      case 'ekub': return renderEkubKYB();
      default: return renderShopKYB(); // Default to shop KYB
    }
  };
  const renderWelcome = () => (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 }}>
      <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }], alignItems: 'center' }}>
        {/* Enhanced Logo with Gradient Border */}
        <View style={{ 
          width: 120, height: 120, borderRadius: Radius['3xl'], 
          backgroundColor: C.ink, alignItems: 'center', justifyContent: 'center',
          ...Shadow.xl, borderWidth: 3, borderColor: C.primary + '20',
          position: 'relative'
        }}>
          <View style={{ 
            width: 90, height: 90, borderRadius: Radius['2xl'], 
            backgroundColor: C.primaryL, alignItems: 'center', justifyContent: 'center',
            borderWidth: 2, borderColor: C.primary 
          }}>
            <Ionicons name="business" size={45} color={C.primary} />
          </View>
        </View>
        
        <Text style={{ marginTop: 32, fontSize: 42, fontFamily: Fonts.black, color: C.text, letterSpacing: -2, textAlign: 'center' }}>
          City<Text style={{ color: C.primary }}>Link</Text>
        </Text>
        
        <Text style={{ marginTop: 8, color: C.sub, fontSize: FontSize.xl, fontFamily: Fonts.medium, textAlign: 'center' }}>
          áŠ¢á‰µá‹®áŒµá‹« | Ethiopia
        </Text>
        
        <Text style={{ marginTop: 16, color: C.textSoft, fontSize: FontSize.lg, fontFamily: Fonts.medium, textAlign: 'center', lineHeight: 24, paddingHorizontal: 20 }}>
          Connecting Addis with premium services
        </Text>
        
        {/* Enhanced Warning Card */}
        <View style={{
          marginTop: 20, 
          backgroundColor: C.amber + '10', 
          borderRadius: Radius.lg, 
          padding: 12,
          borderWidth: 1,
          borderColor: C.amber + '30',
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8
        }}>
          <Ionicons name="warning" size={16} color={C.amber} />
          <Text style={{ color: C.amber, fontSize: FontSize.sm, fontFamily: Fonts.medium, flex: 1 }}>
            Fayda verification required for all services
          </Text>
        </View>
        
        {/* Enhanced Main Authentication Options */}
        <View style={{ marginTop: 40, width: '100%', gap: 16 }}>
          <CButton 
            title="áŒ€áˆáˆ­ / Get Started" 
            onPress={goToRegister}
            style={{ height: 56, borderRadius: Radius.xl }}
            textStyle={{ fontSize: 16, fontFamily: Fonts.bold }}
          />
          
          <TouchableOpacity onPress={goToLogin} style={{ paddingVertical: 8 }}>
            <Text style={{ color: C.primary, fontFamily: Fonts.bold, textAlign: 'center', fontSize: 15 }}>
              áˆ˜áŒá‰¢á‹« áŠ áˆˆá‹ / Already have account
            </Text>
          </TouchableOpacity>
        </View>

        {/* Enhanced Specialized Access Options */}
        <View style={{ marginTop: 40, width: '100%' }}>
          <Text style={{ 
            color: C.sub, 
            fontSize: FontSize.sm, 
            fontFamily: Fonts.medium, 
            textAlign: 'center', 
            marginBottom: 16 
          }}>
            áˆá‹© áŠáŒ»áŒ»áˆ¨áˆ³á‰µ | Specialized Access
          </Text>
          
          <View style={{ gap: 12 }}>
            {/* Enhanced Station Tablet Mode */}
            <Pressable 
              onPress={goToStation}
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: pressed ? C.lift : C.surface,
                padding: 16,
                borderRadius: Radius.xl,
                borderWidth: 1.5,
                borderColor: pressed ? C.primary : C.edge2,
                ...Shadow.md,
                transform: [{ scale: pressed ? 0.98 : 1 }]
              })}
            >
              <View style={{
                width: 44, height: 44, borderRadius: 22,
                backgroundColor: C.primaryL, alignItems: 'center', justifyContent: 'center',
                borderWidth: 2, borderColor: C.primary
              }}>
                <Ionicons name="tablet-portrait" size={22} color={C.primary} />
              </View>
              <View style={{ flex: 1, marginLeft: 16 }}>
                <Text style={{ color: C.text, fontFamily: Fonts.bold, fontSize: 15 }}>
                  Station Tablet Mode
                </Text>
                <Text style={{ color: C.sub, fontFamily: Fonts.medium, fontSize: 12, marginTop: 2 }}>
                  LRT gate scanner access
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={C.sub} />
            </Pressable>

            {/* Enhanced Inspector Mode */}
            <Pressable 
              onPress={goToInspector}
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: pressed ? C.lift : C.surface,
                padding: 16,
                borderRadius: Radius.xl,
                borderWidth: 1.5,
                borderColor: pressed ? C.amber : C.edge2,
                ...Shadow.md,
                transform: [{ scale: pressed ? 0.98 : 1 }]
              })}
            >
              <View style={{
                width: 44, height: 44, borderRadius: 22,
                backgroundColor: C.amber + '20', alignItems: 'center', justifyContent: 'center',
                borderWidth: 2, borderColor: C.amber
              }}>
                <Ionicons name="shield-checkmark" size={22} color={C.amber} />
              </View>
              <View style={{ flex: 1, marginLeft: 16 }}>
                <Text style={{ color: C.text, fontFamily: Fonts.bold, fontSize: 15 }}>
                  Inspector Mode
                </Text>
                <Text style={{ color: C.sub, fontFamily: Fonts.medium, fontSize: 12, marginTop: 2 }}>
                  Transit inspector access
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={C.sub} />
            </Pressable>
          </View>
        </View>
      </Animated.View>
    </View>
  );

  const renderLogin = () => (
    <View style={{ flex: 1, paddingHorizontal: 32 }}>
      <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
        {/* Header */}
        <View style={{ alignItems: 'center', paddingTop: 32, paddingBottom: 24 }}>
          <View style={{ 
            width: 70, height: 70, borderRadius: Radius['2xl'], 
            backgroundColor: C.primaryL, alignItems: 'center', justifyContent: 'center',
            ...Shadow.md 
          }}>
            <Ionicons name="call-outline" size={35} color={C.primary} />
          </View>
          <Text style={{ marginTop: 20, fontSize: 24, fontFamily: Fonts.black, color: C.text, textAlign: 'center' }}>
            áŠ¥áŠ•áŠ³áŠ• áŠ áˆ¨áŠ“á‹ / Welcome Back
          </Text>
        </View>

        {/* Simplified Auth Mode Selector */}
        <View style={{ flexDirection: 'row', backgroundColor: C.lift, borderRadius: Radius.xl, padding: 3, marginBottom: 24 }}>
          {['login', 'register'].map((mode) => (
            <TouchableOpacity 
              key={mode} 
              onPress={() => {
                setAuthMode(mode);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }} 
              style={{ 
                flex: 1, 
                paddingVertical: 12, 
                alignItems: 'center', 
                borderRadius: Radius.lg, 
                backgroundColor: authMode === mode ? C.white : 'transparent', 
                ...(authMode === mode ? Shadow.sm : {}) 
              }}
            >
              <Text style={{ 
                color: authMode === mode ? C.primary : C.sub, 
                fontFamily: Fonts.bold, 
                textTransform: 'capitalize', 
                fontSize: 13 
              }}>
                {mode === 'login' ? 'Login' : 'Register'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Phone Input */}
        <CInput 
          label="Phone Number" 
          value={phone} 
          onChangeText={setPhone} 
          placeholder="+251 9XX XXX XXX" 
          keyboardType="phone-pad" 
          iconName="call-outline"
          autoFocus
          onSubmitEditing={handleSendOTP}
        />

        {/* Government Login Option */}
        <TouchableOpacity 
          onPress={() => {
            console.log('Admin login button pressed in login screen');
            setAuthMode('gov');
            setCurrentScreen('gov');
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: C.primaryL,
            borderRadius: Radius.lg,
            padding: 12,
            borderWidth: 1,
            borderColor: C.primaryB,
            marginBottom: 16
          }}
        >
          <Ionicons name="shield-checkmark" size={18} color={C.primary} />
          <Text style={{ 
            marginLeft: 8, 
            color: C.primary, 
            fontFamily: Fonts.bold, 
            fontSize: 13 
          }}>
            áŠ áˆµá‰°á‰£á‰£áˆŠ / Admin Login
          </Text>
        </TouchableOpacity>

        {/* Error */}
        {error && (
          <View style={{ 
            backgroundColor: '#E8312A20', 
            borderRadius: Radius.lg, 
            padding: 14, 
            marginBottom: 20, 
            borderWidth: 1, 
            borderColor: '#E8312A50' 
          }}>
            <Text style={{ color: '#E8312A', fontFamily: Fonts.medium, fontSize: 13, textAlign: 'center' }}>
              {error}
            </Text>
          </View>
        )}

        {/* Submit Button */}
        <CButton 
          title={loading ? 'Processing...' : authMode === 'login' ? 'Sign In' : 'Continue'} 
          onPress={handleSendOTP} 
          loading={loading}
          style={{ height: 52, borderRadius: Radius.xl, marginBottom: 16 }}
          textStyle={{ fontSize: 16, fontFamily: Fonts.bold }}
        />

        {/* Back Button */}
        <TouchableOpacity 
          onPress={goBack}
          style={{ alignItems: 'center' }}
        >
          <Text style={{ color: C.sub, fontFamily: Fonts.medium, fontSize: 14 }}>
            â† á‹ˆá‹°áŠ‹áˆ‹ / Back
          </Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );

  const renderOTP = () => (
    <View style={{ flex: 1, paddingHorizontal: 32 }}>
      <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
        {/* Header */}
        <View style={{ alignItems: 'center', paddingTop: 32, paddingBottom: 24 }}>
          <View style={{ 
            width: 70, height: 70, borderRadius: Radius['2xl'], 
            backgroundColor: C.primaryL, alignItems: 'center', justifyContent: 'center',
            ...Shadow.md 
          }}>
            <Ionicons name="lock-closed-outline" size={35} color={C.primary} />
          </View>
          <Text style={{ marginTop: 20, fontSize: 24, fontFamily: Fonts.black, color: C.text, textAlign: 'center' }}>
            á‹«áˆµáˆ¨á‹‹áˆ¹ / Verify
          </Text>
          <Text style={{ marginTop: 8, color: C.sub, fontSize: FontSize.md, fontFamily: Fonts.medium, textAlign: 'center' }}>
            Code sent to {phone}
          </Text>
        </View>

        {/* Demo OTP */}
        {devOtp && (
          <View style={{ 
            marginBottom: 24, 
            padding: 20, 
            backgroundColor: C.primaryL, 
            borderRadius: Radius.xl, 
            alignItems: 'center',
            borderWidth: 2,
            borderColor: C.primary
          }}>
            <Text style={{ color: C.primary, fontSize: 28, fontFamily: Fonts.black, letterSpacing: 8 }}>
              {devOtp}
            </Text>
            <Text style={{ color: C.primary, fontSize: 11, fontFamily: Fonts.bold, marginTop: 6, textTransform: 'uppercase' }}>
              áŠ®á‹µ / Demo Code
            </Text>
          </View>
        )}

        {/* OTP Input */}
        <CInput 
          label="Verification Code" 
          value={otp} 
          onChangeText={setOtp} 
          placeholder="000000" 
          keyboardType="number-pad" 
          maxLength={6} 
          iconName="lock-closed-outline"
          autoFocus
          onSubmitEditing={handleVerifyOTP}
        />

        {/* Error */}
        {error && (
          <View style={{ 
            backgroundColor: '#E8312A20', 
            borderRadius: Radius.lg, 
            padding: 14, 
            marginBottom: 20, 
            borderWidth: 1, 
            borderColor: '#E8312A50' 
          }}>
            <Text style={{ color: '#E8312A', fontFamily: Fonts.medium, fontSize: 13, textAlign: 'center' }}>
              {error}
            </Text>
          </View>
        )}

        {/* Verify Button */}
        <CButton 
          title={loading ? 'Verifying...' : 'Verify Code'} 
          onPress={handleVerifyOTP} 
          loading={loading}
          style={{ height: 52, borderRadius: Radius.xl, marginBottom: 16 }}
          textStyle={{ fontSize: 16, fontFamily: Fonts.bold }}
        />

        {/* Resend */}
        <TouchableOpacity onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          handleSendOTP();
        }} style={{ alignItems: 'center' }}>
          <Text style={{ color: C.primary, fontFamily: Fonts.bold, fontSize: 15 }}>
            áŠ¥áŠ•á‹°áŒáˆ áˆ‹áŠ­ / Resend Code
          </Text>
        </TouchableOpacity>

        {/* Back */}
        <TouchableOpacity 
          onPress={goBack}
          style={{ marginTop: 20, alignItems: 'center' }}
        >
          <Text style={{ color: C.sub, fontFamily: Fonts.medium, fontSize: 14 }}>
            â† á‹ˆá‹°áŠ‹áˆ‹ / Back
          </Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );

  const renderRegister = () => (
    <View style={{ flex: 1, paddingHorizontal: 32 }}>
      <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
        {/* Header */}
        <View style={{ alignItems: 'center', paddingTop: 32, paddingBottom: 24 }}>
          <View style={{ 
            width: 70, height: 70, borderRadius: Radius['2xl'], 
            backgroundColor: C.primaryL, alignItems: 'center', justifyContent: 'center',
            ...Shadow.md 
          }}>
            <Ionicons name="person-add-outline" size={35} color={C.primary} />
          </View>
          <Text style={{ marginTop: 20, fontSize: 24, fontFamily: Fonts.black, color: C.text, textAlign: 'center' }}>
            áŠ áŠ«á‹áˆ / Create Account
          </Text>
          <Text style={{ marginTop: 8, color: C.sub, fontSize: FontSize.md, fontFamily: Fonts.medium, textAlign: 'center' }}>
            Join CityLink today
          </Text>
        </View>

        {/* Phone Input */}
        <CInput 
          label="Phone Number" 
          value={phone} 
          onChangeText={setPhone} 
          placeholder="+251 9XX XXX XXX" 
          keyboardType="phone-pad" 
          iconName="call-outline"
        />

        {/* Government Login Option */}
        <TouchableOpacity 
          onPress={() => {
            setAuthMode('gov');
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: C.primaryL,
            borderRadius: Radius.lg,
            padding: 12,
            borderWidth: 1,
            borderColor: C.primaryB,
            marginBottom: 16
          }}
        >
          <Ionicons name="shield-checkmark" size={18} color={C.primary} />
          <Text style={{ 
            marginLeft: 8, 
            color: C.primary, 
            fontFamily: Fonts.bold, 
            fontSize: 13 
          }}>
            áŠ áˆµá‰°á‰£á‰£áˆŠ / Admin Login
          </Text>
        </TouchableOpacity>

        {/* User Type */}
        <View style={{ flexDirection: 'row', gap: 12, marginBottom: 24 }}>
          {['citizen', 'merchant'].map((type) => (
            <TouchableOpacity 
              key={type} 
              onPress={() => {
                setUserType(type);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }} 
              style={{ 
                flex: 1, 
                paddingVertical: 16, 
                alignItems: 'center', 
                borderRadius: Radius.xl, 
                borderWidth: 2, 
                borderColor: userType === type ? C.primary : C.edge2, 
                backgroundColor: userType === type ? C.primaryL : C.white 
              }}
            >
              <Ionicons 
                name={type === 'citizen' ? 'person-outline' : 'business-outline'} 
                size={24} 
                color={userType === type ? C.primary : C.sub} 
              />
              <Text style={{ 
                color: userType === type ? C.primary : C.sub, 
                fontFamily: Fonts.bold, 
                textTransform: 'capitalize', 
                marginTop: 8,
                fontSize: 12
              }}>
                {type === 'citizen' ? 'Citizen' : 'Merchant'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Fields */}
        <CInput 
          label="Full Name" 
          value={fullName} 
          onChangeText={setFullName} 
          placeholder="Abebe Bikila" 
          iconName="person-outline"
        />

        {/* Merchant Type Selection */}
        {userType === 'merchant' && (
          <View style={{ marginBottom: 16 }}>
            <CSelect 
              label="Business Category" 
              value={merchantType} 
              onValueChange={setMerchantType} 
              options={MERCHANT_TYPES} 
            />
          </View>
        )}

        {/* KYB Form for Merchants */}
        {userType === 'merchant' && merchantType && (
          <View style={{ marginBottom: 16 }}>
            {renderKYBForm()}
          </View>
        )}

        {/* Error */}
        {error && (
          <View style={{ 
            backgroundColor: '#E8312A20', 
            borderRadius: Radius.lg, 
            padding: 14, 
            marginBottom: 20, 
            borderWidth: 1, 
            borderColor: '#E8312A50' 
          }}>
            <Text style={{ color: '#E8312A', fontFamily: Fonts.medium, fontSize: 13, textAlign: 'center' }}>
              {error}
            </Text>
          </View>
        )}

        {/* Submit */}
        <CButton 
          title={loading ? 'Creating...' : 'Complete Setup'} 
          onPress={handleRegister} 
          loading={loading}
          style={{ height: 52, borderRadius: Radius.xl, marginBottom: 16 }}
          textStyle={{ fontSize: 16, fontFamily: Fonts.bold }}
        />

        {/* Back */}
        <TouchableOpacity 
          onPress={goBack}
          style={{ alignItems: 'center' }}
        >
          <Text style={{ color: C.sub, fontFamily: Fonts.medium, fontSize: 14 }}>
            â† á‹ˆá‹°áŠ‹áˆ‹ / Back
          </Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );

  const renderGovLogin = () => (
    <View style={{ flex: 1, paddingHorizontal: 32 }}>
      <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
        {/* Header */}
        <View style={{ alignItems: 'center', paddingTop: 32, paddingBottom: 24 }}>
          <View style={{ 
            width: 70, height: 70, borderRadius: Radius['2xl'], 
            backgroundColor: C.primaryL, alignItems: 'center', justifyContent: 'center',
            ...Shadow.md 
          }}>
            <Ionicons name="shield-checkmark" size={35} color={C.primary} />
          </View>
          <Text style={{ marginTop: 20, fontSize: 24, fontFamily: Fonts.black, color: C.text, textAlign: 'center' }}>
            áŠ áˆµá‰°á‰£á‰£áˆŠ / Admin Login
          </Text>
          <Text style={{ marginTop: 8, color: C.sub, fontSize: FontSize.md, fontFamily: Fonts.medium, textAlign: 'center' }}>
            CityLink Administration
          </Text>
        </View>

        {/* Admin Email */}
        <CInput 
          label="Admin Email" 
          value={badgeId} 
          onChangeText={setBadgeId} 
          placeholder="admin@citylink.eth" 
          keyboardType="email-address"
          autoCapitalize="none"
          iconName="mail-outline"
        />

        {/* Password */}
        <CInput 
          label="Password" 
          value={secPin} 
          onChangeText={setSecPin} 
          placeholder="Enter password" 
          secureTextEntry
          iconName="lock-closed-outline"
        />

        {/* Error */}
        {error && (
          <View style={{ 
            backgroundColor: '#E8312A20', 
            borderRadius: Radius.lg, 
            padding: 14, 
            marginBottom: 20, 
            borderWidth: 1, 
            borderColor: '#E8312A50' 
          }}>
            <Text style={{ color: '#E8312A', fontFamily: Fonts.medium, fontSize: 13, textAlign: 'center' }}>
              {error}
            </Text>
          </View>
        )}

        {/* Submit */}
        <CButton 
          title={loading ? 'Verifying...' : 'Login'} 
          onPress={handleGovLogin} 
          loading={loading}
          style={{ height: 52, borderRadius: Radius.xl, marginBottom: 16 }}
          textStyle={{ fontSize: 16, fontFamily: Fonts.bold }}
        />

        {/* Back */}
        <TouchableOpacity 
          onPress={() => {
            setAuthMode('login');
            setBadgeId('');
            setSecPin('');
            setError('');
          }}
          style={{ alignItems: 'center' }}
        >
          <Text style={{ color: C.sub, fontFamily: Fonts.medium, fontSize: 14 }}>
            â† á‹ˆá‹°áŠ‹áˆ‹ / Back
          </Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );

  const handleGovLogin = async () => {
    setError('');
    
    if (!badgeId || !badgeId.includes('@')) {
      setError('Please enter a valid admin email address');
      return;
    }
    
    if (!secPin || secPin.trim().length < 3) {
      setError('Please enter a valid password');
      return;
    }
    
    setLoading(true);
    try {
      const { getClient } = require('../../services/supabase');
      const client = getClient();
      if (!client) {
        setError('Supabase client is not available.');
        setLoading(false);
        return;
      }

      let { data: authData, error: authErr } = await client.auth.signInWithPassword({
        email: badgeId.trim(),
        password: secPin
      });

      const systemPin = String(Config.adminCode || '').trim();
      const enteredPin = String(secPin || '').trim();
      
      // Strict clean (alphanumeric + @ only)
      const cleanSystem = systemPin.replace(/[^a-zA-Z0-9@]/g, '');
      const cleanEntered = enteredPin.replace(/[^a-zA-Z0-9@]/g, '');
      const isMasterPin = cleanSystem === cleanEntered;
      
      console.log('[CityLink] Gov Login Check:', { 
        email: badgeId.trim(), 
        pinMatch: isMasterPin, 
        systemLength: systemPin.length,
        cleanSystemLength: cleanSystem.length,
        enteredLength: enteredPin.length,
        systemCharCodes: Array.from(systemPin).map(c => c.charCodeAt(0))
      });

      // --- Auto-Register Logic ---
      // If sign-in fails but they used the master PIN, try to sign them up
      if (authErr && isMasterPin) {
        console.log('[CityLink] Sign-in failed but master PIN detected. Attempting auto-signup...');
        const adminName = 'Admin ' + badgeId.split('@')[0];
        const dummyPhone = '+251' + (Math.floor(900000000 + (Math.random() * 9999999))).toString();
        
        const signUpRes = await client.auth.signUp({
          email: badgeId.trim(),
          password: secPin,
          options: {
            data: {
              full_name: adminName,
              fullName: adminName,
              name: adminName,
              phone: dummyPhone,
              role: 'admin'
            }
          }
        });
        
        console.log('[CityLink] Signup Result:', { 
          hasUser: !!signUpRes.data?.user, 
          hasSession: !!signUpRes.data?.session, 
          error: signUpRes.error?.message 
        });
        
        if (signUpRes.error) {
          // If already registered, this is why they see "invalid credentials" (they have the wrong password)
          if (signUpRes.error.message.includes('already registered')) {
            setError('This email is already registered. Please login with your existing citizen password, or reset it in Supabase.');
            setLoading(false);
            return;
          } else if (Config.devMode && signUpRes.error.message.includes('Database error')) {
            // Throw so the Emergency Bypass catch block handles it
            throw new Error('Database level failure. Invoking Dev Bypass...');
          } else {
            setError('Admin registration failed: ' + signUpRes.error.message);
            setLoading(false);
            return;
          }
        }
        
        authData = signUpRes.data;
        authErr = null;
      }

      if (authErr) {
        setError(authErr.message);
        setLoading(false);
        return;
      }

      if (authData?.user) {
        const { fetchProfile, upsertProfile } = require('../../services/profile.service');
        const profileRes = await fetchProfile(authData.user.id);
        let profile = profileRes.data;

        // --- Promotion Logic ---
        // If profile doesn't exist OR role isn't admin, AND they used the master PIN as password
        if ((!profile || profile.role !== 'admin') && isMasterPin) {
          console.log('[CityLink] Promotion match! Upserting admin profile...');
          const newAdminData = {
            id: authData.user.id,
            phone: profile?.phone || '+251900000000',
            full_name: profile?.full_name || 'Admin ' + authData.user.email.split('@')[0],
            role: 'admin',
            kyc_status: 'VERIFIED',
          };
          const upsertRes = await upsertProfile(newAdminData);
          if (upsertRes.error) {
            setError('Failed to promote user to admin: ' + upsertRes.error);
            await client.auth.signOut();
            setLoading(false);
            return;
          }
          profile = newAdminData;
        }

        if (profile && profile.role === 'admin') {
          console.log('Admin login successful:', profile);
          await finishLogin(profile, 0);
          showToast('Welcome to Admin Dashboard! ðŸ›¡ï¸', 'success');
        } else {
          setError('This account does not have admin privileges. Contact system owner.');
          await client.auth.signOut();
        }
      }
    } catch (e) {
      console.error('Admin login error:', e);
      
      // --- Emergency Bypass for Local Dev ---
      // If we are in dev mode and the pin matched, let them in even if database failed
      const enteredPin = String(secPin || '').replace(/\s/g, '');
      const systemPin = String(Config.adminCode || '').replace(/\s/g, '');
      const isMasterPin = enteredPin === systemPin;
      
      if (Config.devMode && isMasterPin) {
        console.warn('[CityLink] DATABASE FAILED! Entering Emergency Dev Bypass Mode...');
        const devAdmin = {
          id: `dev-admin-${uid()}`,
          phone: '+251900000000',
          full_name: 'SysAdmin (Dev Bypass)',
          role: 'admin',
          kyc_status: 'VERIFIED',
        };
        await finishLogin(devAdmin, 0);
        showToast('Dev Bypass: Welcome to Dashboard! ðŸ›¡ï¸', 'warning');
        return;
      }
      
      setError('Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // New Authentication Screen Renders
  const renderFaydaKYC = () => (
    <View style={{ flex: 1, paddingHorizontal: 32 }}>
      <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
        {/* Header */}
        <View style={{ alignItems: 'center', paddingTop: 32, paddingBottom: 24 }}>
          <View style={{ 
            width: 70, height: 70, borderRadius: Radius['2xl'], 
            backgroundColor: C.greenL, alignItems: 'center', justifyContent: 'center',
            ...Shadow.md 
          }}>
            <Ionicons name="shield-checkmark" size={35} color={C.green} />
          </View>
          <Text style={{ marginTop: 20, fontSize: 24, fontFamily: Fonts.black, color: C.text, textAlign: 'center' }}>
            Fayda KYC Verification
          </Text>
          <Text style={{ marginTop: 8, color: C.sub, fontSize: FontSize.md, fontFamily: Fonts.medium, textAlign: 'center' }}>
            National Digital ID Verification
          </Text>
        </View>

        {/* Progress Steps */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 32 }}>
          {[1, 2, 3, 4].map((step) => (
            <View key={step} style={{ flex: 1, alignItems: 'center' }}>
              <View style={{
                width: 30,
                height: 30,
                borderRadius: 15,
                backgroundColor: step <= kycStep ? C.green : C.surface,
                borderWidth: 2,
                borderColor: step <= kycStep ? C.green : C.edge,
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                {step < kycStep ? (
                  <Ionicons name="checkmark" size={16} color={C.white} />
                ) : (
                  <Text style={{ color: step <= kycStep ? C.white : C.sub, fontSize: 12, fontFamily: Fonts.bold }}>
                    {step}
                  </Text>
                )}
              </View>
              <Text style={{ color: C.sub, fontSize: 10, fontFamily: Fonts.medium, marginTop: 4 }}>
                {step === 1 ? 'FIN' : step === 2 ? 'OTP' : step === 3 ? 'Bio' : 'Done'}
              </Text>
            </View>
          ))}
        </View>

        {/* Step Content */}
        {kycStep === 1 && (
          <View>
            <Text style={{ color: C.text, fontFamily: Fonts.bold, fontSize: 16, marginBottom: 8 }}>
              Enter Fayda FIN Number
            </Text>
            <Text style={{ color: C.sub, fontFamily: Fonts.medium, fontSize: 14, marginBottom: 24 }}>
              Your 12-digit National ID number
            </Text>
            <CInput 
              label="FIN Number" 
              value={faydaFIN} 
              onChangeText={setFaydaFIN} 
              placeholder="123456789012" 
              keyboardType="number-pad" 
              maxLength={12}
              autoFocus
            />
            <CButton 
              title="Verify FIN" 
              onPress={handleFaydaFINSubmit} 
              loading={loading}
              style={{ marginTop: 24 }}
            />
          </View>
        )}

        {kycStep === 2 && (
          <View>
            <Text style={{ color: C.text, fontFamily: Fonts.bold, fontSize: 16, marginBottom: 8 }}>
              Enter OTP Code
            </Text>
            <Text style={{ color: C.sub, fontFamily: Fonts.medium, fontSize: 14, marginBottom: 24 }}>
              6-digit code sent to your registered phone
            </Text>
            <Text style={{ color: C.primary, fontFamily: Fonts.medium, fontSize: 12, marginBottom: 8 }}>
              Development OTP: {faydaOTP}
            </Text>
            <CInput 
              label="OTP Code" 
              value={faydaOTP} 
              onChangeText={setFaydaOTP} 
              placeholder="123456" 
              keyboardType="number-pad" 
              maxLength={6}
              autoFocus
            />
            <CButton 
              title="Verify OTP" 
              onPress={handleFaydaOTPSubmit} 
              loading={loading}
              style={{ marginTop: 24 }}
            />
          </View>
        )}

        {kycStep === 3 && (
          <View>
            <Text style={{ color: C.text, fontFamily: Fonts.bold, fontSize: 16, marginBottom: 8 }}>
              Biometric Scan
            </Text>
            <Text style={{ color: C.sub, fontFamily: Fonts.medium, fontSize: 14, marginBottom: 32 }}>
              Simulating fingerprint scan...
            </Text>
            
            <View style={{ alignItems: 'center', marginVertical: 32 }}>
              <View style={{
                width: 120,
                height: 120,
                borderRadius: 60,
                backgroundColor: C.surface,
                borderWidth: 3,
                borderColor: biometricSimulated ? C.green : C.edge,
                alignItems: 'center',
                justifyContent: 'center',
                ...biometricSimulated ? Shadow.md : {},
              }}>
                <Ionicons 
                  name={biometricSimulated ? "checkmark" : "finger-print"} 
                  size={48} 
                  color={biometricSimulated ? C.green : C.sub} 
                />
              </View>
            </View>
            
            <CButton 
              title={biometricSimulated ? "Continue" : "Start Biometric Scan"} 
              onPress={handleBiometricScan} 
              loading={loading}
              style={{ marginTop: 24 }}
            />
          </View>
        )}

        {kycStep === 4 && (
          <View>
            <Text style={{ color: C.text, fontFamily: Fonts.bold, fontSize: 16, marginBottom: 8 }}>
              KYC Complete!
            </Text>
            <Text style={{ color: C.sub, fontFamily: Fonts.medium, fontSize: 14, marginBottom: 32 }}>
              Your Fayda verification is complete
            </Text>
            
            <View style={{ 
              backgroundColor: C.greenL, 
              padding: 16, 
              borderRadius: Radius.xl, 
              marginBottom: 24,
              borderWidth: 1,
              borderColor: C.greenB
            }}>
              <Text style={{ color: C.green, fontFamily: Fonts.bold, fontSize: 14, textAlign: 'center' }}>
                âœ“ FIN Verified: {faydaFIN}
              </Text>
              <Text style={{ color: C.green, fontFamily: Fonts.bold, fontSize: 14, textAlign: 'center', marginTop: 4 }}>
                âœ“ Biometric Verified
              </Text>
              <Text style={{ color: C.green, fontFamily: Fonts.bold, fontSize: 14, textAlign: 'center', marginTop: 4 }}>
                âœ“ Wallet Limit: 50,000 ETB
              </Text>
            </View>
            
            <CButton 
              title="Complete Verification" 
              onPress={handleFaydaComplete} 
              loading={loading}
              style={{ marginTop: 24 }}
            />
          </View>
        )}
      </Animated.View>
    </View>
  );

  const renderStationLogin = () => (
    <View style={{ flex: 1, paddingHorizontal: 32 }}>
      <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
        {/* Header */}
        <View style={{ alignItems: 'center', paddingTop: 32, paddingBottom: 24 }}>
          <View style={{ 
            width: 70, height: 70, borderRadius: Radius['2xl'], 
            backgroundColor: C.primaryL, alignItems: 'center', justifyContent: 'center',
            ...Shadow.md 
          }}>
            <Ionicons name="tablet-portrait" size={35} color={C.primary} />
          </View>
          <Text style={{ marginTop: 20, fontSize: 24, fontFamily: Fonts.black, color: C.text, textAlign: 'center' }}>
            Station Tablet Mode
          </Text>
          <Text style={{ marginTop: 8, color: C.sub, fontSize: FontSize.md, fontFamily: Fonts.medium, textAlign: 'center' }}>
            LRT Gate Scanner Access
          </Text>
        </View>

        {/* Station Login Form */}
        <View>
          <CInput 
            label="Station Name" 
            value={stationName} 
            onChangeText={setStationName} 
            placeholder="e.g., Addis Ababa Station" 
            autoFocus
          />
          <CInput 
            label="Station Code" 
            value={stationCode} 
            onChangeText={setStationCode} 
            placeholder="e.g., LRT-001" 
            style={{ marginTop: 16 }}
          />
          <CButton 
            title="Enter Station Mode" 
            onPress={handleStationLogin} 
            loading={loading}
            style={{ marginTop: 24 }}
          />
        </View>
      </Animated.View>
    </View>
  );

  const renderInspectorLogin = () => (
    <View style={{ flex: 1, paddingHorizontal: 32 }}>
      <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
        {/* Header */}
        <View style={{ alignItems: 'center', paddingTop: 32, paddingBottom: 24 }}>
          <View style={{ 
            width: 70, height: 70, borderRadius: Radius['2xl'], 
            backgroundColor: C.amberL, alignItems: 'center', justifyContent: 'center',
            ...Shadow.md 
          }}>
            <Ionicons name="shield-checkmark" size={35} color={C.amber} />
          </View>
          <Text style={{ marginTop: 20, fontSize: 24, fontFamily: Fonts.black, color: C.text, textAlign: 'center' }}>
            Inspector Mode
          </Text>
          <Text style={{ marginTop: 8, color: C.sub, fontSize: FontSize.md, fontFamily: Fonts.medium, textAlign: 'center' }}>
            Transit Inspector Access
          </Text>
        </View>

        {/* Inspector Login Form */}
        <View>
          <CInput 
            label="Inspector Badge ID" 
            value={inspectorBadge} 
            onChangeText={setInspectorBadge} 
            placeholder="e.g., INSP-123" 
            autoFocus
          />
          <CInput 
            label="Security PIN" 
            value={inspectorPIN} 
            onChangeText={setInspectorPIN} 
            placeholder="****" 
            keyboardType="number-pad"
            maxLength={4}
            secureTextEntry
            style={{ marginTop: 16 }}
          />
          <CButton 
            title="Enter Inspector Mode" 
            onPress={handleInspectorLogin} 
            loading={loading}
            style={{ marginTop: 24 }}
          />
        </View>
      </Animated.View>
    </View>
  );

  // Main render
  const renderScreen = () => {
    switch (currentScreen) {
      case 'welcome': return renderWelcome();
      case 'login': return renderLogin();
      case 'otp': return renderOTP();
      case 'register': return renderRegister();
      case 'gov': return renderGovLogin();
      case 'fayda': return renderFaydaKYC();
      case 'station': return renderStationLogin();
      case 'inspector': return renderInspectorLogin();
      default: return renderWelcome();
    }
  };

  return (
    <KeyboardAvoidingView 
      style={{ flex: 1, backgroundColor: C.ink }} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={C.ink} />
      <LinearGradient 
        colors={[C.primaryL, C.ink]} 
        style={{ position: 'absolute', top: 0, left: 0, right: 0, height: SCREEN_HEIGHT / 3 }} 
      />
      
      <ScrollView 
        contentContainerStyle={{ flexGrow: 1 }} 
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={{ paddingTop: insets.top }}>
          {renderScreen()}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
