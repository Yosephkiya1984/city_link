import React, { useCallback, useRef } from 'react';
import { View, Text, TouchableOpacity, Animated, Image, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Fonts } from '../../theme';

interface FeaturedCardProps {
  title: any;
  description: any;
  imageSource: any;
  icon: any;
  onPress: any;
  style?: any;
}

export function FeaturedCard({
  title,
  description,
  imageSource,
  icon,
  onPress,
  style,
}: FeaturedCardProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = useCallback(() => {
    Animated.spring(scaleAnim, {
      toValue: 0.98,
      tension: 150,
      friction: 5,
      useNativeDriver: true,
    }).start();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const handlePressOut = useCallback(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      tension: 150,
      friction: 5,
      useNativeDriver: true,
    }).start();
  }, []);

  return (
    <Animated.View style={[{ transform: [{ scale: scaleAnim }] }, style]}>
      <TouchableOpacity
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.9}
        style={styles.featuredCard}
      >
        <Image source={{ uri: imageSource }} style={styles.featuredImage} blurRadius={1} />
        <LinearGradient
          colors={['rgba(5, 6, 8, 0.9)', 'rgba(5, 6, 8, 0.2)', 'rgba(5, 6, 8, 0.9)']}
          style={styles.featuredGradient}
        />
        <View style={styles.featuredContent}>
          <View style={styles.featuredText}>
            <Text style={styles.featuredTag}>NEW UPDATE</Text>
            <Text style={styles.featuredTitle}>{title}</Text>
            <Text style={styles.featuredDescription}>{description}</Text>
          </View>
          <View style={styles.featuredIconContainer}>
            <Ionicons name={icon} size={40} color="rgba(255, 255, 255, 0.15)" />
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  featuredCard: {
    height: 180,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: '#101319',
  },
  featuredImage: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.6,
  },
  featuredGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  featuredContent: {
    flex: 1,
    padding: 24,
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  featuredText: {
    flex: 1,
  },
  featuredTag: {
    color: '#59de9b',
    fontSize: 10,
    fontFamily: Fonts.black,
    letterSpacing: 2,
    marginBottom: 8,
  },
  featuredTitle: {
    color: '#fff',
    fontSize: 22,
    fontFamily: Fonts.black,
    marginBottom: 4,
  },
  featuredDescription: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 12,
    fontFamily: Fonts.medium,
  },
  featuredIconContainer: {
    width: 60,
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
