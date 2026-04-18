import React, { useRef, useCallback, memo } from 'react';
import { View, Text, TouchableOpacity, Image, Animated, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { COLORS } from './constants';
import { fmtETB } from '../../utils';
import { PropertyListing } from '../../types';

interface InventoryPropertyCardProps {
  property: PropertyListing;
  onPress: () => void;
  onNegotiate: (property: PropertyListing) => void;
  onEdit?: (property: PropertyListing) => void;
  onFindDelala?: (property: PropertyListing) => void;
}

const InventoryPropertyCard = memo(
  ({ property, onPress, onNegotiate, onEdit, onFindDelala }: InventoryPropertyCardProps) => {
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

    const getStatusColor = (status: string) => {
      switch (status) {
        case 'NEGOTIATING':
          return COLORS.secondary;
        case 'AGREED':
          return COLORS.primary;
        case 'PENDING':
          return COLORS.outline;
        default:
          return COLORS.outline;
      }
    };

    return (
      <Animated.View style={[styles.inventoryCard, { transform: [{ scale: scaleAnim }] }]}>
        <TouchableOpacity
          onPress={onPress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          activeOpacity={0.9}
          style={styles.inventoryCardContent}
        >
          <View style={styles.inventoryCardImageContainer}>
            <Image
              source={{ uri: property.images?.[0] || 'https://via.placeholder.com/300' }}
              style={styles.inventoryCardImage}
              defaultSource={require('../../../assets/icon.png')}
            />
            <View
              style={[styles.statusBadge, { backgroundColor: getStatusColor(property.status) }]}
            >
              <Text style={styles.statusBadgeText}>{property.status}</Text>
            </View>
          </View>

          <View style={styles.inventoryCardBody}>
            <View style={styles.inventoryCardHeader}>
              <Text style={styles.inventoryCardTitle} numberOfLines={1}>
                {property.title}
              </Text>
              <Text style={styles.inventoryCardPrice}>ETB {fmtETB(property.price, 0)}</Text>
            </View>

            <View style={styles.inventoryCardLocation}>
              <Ionicons name="location" size={14} color={COLORS.outline} />
              <Text style={styles.inventoryCardLocationText}>{property.location}</Text>
            </View>

            {property.negotiations && property.negotiations.length > 0 && (
              <View style={styles.negotiationSection}>
                <Text style={styles.negotiationTitle}>Active Negotiations</Text>
                {property.negotiations.map((negotiation: any, index: number) => (
                  <View
                    key={negotiation.id ? negotiation.id : `${negotiation.merchant}-${index}`}
                    style={styles.negotiationItem}
                  >
                    <Text style={styles.negotiationMerchant}>{negotiation.merchant}</Text>
                    <Text style={styles.negotiationOffer}>ETB {fmtETB(negotiation.offer, 0)}</Text>
                  </View>
                ))}
              </View>
            )}

            <View style={styles.inventoryCardActions}>
              <TouchableOpacity
                style={styles.editButton}
                onPress={() => onEdit?.(property)}
                accessibilityLabel="Edit property listing"
                accessibilityRole="button"
              >
                <Ionicons name="create" size={16} color={COLORS['on-surface']} />
                <Text style={styles.editButtonText}>Edit</Text>
              </TouchableOpacity>

              {property.negotiations && property.negotiations.length > 0 ? (
                <TouchableOpacity
                  style={styles.negotiateButton}
                  onPress={() => onNegotiate(property)}
                  accessibilityLabel="View negotiation chat"
                  accessibilityRole="button"
                >
                  <Ionicons name="chatbubble" size={16} color={COLORS['on-primary']} />
                  <Text style={styles.negotiateButtonText}>View Chat</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={styles.negotiateButton}
                  onPress={() => onFindDelala?.(property)}
                  accessibilityLabel="Find an agent for this property"
                  accessibilityRole="button"
                >
                  <Ionicons name="add-circle" size={16} color={COLORS['on-primary']} />
                  <Text style={styles.negotiateButtonText}>Find Delala</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  }
);

export default InventoryPropertyCard;

const styles = StyleSheet.create({
  inventoryCard: {
    backgroundColor: COLORS['surface-container-low'],
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS['outline-variant'],
  },
  inventoryCardContent: {
    flex: 1,
  },
  inventoryCardImageContainer: {
    height: 140,
    position: 'relative',
  },
  inventoryCardImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  statusBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: COLORS['on-primary'],
  },
  inventoryCardBody: {
    padding: 16,
  },
  inventoryCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  inventoryCardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS['on-surface'],
    flex: 1,
    marginRight: 8,
  },
  inventoryCardPrice: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primary,
  },
  inventoryCardLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 12,
  },
  inventoryCardLocationText: {
    fontSize: 12,
    color: COLORS['on-surface-variant'],
  },
  negotiationSection: {
    backgroundColor: COLORS['surface-container'],
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  negotiationTitle: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.outline,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  negotiationItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  negotiationMerchant: {
    fontSize: 12,
    color: COLORS['on-surface'],
    fontWeight: '600',
  },
  negotiationOffer: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: '700',
  },
  inventoryCardActions: {
    flexDirection: 'row',
    gap: 12,
  },
  editButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS['outline-variant'],
  },
  editButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS['on-surface'],
  },
  negotiateButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: COLORS.primary,
  },
  negotiateButtonText: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS['on-primary'],
  },
});
