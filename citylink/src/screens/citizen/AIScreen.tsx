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
  FlatList,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import TopBar from '../../components/TopBar';
import { useSystemStore } from '../../store/SystemStore';
import { ChatMessage } from '../../types';
import { Colors, LightColors, FontSize, Radius, Spacing, Shadow, Fonts } from '../../theme';
import { sendMessage } from '../../services/ai.service';
import { fmtTime, uid, timeAgo } from '../../utils';
import { CButton, CInput, SectionTitle } from '../../components';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Enhanced AI suggestions based on user behavior
const SMART_SUGGESTIONS = [
  { id: 'parking', icon: '🅿️', text: 'Find Parking', category: 'services', priority: 'high' },
  { id: 'ekub', icon: '🤝', text: 'Ekub Groups', category: 'social', priority: 'high' },
  { id: 'food', icon: '🍜', text: 'Food Delivery', category: 'lifestyle', priority: 'high' },
  {
    id: 'housing',
    icon: '🏠',
    text: 'Find Housing (Delala)',
    category: 'lifestyle',
    priority: 'medium',
  },
  {
    id: 'market',
    icon: '🛍️',
    text: 'Browse Marketplace',
    category: 'services',
    priority: 'medium',
  },
  {
    id: 'delivery',
    icon: '🚚',
    text: 'Track My Delivery',
    category: 'services',
    priority: 'medium',
  },
];

const CATEGORIES = [
  { id: 'all', name: 'All', icon: 'grid' },
  { id: 'services', name: 'Services', icon: 'build' },
  { id: 'social', name: 'Social', icon: 'people' },
  { id: 'lifestyle', name: 'Lifestyle', icon: 'home' },
];

// AI Insights and Analytics
const AI_INSIGHTS = [
  {
    id: 'usage',
    title: 'Usage Pattern',
    insight: 'Most users search for parking in the morning',
    recommendation: 'Set up favorite zones for faster parking access',
    icon: 'analytics',
    color: '#6366f1',
  },
  {
    id: 'savings',
    title: 'Potential Savings',
    insight: 'Participating in Ekub circles can help save money',
    recommendation: 'Join a high-yield Ekub for better return rates',
    icon: 'trending-up',
    color: '#10b981',
  },
  {
    id: 'activity',
    title: 'Activity Peak',
    insight: 'App usage typically peaks during evening hours',
    recommendation: 'Enable evening notifications for best experience',
    icon: 'time',
    color: '#f59e0b',
  },
];

