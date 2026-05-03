import React, { useRef, useCallback, memo } from 'react';
import { View, Text, TouchableOpacity, Animated, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { COLORS } from './constants';
import { t } from '../../utils';

interface MessageThreadProps {
  thread: any;
  onPress: () => void;
  currentUser: any;
}

const MessageThread = memo(({ thread, onPress, currentUser }: MessageThreadProps) => {
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

  const isUserA = thread.user_a_id === currentUser?.id;
  const other = isUserA ? thread.user_b : thread.user_a;
  const name = other?.business_name || other?.full_name || 'Agent';

  return (
    <Animated.View style={[styles.messageThread, { transform: [{ scale: scaleAnim }] }]}>
      <TouchableOpacity
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.9}
        style={styles.messageThreadContent}
      >
        <View style={styles.messageThreadHeader}>
          <View style={styles.participantInfo}>
            <View
              style={[
                styles.participantImage,
                {
                  backgroundColor: COLORS['surface-container-highest'],
                  alignItems: 'center',
                  justifyContent: 'center',
                },
              ]}
            >
              <Ionicons name="person" size={20} color={COLORS.outline} />
            </View>
            <View style={styles.participantDetails}>
              <View style={styles.participantNameRow}>
                <Text style={styles.participantName}>{name}</Text>
                {(other?.kyc_status === 'VERIFIED' || other?.merchant_status === 'APPROVED') && (
                  <Ionicons name="checkmark-circle" size={16} color={COLORS.primary} />
                )}
              </View>
              <Text style={styles.propertyReference}>{t('negotiation_thread')}</Text>
            </View>
          </View>

          <View style={styles.messageThreadMeta}>
            <Text style={styles.lastMessageTime}>
              {(() => {
                const d = new Date(thread.last_ts);
                return isNaN(d.getTime()) ? t('active') : d.toLocaleDateString();
              })()}
            </Text>
          </View>
        </View>

        <Text style={styles.lastMessage} numberOfLines={2}>
          {thread.last_msg || t('no_messages_yet')}
        </Text>

        {thread.status === 'agreed' && (
          <View style={styles.agreementBadge}>
            <Ionicons name="checkmark-circle" size={12} color={COLORS['on-primary']} />
            <Text style={styles.agreementText}>{t('agreement_reached')}</Text>
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
});

export default MessageThread;

const styles = StyleSheet.create({
  messageThread: {
    backgroundColor: COLORS['surface-container-low'],
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS['outline-variant'],
    overflow: 'hidden',
  },
  messageThreadContent: {
    padding: 16,
  },
  messageThreadHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  participantInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  participantImage: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  participantDetails: {
    gap: 2,
  },
  participantNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  participantName: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS['on-surface'],
  },
  propertyReference: {
    fontSize: 11,
    color: COLORS['on-surface-variant'],
    fontWeight: '500',
  },
  messageThreadMeta: {
    alignItems: 'flex-end',
  },
  lastMessageTime: {
    fontSize: 11,
    color: COLORS.outline,
  },
  lastMessage: {
    fontSize: 13,
    color: COLORS['on-surface-variant'],
    lineHeight: 18,
  },
  agreementBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginTop: 12,
  },
  agreementText: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS['on-primary'],
  },
});
