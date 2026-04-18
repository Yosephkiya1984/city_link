import React, { useRef, useCallback, memo } from 'react';
import { View, Text, TouchableOpacity, Image, Animated, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { COLORS } from './constants';
import { fmtETB } from '../../utils';

interface PublicPropertyCardProps {
  property: any;
  onPress: () => void;
  onMessagePress?: (property: any) => void;
}

const PublicPropertyCard = memo(
  ({ property, onPress, onMessagePress }: PublicPropertyCardProps) => {
    const scaleAnim = useRef(new Animated.Value(1)).current;

    const handlePressIn = useCallback(() => {
      Animated.spring(scaleAnim, {
        toValue: 0.98,
        tension: 100,
        friction: 8,
        useNativeDriver: true,
      }).start();
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }, [scaleAnim]);

    const handlePressOut = useCallback(() => {
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 100,
        friction: 8,
        useNativeDriver: true,
      }).start();
    }, [scaleAnim]);

    return (
      <Animated.View style={[styles.propertyCard, { transform: [{ scale: scaleAnim }] }]}>
        <TouchableOpacity
          onPress={onPress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          activeOpacity={0.9}
          style={styles.propertyCardContent}
          accessibilityRole="button"
          accessibilityLabel={`View details for ${property.title}`}
        >
          <View style={styles.propertyCardImageContainer}>
            <Image
              source={{ uri: property.image || 'https://via.placeholder.com/300' }}
              style={styles.propertyCardImage}
              defaultSource={require('../../../assets/icon.png')}
            />
            <View style={styles.propertyCardFeatures}>
              {property.features?.slice(0, 2).map((feature: any, index: number) => (
                <View
                  key={index}
                  style={[
                    styles.featureBadge,
                    feature === 'Video' && styles.videoBadge,
                    feature === 'Verified' && styles.verifiedBadgePrimary,
                  ]}
                >
                  {feature === 'Video' && (
                    <Ionicons name="videocam" size={12} color={COLORS['on-primary']} />
                  )}
                  <Text style={styles.featureBadgeText}>{feature}</Text>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.propertyCardBody}>
            <View style={styles.propertyCardHeader}>
              <Text style={styles.propertyCardTitle} numberOfLines={1}>
                {property.title}
              </Text>
              <Text style={styles.propertyCardPrice}>ETB {fmtETB(property.price, 0)}</Text>
            </View>

            <View style={styles.propertyCardLocation}>
              <Ionicons name="location" size={14} color={COLORS.outline} />
              <Text style={styles.propertyCardLocationText}>{property.location}</Text>
            </View>

            <View style={styles.propertyCardFooter}>
              <View style={styles.propertyCardBroker}>
                {property.broker?.image ? (
                  <Image
                    source={{ uri: property.broker.image }}
                    style={styles.brokerImage}
                    defaultSource={require('../../../assets/icon.png')}
                  />
                ) : (
                  <View style={styles.brokerPlaceholder}>
                    <Ionicons name="person" size={14} color={COLORS.outline} />
                  </View>
                )}
                <View>
                  <Text style={styles.brokerName}>{property.broker?.name || 'Pro Agent'}</Text>
                  {property.broker?.verified && (
                    <View style={styles.verifiedBadge}>
                      <Ionicons name="checkmark" size={10} color={COLORS['on-primary']} />
                      <Text style={styles.verifiedText}>Verified</Text>
                    </View>
                  )}
                </View>
              </View>

              <TouchableOpacity
                style={styles.messageButton}
                onPress={() => onMessagePress?.(property)}
                accessibilityLabel="Send a message about this property"
                accessibilityRole="button"
              >
                <Text style={styles.messageButtonText}>Message</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  }
);

export default PublicPropertyCard;

const styles = StyleSheet.create({
  propertyCard: {
    backgroundColor: COLORS['surface-container-low'],
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS['outline-variant'],
  },
  propertyCardContent: {
    flex: 1,
  },
  propertyCardImageContainer: {
    height: 180,
    position: 'relative',
  },
  propertyCardImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  propertyCardFeatures: {
    position: 'absolute',
    top: 12,
    left: 12,
    flexDirection: 'row',
    gap: 8,
  },
  featureBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  videoBadge: {
    backgroundColor: COLORS.secondary,
  },
  verifiedBadgePrimary: {
    backgroundColor: COLORS.primary,
  },
  featureBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS['on-primary'],
  },
  propertyCardBody: {
    padding: 16,
  },
  propertyCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  propertyCardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS['on-surface'],
    flex: 1,
    marginRight: 8,
  },
  propertyCardPrice: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primary,
  },
  propertyCardLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 16,
  },
  propertyCardLocationText: {
    fontSize: 12,
    color: COLORS['on-surface-variant'],
  },
  propertyCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: COLORS['outline-variant'],
    paddingTop: 12,
  },
  propertyCardBroker: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  brokerImage: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  brokerPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS['surface-container-highest'],
    alignItems: 'center',
    justifyContent: 'center',
  },
  brokerName: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS['on-surface'],
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
    marginTop: 2,
  },
  verifiedText: {
    fontSize: 8,
    fontWeight: '800',
    color: COLORS['on-primary'],
  },
  messageButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  messageButtonText: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS['on-primary'],
  },
});
