import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Animated,
  Dimensions,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { MotiView, AnimatePresence } from 'moti';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import TopBar from '../../components/TopBar';
import { useSystemStore } from '../../store/SystemStore';
import { ChatMessage } from '../../types';
import { Colors, LightColors, FontSize, Radius, Spacing, Shadow, Fonts } from '../../theme';
import { sendMessage, AIResponse } from '../../services/ai.service';
import { fmtTime, uid, t, useT } from '../../utils';
import { AIActionHandler } from '../../components/ai/AIActionHandler';
import { useAuthStore } from '../../store/AuthStore';
import * as WalletService from '../../services/wallet.service';
import { voiceService } from '../../services/voice.service';
import { Alert } from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Enhanced AI suggestions based on user behavior
const SMART_SUGGESTIONS = [
  { id: 'parking', icon: '🅿️', labelKey: 'ai_suggest_parking', category: 'services' },
  { id: 'transfer', icon: '💸', labelKey: 'ai_suggest_transfer', category: 'finance' },
  { id: 'food', icon: '🥘', labelKey: 'ai_suggest_food', category: 'lifestyle' },
];

export default function AIScreen({ route }: any) {
  const isDark = useSystemStore((s) => s.isDark);
  const C = isDark ? Colors : LightColors;
  const chatHistories = useSystemStore((s) => s.chatHistories);
  const addChatMessage = useSystemStore((s) => s.addChatMessage);
  const clearChat = useSystemStore((s) => s.clearChat);
  const uiMode = useAuthStore((s) => s.uiMode);
  const T = useT();

  const chatHistory = (chatHistories?.[uiMode] || []) as ChatMessage[];

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  const dashboardContext = route?.params?.context || `${uiMode.charAt(0).toUpperCase() + uiMode.slice(1)} Dashboard`;

  useEffect(() => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  }, [chatHistory, loading]);

  async function handleSend(text?: string, audioBase64?: string) {
    const msg = (text || input).trim();
    if (!msg && !audioBase64) return;
    if (loading) return;
    setInput('');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const userMsg: ChatMessage = {
      id: uid(),
      role: 'user',
      content: msg || (audioBase64 ? '🎤 Voice message...' : ''),
      timestamp: new Date().toISOString(),
    };
    addChatMessage(userMsg, uiMode);
    setLoading(true);

    const { currentUser } = useAuthStore.getState();
    let contextPrompt = `USER NAME: ${currentUser?.full_name || 'Citizen'}\nCONTEXT: ${dashboardContext}`;

    try {
      // Map ChatMessage → AIMessage (AIMessage only has role + content)
      const aiHistory = [...chatHistory, userMsg].map(({ role, content }) => ({ role: role as 'user' | 'assistant', content }));
      const response = await sendMessage(aiHistory, contextPrompt, audioBase64);
      addChatMessage(
        {
          id: uid(),
          role: 'assistant',
          content: response.text,
          timestamp: new Date().toISOString(),
          action: response.action,
        },
        uiMode
      );
      
      if (audioBase64) {
        voiceService.speak(response.text);
      }
    } catch (e) {
      console.warn('AI error:', e);
    } finally {
      setLoading(false);
    }
  }

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

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <TopBar
        title={T('ai_assistant')}
        right={
          <TouchableOpacity onPress={() => clearChat(uiMode)} style={{ padding: 8 }}>
            <Ionicons name="trash-outline" size={22} color={Colors.red} />
          </TouchableOpacity>
        }
      />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : (StatusBar.currentHeight ?? 0) + 60}
      >
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 16 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {chatHistory.length === 0 && (
            <MotiView
              from={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              style={{ alignItems: 'center', marginTop: 40 }}
            >
              <MotiView
                animate={{ scale: [1, 1.05, 1], rotate: ['0deg', '5deg', '0deg'] }}
                transition={{ loop: true, duration: 4000, type: 'timing' }}
                style={{
                  width: 80,
                  height: 80,
                  borderRadius: 40,
                  backgroundColor: isDark ? '#8B5CF620' : '#8B5CF610',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 20,
                  borderWidth: 1,
                  borderColor: '#8B5CF640',
                }}
              >
                <Ionicons name="sparkles" size={40} color="#8B5CF6" />
              </MotiView>
              
              <Text
                style={{
                  color: C.text,
                  fontSize: FontSize.xl,
                  fontFamily: Fonts.black,
                  textAlign: 'center',
                }}
              >
                {T('ai_welcome_title')}
              </Text>
              <Text
                style={{ color: C.sub, fontSize: FontSize.md, textAlign: 'center', marginTop: 8 }}
              >
                {T('ai_welcome_desc')}
              </Text>

              <View
                style={{
                  flexDirection: 'row',
                  flexWrap: 'wrap',
                  justifyContent: 'center',
                  gap: 10,
                  marginTop: 32,
                  paddingHorizontal: 20,
                }}
              >
                {SMART_SUGGESTIONS.map((s) => (
                  <TouchableOpacity
                    key={s.id}
                    onPress={() => handleSend(T(s.labelKey))}
                    style={{
                      backgroundColor: isDark ? '#111C2C' : '#fff',
                      paddingHorizontal: 16,
                      paddingVertical: 12,
                      borderRadius: Radius.full,
                      borderWidth: 1,
                      borderColor: isDark ? 'rgba(255,255,255,0.1)' : '#eee',
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 8,
                      ...Shadow.sm,
                    }}
                  >
                    <Text style={{ fontSize: 16 }}>{s.icon}</Text>
                    <Text style={{ color: C.text, fontSize: 13, fontFamily: Fonts.bold }}>
                      {T(s.labelKey)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </MotiView>
          )}

          {chatHistory.map((msg, idx) => (
            <MotiView
              key={msg.id}
              from={{ opacity: 0, translateY: 10 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{ delay: idx * 50 }}
              style={{
                flexDirection: 'row',
                justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
              }}
            >
              <View style={{ maxWidth: '85%' }}>
                <View
                  style={{
                    padding: 14,
                    borderRadius: 20,
                    backgroundColor: msg.role === 'user' ? '#8B5CF6' : (isDark ? '#111C2C' : '#fff'),
                    borderBottomRightRadius: msg.role === 'user' ? 4 : 20,
                    borderBottomLeftRadius: msg.role === 'assistant' ? 4 : 20,
                    borderWidth: msg.role === 'assistant' ? 1 : 0,
                    borderColor: 'rgba(255,255,255,0.1)',
                    overflow: 'hidden',
                    ...Shadow.sm,
                  }}
                >
                  {msg.role === 'user' && (
                    <LinearGradient
                      colors={['#8B5CF6', '#4F46E5']}
                      style={StyleSheet.absoluteFill}
                    />
                  )}
                  <Text
                    style={{
                      color: msg.role === 'user' ? '#fff' : C.text,
                      fontSize: FontSize.md,
                      lineHeight: 22,
                      fontFamily: Fonts.medium,
                    }}
                  >
                    {msg.content}
                  </Text>

                  {msg.role === 'assistant' && (
                    <TouchableOpacity 
                      onPress={() => voiceService.speak(msg.content)}
                      style={{ marginTop: 8, padding: 4, alignSelf: 'flex-start' }}
                    >
                      <Ionicons name="volume-medium-outline" size={16} color={C.sub} />
                    </TouchableOpacity>
                  )}

                  {msg.action && (
                    <AIActionHandler action={{ type: msg.action.type as any, data: msg.action.data }} onActionComplete={() => {}} />
                  )}
                </View>
                <Text
                  style={{
                    color: C.sub,
                    fontSize: 10,
                    marginTop: 4,
                    textAlign: msg.role === 'user' ? 'right' : 'left',
                  }}
                >
                  {fmtTime(msg.timestamp)}
                </Text>
              </View>
            </MotiView>
          ))}

          {loading && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{ flexDirection: 'row', gap: 4 }}>
                {[0, 1, 2].map((i) => (
                  <MotiView
                    key={i}
                    animate={{ translateY: [0, -5, 0] }}
                    transition={{ loop: true, delay: i * 150, duration: 600 }}
                    style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#8B5CF6' }}
                  />
                ))}
              </View>
              <Text style={{ color: C.sub, fontSize: FontSize.sm }}>{T('ai_thinking')}</Text>
            </View>
          )}
        </ScrollView>

        <BlurView
          intensity={isDark ? 40 : 80}
          tint={isDark ? 'dark' : 'light'}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            marginHorizontal: 12,
            marginBottom: Platform.OS === 'ios' ? 12 : 8,
            marginTop: 6,
            borderRadius: 30,
            padding: 6,
            backgroundColor: isDark ? 'rgba(30,30,40,0.7)' : 'rgba(255,255,255,0.8)',
            borderWidth: 1,
            borderColor: isDark ? 'rgba(255,255,255,0.1)' : '#eee',
            ...Shadow.lg,
            overflow: 'hidden',
          }}
        >
            <TextInput
              value={input}
              onChangeText={setInput}
              placeholder={isRecording ? 'Listening...' : T('ask_anything')}
              placeholderTextColor={C.sub}
              style={{
                flex: 1,
                paddingHorizontal: 16,
                paddingVertical: 10,
                color: C.text,
                fontSize: FontSize.md,
                fontFamily: Fonts.medium,
                maxHeight: 120,
                minHeight: 44,
              }}
              multiline
              editable={!isRecording}
            />

            <TouchableOpacity
              onPress={toggleRecording}
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                backgroundColor: isRecording ? '#EF4444' : (isDark ? '#1E293B' : '#eee'),
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: 6,
              }}
            >
              <AnimatePresence>
                {isRecording && (
                  <MotiView
                    from={{ scale: 0.8, opacity: 0.5 }}
                    animate={{ scale: 2, opacity: 0 }}
                    transition={{ loop: true, duration: 1000, type: 'timing' }}
                    style={{
                      position: 'absolute',
                      width: 44,
                      height: 44,
                      borderRadius: 22,
                      backgroundColor: '#EF4444',
                    }}
                  />
                )}
              </AnimatePresence>
              <Ionicons 
                name={isRecording ? 'mic' : 'mic-outline'} 
                size={22} 
                color={isRecording ? '#fff' : C.text} 
              />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => handleSend()}
              disabled={!input.trim() || loading || isRecording}
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                overflow: 'hidden',
                backgroundColor: input.trim() ? '#8B5CF6' : (isDark ? '#1E293B' : '#eee'),
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {input.trim() && (
                <LinearGradient
                  colors={['#8B5CF6', '#4F46E5']}
                  style={StyleSheet.absoluteFill}
                />
              )}
              <Ionicons name="arrow-up" size={24} color="#fff" />
            </TouchableOpacity>
        </BlurView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  // Add any needed styles here
});
import { StyleSheet } from 'react-native';
