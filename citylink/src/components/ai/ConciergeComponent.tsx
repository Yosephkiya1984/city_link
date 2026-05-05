import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MotiView, AnimatePresence } from 'moti';
import * as Haptics from 'expo-haptics';
import { useAgentStore } from '../../store/AgentStore';
import { useAuthStore } from '../../store/AuthStore';
import { sendMessage } from '../../services/ai.service';
import { Typography, Surface } from '..';
import { D, Radius, Shadow, Spacing, Fonts } from '../../screens/merchant/components/StitchTheme';

const { width, height } = Dimensions.get('window');

export function ConciergeComponent() {
  const { 
    isConciergeOpen, 
    toggleConcierge, 
    messages, 
    addMessage, 
    isThinking, 
    setThinking,
    activeActionCard,
    hideActionCard
  } = useAgentStore();
  const currentUser = useAuthStore((s) => s.currentUser);
  const [inputText, setInputText] = useState('');
  const scrollRef = useRef<ScrollView>(null);

  const handleSend = async () => {
    if (!inputText.trim() || isThinking) return;

    const userMsg = { role: 'user', content: inputText.trim() };
    addMessage(userMsg);
    setInputText('');
    setThinking(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const response = await sendMessage([...messages, userMsg]);
    
    addMessage({ role: 'assistant', content: response.text });
    setThinking(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  useEffect(() => {
    if (scrollRef.current) {
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages, isThinking]);

  return (
    <>
      {/* Floating Action Button */}
      <MotiView
        from={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        style={styles.fabContainer}
      >
        <TouchableOpacity
          style={styles.fab}
          onPress={() => toggleConcierge()}
          activeOpacity={0.8}
        >
          <Ionicons name="sparkles" size={24} color={D.bg} />
        </TouchableOpacity>
      </MotiView>

      <AnimatePresence>
        {isConciergeOpen && (
          <MotiView
            from={{ translateY: height }}
            animate={{ translateY: 0 }}
            exit={{ translateY: height }}
            transition={{ type: 'spring', damping: 20 }}
            style={styles.modal}
          >
            <View style={styles.header}>
              <View style={styles.headerIndicator} />
              <View style={styles.headerContent}>
                <View style={styles.aiBadge}>
                  <Ionicons name="sparkles" size={12} color={D.primary} />
                  <Text style={styles.aiBadgeText}>CITYLINK AI</Text>
                </View>
                <TouchableOpacity onPress={() => toggleConcierge(false)}>
                  <Ionicons name="close-circle" size={28} color={D.sub} />
                </TouchableOpacity>
              </View>
            </View>

            <ScrollView 
              ref={scrollRef}
              style={styles.chatArea}
              contentContainerStyle={styles.chatContent}
              showsVerticalScrollIndicator={false}
            >
              {messages.length === 0 && (
                <View style={styles.welcome}>
                  <Typography variant="h2">Selam, {currentUser?.full_name?.split(' ')[0]}</Typography>
                  <Typography variant="body" color="sub" style={{ textAlign: 'center', marginTop: 8 }}>
                    I can help you pay bills, find parking, book tables, or manage your shop. Ask me anything in English or Amharic.
                  </Typography>
                </View>
              )}

              {messages.map((msg, i) => (
                <View 
                  key={i} 
                  style={[
                    styles.msgBubble, 
                    msg.role === 'user' ? styles.userBubble : styles.aiBubble
                  ]}
                >
                  <Text style={[styles.msgText, msg.role === 'user' && { color: D.bg }]}>
                    {msg.content}
                  </Text>
                </View>
              ))}

              {isThinking && (
                <View style={[styles.msgBubble, styles.aiBubble]}>
                  <ActivityIndicator size="small" color={D.primary} />
                </View>
              )}

              {activeActionCard && activeActionCard.visible && (
                <ActionCard card={activeActionCard} onHide={hideActionCard} />
              )}
            </ScrollView>

            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : undefined}
              keyboardVerticalOffset={Platform.OS === 'ios' ? 20 : 0}
            >
              <View style={styles.inputArea}>
                <TextInput
                  style={styles.input}
                  placeholder="Ask the concierge..."
                  placeholderTextColor={D.sub}
                  value={inputText}
                  onChangeText={setInputText}
                  onSubmitEditing={handleSend}
                />
                <TouchableOpacity 
                  style={[styles.sendBtn, !inputText.trim() && { opacity: 0.5 }]} 
                  onPress={handleSend}
                >
                  <Ionicons name="arrow-up" size={20} color={D.bg} />
                </TouchableOpacity>
              </View>
            </KeyboardAvoidingView>
          </MotiView>
        )}
      </AnimatePresence>
    </>
  );
}

function ActionCard({ card, onHide }: any) {
  return (
    <MotiView
      from={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      style={styles.actionCard}
    >
      <View style={styles.actionHeader}>
        <Ionicons name="flash" size={16} color={D.primary} />
        <Text style={styles.actionTitle}>{card.type.replace('_', ' ')}</Text>
      </View>
      <Typography variant="body" style={{ marginVertical: 12 }}>
        Would you like me to process this {card.type.toLowerCase()} now?
      </Typography>
      <View style={styles.actionButtons}>
        <TouchableOpacity style={styles.confirmBtn} onPress={onHide}>
          <Text style={styles.confirmBtnText}>CONFIRM</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.cancelBtn} onPress={onHide}>
          <Text style={styles.cancelBtnText}>CANCEL</Text>
        </TouchableOpacity>
      </View>
    </MotiView>
  );
}

const styles = StyleSheet.create({
  fabContainer: {
    position: 'absolute',
    right: 20,
    bottom: 100,
    zIndex: 1000,
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: D.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadow.lift,
  },
  modal: {
    position: 'absolute',
    bottom: 0,
    width: width,
    height: height * 0.7,
    backgroundColor: D.surface,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    zIndex: 1001,
    ...Shadow.heavy,
  },
  header: {
    padding: 16,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: D.edge,
  },
  headerIndicator: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: D.edge,
    marginBottom: 12,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },
  aiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: D.bg,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 6,
  },
  aiBadgeText: {
    color: D.primary,
    fontSize: 10,
    fontFamily: Fonts.black,
    letterSpacing: 1,
  },
  chatArea: {
    flex: 1,
  },
  chatContent: {
    padding: 20,
  },
  welcome: {
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 40,
  },
  msgBubble: {
    maxWidth: '85%',
    padding: 12,
    borderRadius: 16,
    marginBottom: 12,
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: D.primary,
    borderBottomRightRadius: 4,
  },
  aiBubble: {
    alignSelf: 'flex-start',
    backgroundColor: D.bg,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: D.edge,
  },
  msgText: {
    color: D.text,
    fontSize: 15,
    fontFamily: Fonts.medium,
  },
  inputArea: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: D.bg,
    borderTopWidth: 1,
    borderTopColor: D.edge,
  },
  input: {
    flex: 1,
    height: 44,
    backgroundColor: D.surface,
    borderRadius: 22,
    paddingHorizontal: 16,
    color: D.text,
    marginRight: 12,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: D.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionCard: {
    backgroundColor: D.bg,
    borderRadius: Radius.lg,
    padding: 16,
    marginVertical: 10,
    borderWidth: 1,
    borderColor: D.primary + '40',
    ...Shadow.lift,
  },
  actionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionTitle: {
    color: D.primary,
    fontFamily: Fonts.black,
    fontSize: 12,
    textTransform: 'uppercase',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  confirmBtn: {
    flex: 1,
    height: 40,
    backgroundColor: D.primary,
    borderRadius: Radius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmBtnText: { color: D.bg, fontFamily: Fonts.black, fontSize: 13 },
  cancelBtn: {
    flex: 1,
    height: 40,
    backgroundColor: D.surface,
    borderWidth: 1,
    borderColor: D.edge,
    borderRadius: Radius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelBtnText: { color: D.sub, fontFamily: Fonts.bold, fontSize: 13 },
});
