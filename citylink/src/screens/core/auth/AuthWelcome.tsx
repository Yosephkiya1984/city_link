import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ImageBackground,
  Dimensions,
  ScrollView,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MotiView } from 'moti';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Fonts, Colors } from '../../../theme';
import { Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

export interface AuthWelcomeProps {
  C: any;
  fadeAnim: any;
  slideAnim: any;
  onLogin: () => void;
  onRegister: () => void;
  onGov: () => void;
  t: (key: string) => string;
}

export const AuthWelcome = ({ onLogin, onRegister, onGov, t }: AuthWelcomeProps) => {
  const insets = useSafeAreaInsets();
  const [activeSlide, setActiveSlide] = useState(0);
  const scrollX = useRef(new Animated.Value(0)).current;
  const scrollViewRef = useRef<ScrollView>(null);

  const handleScroll = Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], {
    useNativeDriver: false,
    listener: (event: any) => {
      const slide = Math.round(event.nativeEvent.contentOffset.x / width);
      if (slide !== activeSlide) setActiveSlide(slide);
    },
  });

  const slides = [
    {
      id: '1',
      titlePart1: t('welcome_title').split(' ')[0],
      titlePart2: t('welcome_title').split(' ').slice(1).join(' ') + '.',
      desc: t('welcome_desc'),
      icon: 'planet-outline',
      color: Colors.primary,
    },
    {
      id: '2',
      titlePart1: t('onboard_commerce_title'),
      titlePart2: '',
      desc: t('onboard_commerce_desc'),
      icon: 'basket-outline',
      color: '#3B82F6', // Blue for commerce
    },
    {
      id: '3',
      titlePart1: t('onboard_parking_title'),
      titlePart2: '',
      desc: t('onboard_parking_desc'),
      icon: 'car-sport-outline',
      color: '#EF4444', // Red for parking
    },
    {
      id: '4',
      titlePart1: t('onboard_delala_title'),
      titlePart2: '',
      desc: t('onboard_delala_desc'),
      icon: 'home-outline',
      color: '#F59E0B', // Amber/Gold for Real Estate
    },
    {
      id: '5',
      titlePart1: t('onboard_tonight_title'),
      titlePart2: '',
      desc: t('onboard_tonight_desc'),
      icon: 'moon-outline',
      color: '#EC4899', // Pink for Nightlife
    },
    {
      id: '6',
      titlePart1: t('onboard_ai_title'),
      titlePart2: '',
      desc: t('onboard_ai_desc'),
      icon: 'hardware-chip-outline',
      color: '#14B8A6', // Teal for AI
    },
    {
      id: '7',
      titlePart1: t('onboard_merchant_title'),
      titlePart2: '',
      desc: t('onboard_merchant_desc'),
      icon: 'storefront-outline',
      color: '#10B981', // Green for Merchant/Business
    },
    {
      id: '8',
      titlePart1: t('onboard_ekub_title'),
      titlePart2: '',
      desc: t('onboard_ekub_desc'),
      icon: 'cellular-outline',
      color: '#F59E0B', // Amber for Ekub/Finance
    },
    {
      id: '9',
      titlePart1: t('onboard_verified_title'),
      titlePart2: '',
      desc: t('onboard_verified_desc'),
      icon: 'shield-checkmark',
      color: '#8B5CF6', // Purple for Security
    },
  ];

  // Auto-play the sliding animation every 4 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      let nextSlide = activeSlide + 1;
      if (nextSlide >= slides.length) {
        nextSlide = 0;
      }
      scrollViewRef.current?.scrollTo({ x: nextSlide * width, animated: true });
      setActiveSlide(nextSlide);
    }, 4500);
    return () => clearInterval(interval);
  }, [activeSlide, slides.length]);

  return (
    <View style={styles.container}>
      <ImageBackground
        source={require('../../../../assets/welcome_bg.png')}
        style={styles.background}
        resizeMode="cover"
      >
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.8)', '#000000']}
          style={styles.gradient}
        >
          <View
            style={[
              styles.content,
              { paddingBottom: Math.max(insets.bottom, 40), paddingTop: Math.max(insets.top, 20) },
            ]}
          >
            <MotiView
              from={{ opacity: 0, translateY: 40 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{ type: 'timing', duration: 1000, delay: 200 }}
              style={styles.carouselWrapper}
            >
              <ScrollView
                ref={scrollViewRef}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onScroll={handleScroll}
                scrollEventThrottle={16}
                style={styles.scrollView}
              >
                {slides.map((slide) => (
                  <View key={slide.id} style={styles.slide}>
                    <View style={styles.iconContainer}>
                      <Ionicons name={slide.icon as any} size={42} color={slide.color} />
                    </View>
                    <Text style={styles.title}>
                      {slide.titlePart1}
                      {slide.titlePart2 ? '\n' : ''}
                      <Text style={{ color: Colors.primary }}>{slide.titlePart2}</Text>
                    </Text>
                    <Text style={styles.subtitle}>{slide.desc}</Text>
                  </View>
                ))}
              </ScrollView>

              {/* Dots indicator */}
              <View style={styles.dotsContainer}>
                {slides.map((_, i) => {
                  const inputRange = [(i - 1) * width, i * width, (i + 1) * width];
                  const dotWidth = scrollX.interpolate({
                    inputRange,
                    outputRange: [8, 24, 8],
                    extrapolate: 'clamp',
                  });
                  const opacity = scrollX.interpolate({
                    inputRange,
                    outputRange: [0.3, 1, 0.3],
                    extrapolate: 'clamp',
                  });
                  return (
                    <Animated.View key={i} style={[styles.dot, { width: dotWidth, opacity }]} />
                  );
                })}
              </View>
            </MotiView>

            <MotiView
              from={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: 'timing', duration: 800, delay: 600 }}
              style={styles.buttonGroup}
            >
              <TouchableOpacity
                activeOpacity={0.8}
                style={styles.mainButtonContainer}
                onPress={onRegister}
              >
                <LinearGradient
                  colors={['#2AF598', '#009EFD']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.mainButton}
                >
                  <Text style={styles.buttonText}>{t('get_started').toUpperCase()}</Text>
                </LinearGradient>
              </TouchableOpacity>

              <View style={styles.secondaryActions}>
                <TouchableOpacity onPress={onLogin}>
                  <Text style={styles.secondaryText}>
                    {t('already_have_account')}{' '}
                    <Text style={{ color: Colors.primary, fontFamily: Fonts.bold }}>
                      {t('sign_in')}
                    </Text>
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onLongPress={onGov}
                  delayLongPress={1000}
                  activeOpacity={1}
                  style={{ marginTop: 32, opacity: 0.3 }}
                >
                  <Text
                    style={{
                      color: '#FFFFFF',
                      fontSize: 10,
                      fontFamily: Fonts.body,
                      letterSpacing: 2,
                    }}
                  >
                    CITYLINK OS V1.0.4
                  </Text>
                </TouchableOpacity>
              </View>
            </MotiView>
          </View>
        </LinearGradient>
      </ImageBackground>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  background: {
    flex: 1,
    width: width,
    height: height,
  },
  gradient: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingHorizontal: 0,
  },
  content: {
    width: '100%',
    paddingHorizontal: 32,
  },
  carouselWrapper: {
    marginBottom: 32,
    marginLeft: -32, // Offset the parent padding
    width: width,
  },
  scrollView: {
    width: width,
  },
  slide: {
    width: width,
    paddingHorizontal: 32,
    justifyContent: 'flex-end',
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  title: {
    fontSize: 52,
    fontFamily: Fonts.headline,
    color: '#FFF',
    lineHeight: 56,
    letterSpacing: -1.5,
  },
  subtitle: {
    fontSize: 18,
    fontFamily: Fonts.body,
    color: 'rgba(255,255,255,0.7)',
    lineHeight: 26,
    marginTop: 16,
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    paddingHorizontal: 32,
    marginTop: 24,
    height: 8,
  },
  dot: {
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.primary,
    marginRight: 8,
  },
  buttonGroup: {
    width: '100%',
  },
  mainButtonContainer: {
    width: '100%',
    height: 64,
    borderRadius: 32,
    overflow: 'hidden',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 10,
  },
  mainButton: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 18,
    fontFamily: Fonts.black,
    color: '#000',
    letterSpacing: 1,
  },
  secondaryActions: {
    marginTop: 24,
    alignItems: 'center',
    gap: 12,
  },
  secondaryText: {
    fontSize: 14,
    fontFamily: Fonts.body,
    color: '#FFF',
  },
  govLink: {
    marginTop: 8,
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.2)',
  },
});
