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
  Pressable,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MotiView, AnimatePresence } from 'moti';
import * as Haptics from 'expo-haptics';
import { useAgentStore } from '../../store/AgentStore';
import { useAuthStore } from '../../store/AuthStore';
import { sendMessage } from '../../services/ai.service';
import { useT, uid, fmtTime } from '../../utils';
import { Typography } from '..';
import { Radius, Spacing, Fonts, Shadow, D } from '../hospitality/HospitalityTheme';
import { AIActionHandler } from './AIActionHandler';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { voiceService } from '../../services/voice.service';
import { Alert } from 'react-native';

const { width, height } = Dimensions.get('window');

/**
 * ConciergeComponent — The "Dream" AI Assistant for CityLink.
 * Features: Premium glassmorphism, pulse animations, localized intelligence.
 */
export function ConciergeComponent() {
  const { 
    isConciergeOpen, 
    toggleConcierge, 
    messages: allMessages, 
    addMessage, 
    isThinking, 
    setThinking,
    activeActionCard,
    hideActionCard,
    clearChat,
    snapshot,
    updateSnapshot
  } = useAgentStore();
  
  const uiMode = useAuthStore((s) => s.uiMode);
  const currentUser = useAuthStore((s) => s.currentUser);
  const T = useT();
  const messages = allMessages?.[uiMode] || [];

  const [inputText, setInputText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    if (isConciergeOpen) {
      updateSnapshot();
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages, isThinking, isConciergeOpen]);

  const handleSend = async (text?: string, audioBase64?: string) => {
    const msg = (text || inputText).trim();
    if (!msg && !audioBase64) return;
    if (isThinking) return;

    setInputText('');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // If it's a voice message but we don't have text yet, show a placeholder
    const userMsg = { 
      id: uid(), 
      role: 'user' as const, 
      content: msg || (audioBase64 ? '🎤 Voice message...' : ''), 
      timestamp: new Date().toISOString() 
    };
    addMessage(userMsg, uiMode);
    setThinking(true);

    const history = [...messages, userMsg].map(m => ({ 
      role: m.role, 
      content: m.content 
    }));

    try {
      const response = await sendMessage(
        history,
        undefined,
        audioBase64,
        snapshot || undefined,
        currentUser?.full_name || 'Citizen'
      );

      if (response.retryable) {
         addMessage({
          id: uid(),
          role: 'assistant',
          content: '⚠️ Service temporarily unavailable. Please try again in a moment.',
          timestamp: new Date().toISOString(),
        }, uiMode);
      } else {
        addMessage({
          id: uid(),
          role: 'assistant',
          content: response.text,
          timestamp: new Date().toISOString(),
          action: response.action,
        }, uiMode);
        
        // Auto-speak if it was a voice command
        if (audioBase64) {
          voiceService.speak(response.text);
        }
      }
    } catch (e: any) {
      console.error(e);
      addMessage({
        id: uid(),
        role: 'assistant',
        content: "I'm having trouble connecting to my brain right now. Please check your connection and try again.",
        timestamp: new Date().toISOString(),
      }, uiMode);
    } finally {
      setThinking(false);
    }
  };

  const toggleRecording = async () => {
    if (isRecording) {
      const result = await voiceService.stopRecording();
      setIsRecording(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      if (result?.base64) {
        handleSend(undefined, result.base64);
      }
    } else {
      const granted = await voiceService.requestPermissions();
      if (granted) {
        const started = await voiceService.startRecording();
        if (started) {
          setIsRecording(true);
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        }
      } else {
        Alert.alert('Permission Required', 'I need microphone access to hear you.');
      }
    }
  };

  const suggestions = [
    { key: 'ai_suggest_parking', icon: '🅿️' },
    { key: 'ai_suggest_transfer', icon: '💸' },
    { key: 'ai_suggest_food', icon: '🥘' },
  ];

  return (
    <>
      {/* Floating FAB with Pulse Animation */}
      <MotiView
        from={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        style={styles.fabContainer}
      >
        <TouchableOpacity
          style={styles.fab}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            toggleConcierge();
          }}
          activeOpacity={0.8}
        >
          {/* Animated Glow Aura */}
          <MotiView
            from={{ scale: 0.8, opacity: 0.5 }}
            animate={{ scale: 1.5, opacity: 0 }}
            transition={{ loop: true, duration: 2000, type: 'timing' }}
            style={styles.fabAura}
          />
          <LinearGradient
            colors={[D.ai_glow, '#4F46E5']}
            style={styles.fabGradient}
          >
            <Ionicons name="sparkles" size={26} color="#fff" />
          </LinearGradient>
        </TouchableOpacity>
      </MotiView>

      <Modal
        visible={isConciergeOpen}
        transparent
        animationType="none"
        onRequestClose={() => toggleConcierge(false)}
      >
        <AnimatePresence>
          {isConciergeOpen && (
            <MotiView
              from={{ translateY: height }}
              animate={{ translateY: 0 }}
              exit={{ translateY: height }}
              transition={{ type: 'spring', damping: 22, stiffness: 150 }}
              style={styles.modal}
            >
            <KeyboardAvoidingView
              style={{ flex: 1 }}
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
            >
              {/* Header */}
              <View style={styles.header}>
                <View style={styles.headerIndicator} />
                <View style={styles.headerContent}>
                  <View style={styles.aiBadge}>
                    <MotiView
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ loop: true, duration: 2000 }}
                    >
                      <Ionicons name="sparkles" size={14} color={D.ai_glow} />
                    </MotiView>
                    <Text style={styles.aiBadgeText}>CITYLINK AI</Text>
                  </View>
                  
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <TouchableOpacity 
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        clearChat(uiMode);
                      }} 
                      style={styles.headerAction}
                    >
                      <Ionicons name="trash-outline" size={20} color={D.sub} />
                    </TouchableOpacity>
                    <TouchableOpacity 
                      onPress={() => {
                        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                        toggleConcierge(false);
                      }} 
                      style={styles.headerAction}
                      hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
                    >
                      <Ionicons name="close" size={26} color={D.text} />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>

              {/* Chat Area */}
              <ScrollView
                ref={scrollRef}
                style={styles.chatArea}
                contentContainerStyle={styles.chatContent}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
                {messages.length === 0 ? (
                  <View style={styles.welcome}>
                    <MotiView
                      from={{ scale: 0.5, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ type: 'spring' }}
                      style={styles.welcomeIcon}
                    >
                      <Ionicons name="chatbubble-ellipses" size={40} color={D.ai_glow} />
                    </MotiView>
                    <Typography variant="h2" style={styles.welcomeTitle}>
                      {T('ai_concierge_title', { name: currentUser?.full_name?.split(' ')[0] || 'Citizen' })}
                    </Typography>
                    <Typography variant="body" style={styles.welcomeSub}>
                      {T('ai_concierge_welcome_msg', { name: currentUser?.full_name?.split(' ')[0] || 'Citizen' })}
                    </Typography>
                    
                    <View style={styles.suggestionGrid}>
                      {suggestions.map((s) => (
                        <TouchableOpacity
                          key={s.key}
                          style={styles.suggestionChip}
                          onPress={() => handleSend(T(s.key))}
                        >
                          <Text style={{ fontSize: 18 }}>{s.icon}</Text>
                          <Text style={styles.suggestionText}>{T(s.key)}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                ) : (
                  messages.map((msg) => (
                    <MotiView
                      key={msg.id}
                      from={{ opacity: 0, translateX: msg.role === 'user' ? 20 : -20 }}
                      animate={{ opacity: 1, translateX: 0 }}
                      style={[
                        styles.msgBubble,
                        msg.role === 'user' ? styles.userBubble : styles.aiBubble
                      ]}
                    >
                    {msg.role === 'user' ? (
                      <LinearGradient
                        colors={[D.ai_glow, '#4F46E5']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={StyleSheet.absoluteFill}
                      />
                    ) : (
                      <LinearGradient
                        colors={[D.ai_glow + '15', 'transparent']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={StyleSheet.absoluteFill}
                      />
                    )}
                      <Text style={[styles.msgText, msg.role === 'user' && { color: '#fff' }]}>
                        {msg.content}
                      </Text>
                      {msg.role === 'assistant' && (
                        <TouchableOpacity 
                          onPress={() => voiceService.speak(msg.content)}
                          style={styles.speakerBtn}
                        >
                          <Ionicons name="volume-medium-outline" size={16} color={D.sub} />
                        </TouchableOpacity>
                      )}
                      {msg.action && (
                        <AIActionHandler action={msg.action} onActionComplete={() => {}} />
                      )}
                      <Text style={[styles.timestamp, msg.role === 'user' && { color: 'rgba(255,255,255,0.6)' }]}>
                        {fmtTime(msg.timestamp)}
                      </Text>
                    </MotiView>
                  ))
                )}

                {isThinking && (
                  <MotiView
                    from={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    style={styles.thinkingContainer}
                  >
                    <View style={styles.thinkingDots}>
                      {[0, 1, 2].map((i) => (
                        <MotiView
                          key={i}
                          animate={{ translateY: [0, -5, 0] }}
                          transition={{ loop: true, delay: i * 150, duration: 600 }}
                          style={styles.dot}
                        />
                      ))}
                    </View>
                    <Text style={styles.thinkingText}>{T('ai_thinking')}</Text>
                  </MotiView>
                )}
              </ScrollView>

              {/* Input Area */}
              <BlurView intensity={80} tint="dark" style={styles.inputWrapper}>
                <View style={styles.inputArea}>
                  <TextInput
                    style={[styles.input, { maxHeight: 100 }]}
                    placeholder={isRecording ? 'Listening...' : T('ask_anything')}
                    placeholderTextColor={D.sub}
                    value={inputText}
                    onChangeText={setInputText}
                    multiline
                    editable={!isRecording}
                  />
                  
                  <TouchableOpacity 
                    onPress={toggleRecording}
                    style={[styles.voiceBtn, isRecording && styles.recordingActive]}
                  >
                    <AnimatePresence>
                      {isRecording && (
                        <MotiView
                          from={{ scale: 0.8, opacity: 0.5 }}
                          animate={{ scale: 2, opacity: 0 }}
                          transition={{ loop: true, duration: 1000, type: 'timing' }}
                          style={styles.voiceAura}
                        />
                      )}
                    </AnimatePresence>
                    <Ionicons 
                      name={isRecording ? 'mic' : 'mic-outline'} 
                      size={22} 
                      color={isRecording ? '#fff' : D.text} 
                    />
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={[styles.sendBtn, !inputText.trim() && { opacity: 0.5 }]} 
                    onPress={() => handleSend()}
                    disabled={!inputText.trim() || isThinking || isRecording}
                  >
                    <LinearGradient
                      colors={[D.ai_glow, '#4F46E5']}
                      style={StyleSheet.absoluteFill}
                    />
                    <Ionicons name="arrow-up" size={20} color="#fff" />
                  </TouchableOpacity>
                </View>
              </BlurView>
            </KeyboardAvoidingView>
          </MotiView>
        )}
      </AnimatePresence>
    </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  fabContainer: {
    position: 'absolute',
    right: 20,
    bottom: 110,
    zIndex: 1000,
  },
  fab: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadow.xl,
  },
  fabGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fabAura: {
    position: 'absolute',
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: D.ai_glow,
  },
  modal: {
    position: 'absolute',
    bottom: 0,
    width: width,
    height: height * 0.85,
    backgroundColor: D.surface,
    borderTopLeftRadius: Radius['2xl'],
    borderTopRightRadius: Radius['2xl'],
    zIndex: 1001,
    overflow: 'hidden',
    ...Shadow.xl,
  },
  header: {
    padding: 16,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: D.edge,
    backgroundColor: D.surface,
    zIndex: 10, // Ensure header is above scroll content
  },
  headerIndicator: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: D.edge,
    marginBottom: 16,
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
    backgroundColor: D.ink,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 8,
    borderWidth: 1,
    borderColor: D.edge,
  },
  aiBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontFamily: Fonts.black,
    letterSpacing: 1,
  },
  headerAction: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: D.ink,
  },
  chatArea: {
    flex: 1,
  },
  chatContent: {
    padding: 20,
    paddingBottom: 40,
  },
  welcome: {
    alignItems: 'center',
    marginTop: 60,
  },
  welcomeIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: D.ai_glow + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  welcomeTitle: {
    textAlign: 'center',
    marginBottom: 8,
  },
  welcomeSub: {
    color: D.sub,
    textAlign: 'center',
    marginBottom: 32,
  },
  suggestionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'center',
  },
  suggestionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: D.ink,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: D.edge,
  },
  suggestionText: {
    color: D.text,
    fontFamily: Fonts.bold,
    fontSize: 13,
  },
  msgBubble: {
    maxWidth: '85%',
    padding: 16,
    borderRadius: 20,
    marginBottom: 16,
    overflow: 'hidden',
    ...Shadow.sm,
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: D.ai_glow,
    borderBottomRightRadius: 4,
  },
  aiBubble: {
    alignSelf: 'flex-start',
    backgroundColor: D.ink,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: D.edge,
  },
  msgText: {
    color: D.text,
    fontSize: 15,
    fontFamily: Fonts.medium,
    lineHeight: 22,
  },
  timestamp: {
    fontSize: 10,
    color: D.sub,
    marginTop: 6,
    alignSelf: 'flex-end',
  },
  thinkingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 8,
  },
  thinkingDots: {
    flexDirection: 'row',
    gap: 4,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: D.ai_glow,
  },
  thinkingText: {
    color: D.sub,
    fontSize: 12,
    fontFamily: Fonts.medium,
  },
  inputWrapper: {
    padding: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: D.edge,
  },
  inputArea: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  input: {
    flex: 1,
    minHeight: 48,
    backgroundColor: D.ink,
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 12,
    color: D.text,
    fontSize: 15,
    fontFamily: Fonts.medium,
    borderWidth: 1,
    borderColor: D.edge,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    ...Shadow.md,
  },
  voiceBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: D.ink,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: D.edge,
  },
  recordingActive: {
    backgroundColor: '#EF4444',
    borderColor: '#EF4444',
  },
  voiceAura: {
    position: 'absolute',
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#EF4444',
  },
  speakerBtn: {
    marginTop: 8,
    padding: 4,
    alignSelf: 'flex-start',
  },
});