export default function AIScreen() {
  const isDark = useSystemStore((s) => s.isDark);
  const C = isDark ? Colors : LightColors;
  const chatHistory = useSystemStore((s) => s.chatHistory) as ChatMessage[];
  const addChatMessage = useSystemStore((s) => s.addChatMessage);
  const clearChat = useSystemStore((s) => s.clearChat);

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showInsights, setShowInsights] = useState(false);
  const [voiceMode, setVoiceMode] = useState(false);
  const scrollRef = useRef(null);

  // Filter suggestions based on category
  const filteredSuggestions = useMemo(() => {
    if (selectedCategory === 'all') return SMART_SUGGESTIONS;
    return SMART_SUGGESTIONS.filter((s) => s.category === selectedCategory);
  }, [selectedCategory]);

  // Smart message handling with context awareness
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

    const apiMessages = [
      ...chatHistory.map((m: ChatMessage) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
      { role: 'user' as const, content: msg },
    ];

    const reply = await sendMessage(apiMessages);
    addChatMessage({
      id: uid(),
      role: 'assistant',
      content: reply,
      timestamp: new Date().toISOString(),
    });
    setLoading(false);
  }

  return (
    <View style={{ flex: 1, backgroundColor: C.ink }}>
      <TopBar
        title="ðŸ¤– CityLink AI"
        right={
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity
              onPress={() => setShowInsights(!showInsights)}
              style={{
                paddingHorizontal: 10,
                paddingVertical: 5,
                borderRadius: Radius.lg,
                backgroundColor: showInsights ? C.primaryL : C.lift,
                borderWidth: 1,
                borderColor: C.edge2,
              }}
            >
              <Text
                style={{
                  color: showInsights ? C.primary : C.sub,
                  fontSize: FontSize.xs,
                  fontWeight: '700',
                }}
              >
                Insights
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={clearChat}
              style={{
                paddingHorizontal: 10,
                paddingVertical: 5,
                borderRadius: Radius.lg,
                backgroundColor: C.redL,
                borderWidth: 1,
                borderColor: C.red + '44',
              }}
            >
              <Text style={{ color: C.red, fontSize: FontSize.xs, fontWeight: '700' }}>Clear</Text>
            </TouchableOpacity>
          </View>
        }
      />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* AI Insights Panel */}
        {showInsights && (
          <View
            style={{
              backgroundColor: C.surface,
              borderBottomWidth: 1,
              borderBottomColor: C.edge,
            }}
          >
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ padding: 16, gap: 12 }}
            >
              {AI_INSIGHTS.map((insight) => (
                <TouchableOpacity
                  key={insight.id}
                  style={{
                    width: 200,
                    backgroundColor: C.lift,
                    borderRadius: Radius.xl,
                    padding: 12,
                    borderWidth: 1,
                    borderColor: C.edge2,
                    ...Shadow.md,
                  }}
                >
                  <View
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}
                  >
                    <View
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 16,
                        backgroundColor: insight.color + '20',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Ionicons name={insight.icon as any} size={16} color={insight.color} />
                    </View>
                    <Text style={{ color: C.text, fontSize: FontSize.sm, fontFamily: Fonts.black }}>
                      {insight.title}
                    </Text>
                  </View>
                  <Text
                    style={{
                      color: C.sub,
                      fontSize: FontSize.xs,
                      fontFamily: Fonts.medium,
                      marginBottom: 4,
                    }}
                  >
                    {insight.insight}
                  </Text>
                  <Text style={{ color: C.primary, fontSize: FontSize.xs, fontFamily: Fonts.bold }}>
                    {insight.recommendation}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Category Filter */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 12, gap: 8 }}
        >
          {CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat.id}
              onPress={() => setSelectedCategory(cat.id)}
              style={{
                paddingHorizontal: 14,
                paddingVertical: 8,
                borderRadius: 20,
                backgroundColor: selectedCategory === cat.id ? C.primary : C.lift,
                borderWidth: 1,
                borderColor: selectedCategory === cat.id ? C.primary : C.edge2,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <Ionicons
                name={cat.icon as any}
                size={14}
                color={selectedCategory === cat.id ? C.white : C.sub}
              />
              <Text
                style={{
                  color: selectedCategory === cat.id ? C.white : C.sub,
                  fontSize: FontSize.sm,
                  fontWeight: '600',
                }}
              >
                {cat.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Messages */}
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 12 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {chatHistory.map((msg: ChatMessage) => (
            <View
              key={msg.id}
              style={{
                flexDirection: 'row',
                justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
              }}
            >
              {msg.role === 'assistant' && (
                <View
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 14,
                    backgroundColor: C.greenL,
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: 8,
                    flexShrink: 0,
                    marginTop: 2,
                  }}
                >
                  <Text style={{ fontSize: 14 }}>ðŸ¤–</Text>
                </View>
              )}
              <View style={{ maxWidth: '78%' }}>
                <View
                  style={{
                    padding: 12,
                    borderRadius: 16,
                    backgroundColor: msg.role === 'user' ? C.green : C.lift,
                    borderBottomRightRadius: msg.role === 'user' ? 4 : 16,
                    borderBottomLeftRadius: msg.role === 'assistant' ? 4 : 16,
                    borderWidth: msg.role === 'assistant' ? 1 : 0,
                    borderColor: C.edge2,
                  }}
                >
                  <Text
                    style={{
                      color: msg.role === 'user' ? '#040A05' : C.text,
                      fontSize: FontSize.lg,
                      lineHeight: 22,
                      fontWeight: msg.role === 'user' ? '500' : '400',
                    }}
                  >
                    {msg.content}
                  </Text>
                </View>
                <Text
                  style={{
                    color: C.sub,
                    fontSize: FontSize.xs,
                    marginTop: 3,
                    paddingHorizontal: 4,
                    textAlign: msg.role === 'user' ? 'right' : 'left',
                  }}
                >
                  {fmtTime(msg.timestamp)}
                </Text>
              </View>
            </View>
          ))}

          {loading && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingLeft: 36 }}>
              <ActivityIndicator size="small" color={C.green} />
              <Text style={{ color: C.sub, fontSize: FontSize.md }}>Thinkingâ€¦</Text>
            </View>
          )}
        </ScrollView>

        {/* Smart Suggestions */}
        {chatHistory.length <= 1 && (
          <View style={{ paddingHorizontal: 16, paddingBottom: 8 }}>
            <Text
              style={{
                color: C.sub,
                fontSize: FontSize.sm,
                fontFamily: Fonts.medium,
                marginBottom: 8,
              }}
            >
              Quick Actions
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {filteredSuggestions.map((suggestion) => (
                <TouchableOpacity
                  key={suggestion.id}
                  onPress={() => handleSend(suggestion.text)}
                  style={{
                    paddingHorizontal: 14,
                    paddingVertical: 8,
                    borderRadius: 20,
                    backgroundColor: C.lift,
                    borderWidth: 1,
                    borderColor: C.edge2,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <Text style={{ fontSize: 16 }}>{suggestion.icon}</Text>
                  <Text style={{ color: C.sub, fontSize: FontSize.sm, fontWeight: '600' }}>
                    {suggestion.text}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Enhanced Input Bar */}
        <View
          style={{
            flexDirection: 'row',
            gap: 8,
            padding: 12,
            backgroundColor: isDark ? 'rgba(11,13,17,0.97)' : 'rgba(255,255,255,0.97)',
            borderTopWidth: 1,
            borderTopColor: C.edge,
            alignItems: 'flex-end',
          }}
        >
          <TouchableOpacity
            onPress={() => setVoiceMode(!voiceMode)}
            style={{
              width: 42,
              height: 42,
              borderRadius: 21,
              backgroundColor: voiceMode ? C.primary : C.lift,
              alignItems: 'center',
              justifyContent: 'center',
              alignSelf: 'flex-end',
              borderWidth: 1,
              borderColor: voiceMode ? C.primary : C.edge2,
            }}
          >
            <Ionicons name="mic" size={20} color={voiceMode ? C.white : C.sub} />
          </TouchableOpacity>

          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder="Ask anything about Addisâ€¦"
            placeholderTextColor={C.sub}
            multiline
            onSubmitEditing={() => handleSend()}
            blurOnSubmit={false}
            style={{
              flex: 1,
              backgroundColor: C.lift,
              borderWidth: 1,
              borderColor: C.edge2,
              borderRadius: 20,
              paddingHorizontal: 14,
              paddingVertical: 10,
              color: C.text,
              fontSize: FontSize.lg,
              maxHeight: 100,
            }}
          />

          <TouchableOpacity
            onPress={() => handleSend()}
            disabled={!input.trim() || loading}
            style={{
              width: 42,
              height: 42,
              borderRadius: 21,
              backgroundColor: !input.trim() || loading ? C.edge2 : C.green,
              alignItems: 'center',
              justifyContent: 'center',
              alignSelf: 'flex-end',
            }}
          >
            <Text style={{ fontSize: 18, color: !input.trim() || loading ? C.sub : '#040A05' }}>
              â†‘
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}
