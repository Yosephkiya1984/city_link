import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
  StatusBar,
  TextInput,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppStore } from '../../store/AppStore';
import { subscribeToTable, unsubscribe } from '../../services/supabase';
import { fetchChatThreads } from '../../services/chat.service';
import * as Haptics from 'expo-haptics';

const T = {
  bg: '#101319',
  surface: '#1d2025',
  surfaceHigh: '#272a30',
  primary: '#59de9b',
  text: '#e1e2ea',
  textSub: '#869489',
  border: 'rgba(134,148,137,0.15)',
  accent: '#ffd887',
};

function fmtRelativeTime(date: any) {
  if (!date) return '';
  const now = new Date();
  const diff = now.getTime() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(date).toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export default function ChatInboxScreen({ navigation }: { navigation: any }) {
  const currentUser = useAppStore((s) => s.currentUser);
  const showToast = useAppStore((s) => s.showToast);

  const [threads, setThreads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');

  const loadThreads = useCallback(async () => {
    if (!currentUser?.id) return;
    setLoading(true);
    const { data, error } = await fetchChatThreads(currentUser.id);
    if (data) setThreads(data);
    if (error) showToast('Failed to load chats', 'error');
    setLoading(false);
  }, [currentUser?.id, showToast]);

  useEffect(() => {
    loadThreads();

    const ch = subscribeToTable(
      `inbox-msgs-${currentUser?.id}`,
      'chat_messages',
      null,
      () => {
        loadThreads();
      }
    );

    return () => unsubscribe(ch);
  }, [currentUser?.id, loadThreads]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadThreads();
    setRefreshing(false);
  };

  const filteredThreads = useMemo(() => {
    return threads.filter((t: any) => {
      const isUserA = t.user_a_id === currentUser?.id;
      const other = isUserA ? t.user_b : t.user_a;
      const name = (other?.business_name || other?.full_name || '').toLowerCase();
      const lastMsg = (t.last_msg || '').toLowerCase();
      const matchesSearch =
        name.includes(search.toLowerCase()) || lastMsg.includes(search.toLowerCase());

      if (activeFilter === 'unread') {
        // Simple mock for "new" as we don't have read status yet
        return matchesSearch && new Date(t.last_ts).getTime() > Date.now() - 3600000;
      }
      return matchesSearch;
    });
  }, [threads, search, currentUser?.id, activeFilter]);

  const renderItem = ({ item }: { item: any }) => {
    const isUserA = item.user_a_id === currentUser?.id;
    const other = isUserA ? item.user_b : item.user_a;
    const displayName = other?.business_name || other?.full_name || 'Unknown User';
    const isNew = new Date(item.last_ts).getTime() > Date.now() - 3600000; // Mock unread

    return (
      <TouchableOpacity
        style={styles.threadItem}
        activeOpacity={0.7}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          navigation.navigate('Chat', {
            threadId: item.thread_id,
            recipientName: displayName,
            recipientId: other?.id,
          });
        }}
      >
        <View style={styles.avatarContainer}>
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarInitial}>{(displayName || '?')[0].toUpperCase()}</Text>
          </View>
          <View style={styles.onlineDot} />
        </View>

        <View style={styles.threadInfo}>
          <View style={styles.threadHeader}>
            <Text style={[styles.threadName, { color: isNew ? T.text : T.textSub }]}>
              {displayName}
            </Text>
            <Text style={styles.threadTime}>
              {fmtRelativeTime(item.last_ts || item.created_at)}
            </Text>
          </View>
          <View style={styles.msgPreviewContainer}>
            <Text style={[styles.lastMessage, isNew && styles.lastMessageUnread]} numberOfLines={1}>
              {item.last_msg || 'Started a conversation'}
            </Text>
            {isNew && <View style={styles.unreadBadge} />}
          </View>
        </View>
        <Ionicons name="chevron-forward" size={16} color={T.border} />
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Header Section */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
            <Ionicons name="arrow-back" size={24} color={T.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Messages</Text>
          <TouchableOpacity style={styles.iconBtn}>
            <Ionicons name="ellipsis-horizontal" size={20} color={T.text} />
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={18} color={T.textSub} />
          <TextInput
            placeholder="Search conversations..."
            placeholderTextColor={T.textSub}
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={18} color={T.textSub} />
            </TouchableOpacity>
          )}
        </View>

        {/* Filters */}
        <View style={styles.filterRow}>
          {['all', 'unread'].map((f) => (
            <TouchableOpacity
              key={f}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setActiveFilter(f);
              }}
              style={[styles.filterBtn, activeFilter === f && styles.filterBtnActive]}
            >
              <Text style={[styles.filterLabel, activeFilter === f && styles.filterLabelActive]}>
                {f.toUpperCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {loading && !refreshing ? (
        <View style={styles.loader}>
          <ActivityIndicator color={T.primary} />
        </View>
      ) : (
        <FlatList
          data={filteredThreads}
          renderItem={renderItem}
          keyExtractor={(item) => item.thread_id}
          contentContainerStyle={styles.listContent}
          keyboardDismissMode="on-drag"
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={T.primary} />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <View style={styles.emptyIconCircle}>
                <Ionicons name="chatbubbles-outline" size={48} color={T.primary} />
              </View>
              <Text style={styles.emptyTitle}>No messages yet</Text>
              <Text style={styles.emptySubtitle}>
                {search
                  ? 'No conversations match your search.'
                  : "When you start chatting with users, they'll appear here."}
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.bg },
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: T.surface,
    borderBottomWidth: 1,
    borderBottomColor: T.border,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  headerTitle: { color: T.text, fontSize: 24, fontWeight: '800', letterSpacing: -0.5 },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: T.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },

  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: T.bg,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
    borderWidth: 1,
    borderColor: T.border,
    marginBottom: 16,
  },
  searchInput: { flex: 1, color: T.text, fontSize: 15, marginLeft: 10 },

  filterRow: { flexDirection: 'row', gap: 10 },
  filterBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: T.bg,
    borderWidth: 1,
    borderColor: T.border,
  },
  filterBtnActive: { backgroundColor: T.primary + '20', borderColor: T.primary },
  filterLabel: { fontSize: 10, fontWeight: '800', color: T.textSub, letterSpacing: 1 },
  filterLabelActive: { color: T.primary },

  loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContent: { paddingBottom: 40 },

  threadItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: T.border,
    backgroundColor: T.bg,
  },
  avatarContainer: { position: 'relative' },
  avatarPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: T.surfaceHigh,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: T.border,
  },
  avatarInitial: { color: T.primary, fontSize: 24, fontWeight: '800' },
  onlineDot: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: T.primary,
    borderWidth: 3,
    borderColor: T.bg,
  },

  threadInfo: { flex: 1, marginLeft: 16, marginRight: 8 },
  threadHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  threadName: { fontSize: 16, fontWeight: '700' },
  threadTime: { color: T.textSub, fontSize: 12, fontWeight: '500' },
  msgPreviewContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  lastMessage: { color: T.textSub, fontSize: 14, lineHeight: 20, flex: 1 },
  lastMessageUnread: { color: T.text, fontWeight: '600' },
  unreadBadge: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: T.primary,
    marginLeft: 8,
  },

  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 80,
    paddingHorizontal: 40,
  },
  emptyIconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: T.primary + '10',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyTitle: { color: T.text, fontSize: 20, fontWeight: '800', marginTop: 10 },
  emptySubtitle: {
    color: T.textSub,
    fontSize: 15,
    textAlign: 'center',
    marginTop: 10,
    lineHeight: 22,
  },
});
