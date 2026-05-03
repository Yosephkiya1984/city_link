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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { MotiView, AnimatePresence } from 'moti';
import { BlurView } from 'expo-blur';
import TopBar from '../../components/TopBar';
import { useSystemStore } from '../../store/SystemStore';
import { ChatMessage } from '../../types';
import { Colors, LightColors, FontSize, Radius, Spacing, Shadow, Fonts } from '../../theme';
import { sendMessage, AIResponse } from '../../services/ai.service';
import { fmtTime, uid, t } from '../../utils';
import { AIActionHandler } from '../../components/ai/AIActionHandler';
import { useAuthStore } from '../../store/AuthStore';
import * as WalletService from '../../services/wallet.service';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Enhanced AI suggestions based on user behavior
const SMART_SUGGESTIONS = [
  { id: 'parking', icon: '🅿️', labelKey: 'find_parking', category: 'services' },
  { id: 'ekub', icon: '🤝', labelKey: 'ekub_groups', category: 'social' },
  { id: 'food', icon: '🍜', labelKey: 'food_delivery', category: 'lifestyle' },
  { id: 'spend', icon: '📈', labelKey: 'analyze_spending', category: 'finance' },
  { id: 'split', icon: '✂️', labelKey: 'split_last_bill', category: 'finance' },
];

export default function AIScreen() {
  const isDark = useSystemStore((s) => s.isDark);
  const C = isDark ? Colors : LightColors;
  const chatHistory = useSystemStore((s) => s.chatHistory) as (ChatMessage & { action?: any })[];
  const addChatMessage = useSystemStore((s) => s.addChatMessage);
  const clearChat = useSystemStore((s) => s.clearChat);

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  }, [chatHistory, loading]);

  async function handleSend(text?: string) {
    const msg = (text || input).trim();
    if (!msg || loading) return;
    setInput('');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const userMsg: ChatMessage = {
      id: uid(),
      role: 'user',
      content: msg,
      timestamp: new Date().toISOString(),
    };
    addChatMessage(userMsg);
    setLoading(true);

    // Fetch context for financial optimization
    let contextPrompt = '';
    if (
      msg.toLowerCase().includes('spend') ||
      msg.toLowerCase().includes('money') ||
      msg.toLowerCase().includes('split')
    ) {
      const { currentUser } = useAuthStore.getState();
      if (currentUser?.id) {
        const walletData = await WalletService.fetchWalletData(currentUser.id);
        if (walletData) {
          const recentTxs = walletData.transactions
            .slice(0, 5)
            .map((tx: any) => `- ${tx.merchant || tx.category}: ${tx.amount} ETB (${tx.type})`)
            .join('\n');
          contextPrompt = `\n\nUSER FINANCIAL CONTEXT:\nBalance: ${walletData.balance} ETB\nRecent Transactions:\n${recentTxs}`;
        }
      }
    }

    const apiMessages = chatHistory
      .map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }))
      .concat([{ role: 'user', content: msg + contextPrompt }]);

    try {
      const response: AIResponse = await sendMessage(apiMessages);

      addChatMessage({
        id: uid(),
        role: 'assistant',
        content: response.text,
        timestamp: new Date().toISOString(),
        // We store the action in the store if needed, or handle it locally
        // For now, let's assume ChatMessage can hold an optional action
      } as any);

      // If there's an action, we might want to store it specifically
      if (response.action) {
        // Update the last message with the action
        // In a real app, you'd update the store
      }
    } catch (e) {
      addChatMessage({
        id: uid(),
        role: 'assistant',
        content: t('ai_error_msg'),
        timestamp: new Date().toISOString(),
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: C.ink }}>
      <TopBar
        title={t('ai_assistant')}
        right={
          <TouchableOpacity onPress={clearChat} style={{ padding: 8 }}>
            <Ionicons name="trash-outline" size={22} color={C.red} />
          </TouchableOpacity>
        }
      />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
        >
          {chatHistory.length === 0 && (
            <MotiView
              from={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              style={{ alignItems: 'center', marginTop: 40 }}
            >
              <View
                style={{
                  width: 80,
                  height: 80,
                  borderRadius: 40,
                  backgroundColor: C.primaryL,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 20,
                }}
              >
                <Text style={{ fontSize: 40 }}>🤖</Text>
              </View>
              <Text
                style={{
                  color: C.text,
                  fontSize: FontSize.xl,
                  fontFamily: Fonts.black,
                  textAlign: 'center',
                }}
              >
                {t('greeting_simple')}, {t('ai_intro')}
              </Text>
              <Text
                style={{ color: C.sub, fontSize: FontSize.md, textAlign: 'center', marginTop: 8 }}
              >
                {t('ai_help_prompt')}
              </Text>

              {/* Suggestion Chips */}
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
                    onPress={() => handleSend(t(s.labelKey))}
                    style={{
                      backgroundColor: C.surface,
                      paddingHorizontal: 16,
                      paddingVertical: 10,
                      borderRadius: Radius.full,
                      borderWidth: 1,
                      borderColor: C.edge2,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 8,
                      ...Shadow.sm,
                    }}
                  >
                    <Text style={{ fontSize: 16 }}>{s.icon}</Text>
                    <Text style={{ color: C.text, fontSize: 13, fontFamily: Fonts.bold }}>
                      {t(s.labelKey)}
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
                    backgroundColor: msg.role === 'user' ? C.primary : C.surface,
                    borderBottomRightRadius: msg.role === 'user' ? 4 : 20,
                    borderBottomLeftRadius: msg.role === 'assistant' ? 4 : 20,
                    ...Shadow.sm,
                  }}
                >
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

                  {/* Render Action Handler if message has an action */}
                  {msg.action && (
                    <AIActionHandler action={msg.action} onActionComplete={() => {}} />
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
              <ActivityIndicator color={C.primary} size="small" />
              <Text style={{ color: C.sub, fontSize: FontSize.sm }}>{t('ai_thinking')}</Text>
            </View>
          )}
        </ScrollView>

        {/* Floating Input Bar */}
        <BlurView
          intensity={Platform.OS === 'ios' ? 80 : 100}
          tint={isDark ? 'dark' : 'light'}
          style={{
            position: 'absolute',
            bottom: 20,
            left: 16,
            right: 16,
            borderRadius: 30,
            padding: 6,
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: isDark ? 'rgba(30,30,30,0.5)' : 'rgba(255,255,255,0.7)',
            borderWidth: 1,
            borderColor: C.edge2,
            ...Shadow.lg,
          }}
        >
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder={t('ask_anything')}
            placeholderTextColor={C.sub}
            style={{
              flex: 1,
              paddingHorizontal: 16,
              color: C.text,
              fontSize: FontSize.md,
              fontFamily: Fonts.medium,
              maxHeight: 100,
            }}
            multiline
          />
          <TouchableOpacity
            onPress={() => handleSend()}
            disabled={!input.trim() || loading}
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: input.trim() ? C.primary : C.edge2,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name="arrow-up" size={24} color="#fff" />
          </TouchableOpacity>
        </BlurView>
      </KeyboardAvoidingView>
    </View>
  );
}
