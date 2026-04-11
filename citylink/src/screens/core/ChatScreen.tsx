import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Image,
  StatusBar,
  LayoutAnimation,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useAppStore } from '../../store/AppStore';
import { supabase, subscribeToTable, unsubscribe } from '../../services/supabase';
import {
  fetchChatMessages,
  createChatMessage,
  updateChatThreadLastMessage,
} from '../../services/chat.service';
import { uid } from '../../utils';

const T = {
  bg: '#101319',
  surface: '#1d2025',
  surfaceHigh: '#272a30',
  primary: '#59de9b',
  primaryDark: '#00a86b',
  text: '#e1e2ea',
  textSub: '#869489',
  border: 'rgba(134,148,137,0.15)',
  accent: '#ffd887',
};

export default function ChatScreen({ route, navigation }: { route: any; navigation: any }) {
  const { threadId, recipientName, recipientId } = route.params;
  const currentUser = useAppStore((s) => s.currentUser);
  const showToast = useAppStore((s) => s.showToast);

  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const flatListRef = useRef<any>(null);

  const loadMessages = useCallback(async () => {
    setLoading(true);
    const { data, error } = await fetchChatMessages(threadId);
    if (data) setMessages(data);
    if (error) showToast('Failed to load messages', 'error');
    setLoading(false);
  }, [threadId, showToast]);

  useEffect(() => {
    loadMessages();

    const ch = subscribeToTable(
      `chat-${threadId}`,
      'chat_messages',
      `thread_id=eq.${threadId}`,
      (payload: any) => {
        if (payload.eventType === 'INSERT') {
          LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
          setMessages((prev) => {
            if (prev.find((m) => m.id === payload.new.id)) return prev;
            return [...prev, payload.new];
          });
        }
      }
    );

    return () => unsubscribe(ch);
  }, [threadId, loadMessages]);

  const handleSendMessage = async () => {
    if (!inputText.trim() || sending || !currentUser) return;

    const msgText = inputText.trim();
    setInputText('');
    setSending(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const msgId = uid();
    const optimisticMsg: any = {
      id: msgId,
      thread_id: threadId,
      user_id: currentUser.id,
      content: msgText,
      created_at: new Date().toISOString(),
    };

    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    // Remove duplicate protection in state insertion if the same ID gets pushed by realtime first
    setMessages((prev) => {
      if (prev.find((m) => m.id === msgId)) return prev;
      return [...prev, optimisticMsg];
    });

    const { data, error } = await createChatMessage({
      id: msgId,
      thread_id: threadId,
      user_id: currentUser.id,
      content: msgText,
    });

    if (error) {
      setMessages((prev) => prev.filter((m) => m.id !== optimisticMsg.id));
      setInputText(msgText);
      showToast('Failed to send message', 'error');
    } else {
      setMessages((prev) => prev.map((m) => (m.id === optimisticMsg.id ? data : m)));
      await updateChatThreadLastMessage(threadId, msgText);
    }
    setSending(false);
  };

  const renderItem = ({ item, index }: { item: any; index: number }) => {
    const isMine = item.user_id === currentUser?.id;
    const prevMsg = index > 0 ? messages[index - 1] : null;
    const sameUser = prevMsg?.user_id === item.user_id;

    return (
      <View
        style={[
          styles.bubbleWrapper,
          isMine ? { alignItems: 'flex-end' } : { alignItems: 'flex-start' },
          sameUser ? { marginTop: 2 } : { marginTop: 12 },
        ]}
      >
        {isMine ? (
          <LinearGradient
            colors={[T.primary, T.primaryDark]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.bubble, styles.myBubble]}
          >
            <Text style={styles.myText}>{item.content}</Text>
            <Text style={styles.myTimeText}>
              {new Date(item.created_at).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Text>
          </LinearGradient>
        ) : (
          <View style={[styles.bubble, styles.theirBubble]}>
            <Text style={styles.theirText}>{item.content}</Text>
            <Text style={styles.theirTimeText}>
              {new Date(item.created_at).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      <StatusBar barStyle="light-content" />

      {/* Premium Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={28} color={T.text} />
        </TouchableOpacity>

        <View style={styles.headerInfo}>
          <View style={styles.headerAvatar}>
            <Text style={styles.headerAvatarText}>{(recipientName || '?')[0].toUpperCase()}</Text>
          </View>
          <View>
            <Text style={styles.recipientName} numberOfLines={1}>
              {recipientName || 'Chat'}
            </Text>
            <View style={styles.statusRow}>
              <View style={styles.statusDot} />
              <Text style={styles.statusText}>Active now</Text>
            </View>
          </View>
        </View>

        <TouchableOpacity
          style={styles.headerAction}
          onPress={() => showToast('Feature coming soon', 'info')}
        >
          <Ionicons name="call" size={20} color={T.primary} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loader}>
          <ActivityIndicator color={T.primary} />
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          onContentSizeChange={() => (flatListRef.current as any)?.scrollToEnd({ animated: true })}
          onLayout={() => (flatListRef.current as any)?.scrollToEnd({ animated: true })}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Input Area */}
      <View style={styles.inputArea}>
        <TouchableOpacity
          style={styles.attachBtn}
          onPress={() => showToast('Attachments coming soon', 'info')}
        >
          <Ionicons name="add-circle-outline" size={28} color={T.textSub} />
        </TouchableOpacity>

        <View style={styles.inputWrapper}>
          <TextInput
            style={styles.input}
            placeholder="Write a message..."
            placeholderTextColor={T.textSub}
            value={inputText}
            onChangeText={setInputText}
            multiline
          />
        </View>

        <TouchableOpacity
          style={[
            styles.sendBtn,
            !inputText.trim() && { opacity: 0.5, backgroundColor: T.surfaceHigh },
          ]}
          onPress={handleSendMessage}
          disabled={!inputText.trim() || sending}
        >
          {sending ? (
            <ActivityIndicator color={T.bg} size="small" />
          ) : (
            <Ionicons name="arrow-up" size={24} color={T.bg} />
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 60 : 30,
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: T.surface,
    borderBottomWidth: 1,
    borderBottomColor: T.border,
  },
  backBtn: { padding: 4, marginRight: 8 },
  headerInfo: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: T.bg,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: T.border,
  },
  headerAvatarText: { color: T.primary, fontSize: 18, fontWeight: '800' },
  recipientName: { color: T.text, fontSize: 17, fontWeight: '800', letterSpacing: -0.3 },
  statusRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  statusDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: T.primary, marginRight: 6 },
  statusText: { color: T.textSub, fontSize: 12, fontWeight: '600' },
  headerAction: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: T.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },

  loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContent: { padding: 16, paddingBottom: 24 },

  bubbleWrapper: { width: '100%' },
  bubble: {
    maxWidth: '85%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  myBubble: {
    borderBottomRightRadius: 4,
  },
  theirBubble: {
    backgroundColor: T.surfaceHigh,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: T.border,
  },
  myText: { color: T.bg, fontSize: 15, fontWeight: '500', lineHeight: 21 },
  theirText: { color: T.text, fontSize: 15, fontWeight: '500', lineHeight: 21 },
  myTimeText: {
    fontSize: 9,
    marginTop: 4,
    color: T.bg,
    opacity: 0.7,
    alignSelf: 'flex-end',
    fontWeight: '600',
  },
  theirTimeText: {
    fontSize: 9,
    marginTop: 4,
    color: T.textSub,
    alignSelf: 'flex-end',
    fontWeight: '600',
  },

  inputArea: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    paddingBottom: Platform.OS === 'ios' ? 34 : 12,
    backgroundColor: T.surface,
    borderTopWidth: 1,
    borderTopColor: T.border,
  },
  attachBtn: { padding: 4, marginRight: 8 },
  inputWrapper: {
    flex: 1,
    backgroundColor: T.bg,
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: T.border,
    marginRight: 10,
  },
  input: {
    color: T.text,
    fontSize: 15,
    maxHeight: 100,
    paddingTop: Platform.OS === 'ios' ? 8 : 4,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: T.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: T.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
});
