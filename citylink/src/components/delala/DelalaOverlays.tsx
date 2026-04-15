import React, { useState, useEffect, useRef, useCallback, memo } from 'react';
import { View, Text, TouchableOpacity, Image, Animated, StyleSheet, Modal, ScrollView, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { COLORS } from './constants';
import { fmtETB } from '../../utils';

interface ChatModalProps {
  visible: boolean;
  thread: any;
  onClose: () => void;
  onSendMessage: (msg: string) => void;
}

export const ChatModal = memo(({ visible, thread, onClose, onSendMessage }: ChatModalProps) => {
  const scrollViewRef = useRef<ScrollView>(null);
  const [message, setMessage] = useState('');

  const handleSend = useCallback(() => {
    if (message.trim()) {
      onSendMessage(message);
      setMessage('');
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  }, [message, onSendMessage]);

  useEffect(() => {
    let timerId: NodeJS.Timeout;
    if (visible && scrollViewRef.current) {
      timerId = setTimeout(() => {
        if (scrollViewRef.current) {
          scrollViewRef.current.scrollToEnd({ animated: true });
        }
      }, 100);
    }
    return () => {
      if (timerId) clearTimeout(timerId);
    };
  }, [visible, thread?.messages]);

  if (!thread) return null;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.chatContainer}>
        <View style={styles.chatHeader}>
          <TouchableOpacity onPress={onClose} style={styles.chatBackButton}>
            <Ionicons name="arrow-back" size={24} color={COLORS['on-surface']} />
          </TouchableOpacity>

          <View style={styles.chatParticipantInfo}>
            <View style={styles.chatParticipantImagePlaceholder}>
              <Ionicons name="person" size={24} color={COLORS.outline} />
            </View>
            <View>
              <Text style={styles.chatParticipantName}>{thread.participant?.name || 'Agent'}</Text>
              <Text style={styles.chatPropertyTitle}>{thread.property?.title || 'Negotiation'}</Text>
            </View>
          </View>
        </View>

        <ScrollView
          ref={scrollViewRef}
          style={styles.messagesContainer}
          contentContainerStyle={styles.messagesContent}
        >
          {thread?.messages?.map((msg: any) => (
            <View
              key={msg.id}
              style={[
                styles.messageBubble,
                msg.sender === 'owner' ? styles.ownerMessage : styles.merchantMessage,
              ]}
            >
              <Text
                style={[
                  styles.messageText,
                  msg.sender === 'owner' ? styles.ownerMessageText : styles.merchantMessageText,
                ]}
              >
                {msg.text}
              </Text>
              {msg.type === 'offer' && (
                <View style={styles.offerContainer}>
                  <Text style={styles.offerText}>Offer: ETB {fmtETB(msg.offer, 0)}</Text>
                </View>
              )}
              <Text
                style={[
                  styles.messageTime,
                  msg.sender === 'owner' ? styles.ownerMessageTime : styles.merchantMessageTime,
                ]}
              >
                {new Date(msg.timestamp).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Text>
            </View>
          ))}
        </ScrollView>

        <View style={styles.chatInputContainer}>
          <TextInput
            style={styles.chatInput}
            value={message}
            onChangeText={setMessage}
            placeholder="Type a message..."
            placeholderTextColor={COLORS.outline}
            multiline
          />
          <TouchableOpacity
            onPress={handleSend}
            style={[
              styles.sendButton,
              message.trim() ? styles.sendButtonActive : styles.sendButtonInactive,
            ]}
            disabled={!message.trim()}
          >
            <Ionicons name="send" size={20} color={COLORS['on-primary']} />
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
});

interface FABProps {
  activeScreen: string;
  onPress: () => void;
}

export const FAB = memo(({ activeScreen, onPress }: FABProps) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = useCallback(() => {
    Animated.spring(scaleAnim, {
      toValue: 0.9,
      tension: 100,
      friction: 8,
      useNativeDriver: true,
    }).start();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, [scaleAnim]);

  const handlePressOut = useCallback(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      tension: 100,
      friction: 8,
      useNativeDriver: true,
    }).start();
  }, [scaleAnim]);

  const getFABLabel = () => {
    switch (activeScreen) {
      case 'Listings': return 'Browse Public';
      case 'Inventory': return 'Post Property';
      case 'Messages': return 'New Message';
      default: return 'Add';
    }
  };

  return (
    <Animated.View style={[styles.fab, { transform: [{ scale: scaleAnim }] }]}>
      <TouchableOpacity
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.8}
        style={styles.fabButton}
      >
        <Ionicons name="add" size={24} color={COLORS['on-primary']} />
        <View style={styles.fabTooltip}>
          <Text style={styles.fabTooltipText}>{getFABLabel()}</Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  // Chat
  chatContainer: { flex: 1, backgroundColor: COLORS.surface },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS['outline-variant'],
  },
  chatBackButton: { marginRight: 16 },
  chatParticipantInfo: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  chatParticipantImagePlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS['surface-container-highest'],
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatParticipantName: { fontSize: 16, fontWeight: '700', color: COLORS['on-surface'] },
  chatPropertyTitle: { fontSize: 12, color: COLORS.outline },
  messagesContainer: { flex: 1 },
  messagesContent: { padding: 16, gap: 12 },
  messageBubble: { maxWidth: '80%', padding: 12, borderRadius: 16 },
  ownerMessage: { alignSelf: 'flex-end', backgroundColor: COLORS.primary },
  merchantMessage: { alignSelf: 'flex-start', backgroundColor: COLORS['surface-container-high'] },
  messageText: { fontSize: 14, lineHeight: 20 },
  ownerMessageText: { color: COLORS['on-primary'] },
  merchantMessageText: { color: COLORS['on-surface'] },
  offerContainer: {
    marginTop: 8,
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  offerText: { fontSize: 13, fontWeight: '700', color: COLORS['on-primary'] },
  messageTime: { fontSize: 10, marginTop: 4, alignSelf: 'flex-end' },
  ownerMessageTime: { color: COLORS['on-primary-container'] },
  merchantMessageTime: { color: COLORS.outline },
  chatInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS['outline-variant'],
  },
  chatInput: {
    flex: 1,
    backgroundColor: COLORS['surface-container-low'],
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    color: COLORS['on-surface'],
    maxHeight: 100,
  },
  sendButton: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  sendButtonActive: { backgroundColor: COLORS.primary },
  sendButtonInactive: { backgroundColor: COLORS['surface-container-low'] },

  // FAB
  fab: { position: 'absolute', bottom: 24, right: 24, zIndex: 100 },
  fabButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 28,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  fabTooltip: { marginLeft: 8 },
  fabTooltipText: { color: COLORS['on-primary'], fontWeight: '800', fontSize: 13 },
});
