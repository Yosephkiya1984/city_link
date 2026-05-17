import { hasSupabase, supaQuery } from './supabase';
import { uid } from '../utils';
import { User, ChatMessage, ChatThread, P2PChatMessage } from '../types';

/**
 * fetchChatThreads — fetches all chat threads for a specific user.
 */
export const fetchChatThreads = async (userId: string) => {
  if (!hasSupabase()) return { data: [] as ChatThread[], error: null };
  return supaQuery<ChatThread[]>((client) =>
    client
      .from('message_threads')
      .select(
        `
        thread_id,
        user_a_id,
        user_b_id,
        last_msg,
        last_ts,
        created_at,
        unread_a,
        unread_b,
        user_a:profiles!message_threads_user_a_id_fkey(id, full_name),
        user_b:profiles!message_threads_user_b_id_fkey(id, full_name)
      `
      )
      .or(`user_a_id.eq.${userId},user_b_id.eq.${userId}`)
      .order('last_ts', { ascending: false })
  );
};

/**
 * fetchChatMessages — fetches messages within a thread.
 */
export const fetchChatMessages = async (threadId: string) => {
  if (!hasSupabase()) return { data: [] as P2PChatMessage[], error: null };
  return supaQuery<P2PChatMessage[]>((client) =>
    client
      .from('chat_messages')
      .select('*')
      .eq('thread_id', threadId)
      .order('created_at', { ascending: true })
  );
};

/**
 * createChatThread — initializes a new conversation thread.
 */
export const createChatThread = async (
  thread: Partial<ChatThread> & { user_a_id: string; user_b_id: string }
) => {
  if (!hasSupabase())
    return { data: { thread_id: thread.thread_id || 'mock-thread' } as ChatThread, error: null };

  const threadData = {
    thread_id: thread.thread_id || uid(),
    user_a_id: thread.user_a_id,
    user_b_id: thread.user_b_id,
    last_msg: thread.last_msg || 'Started a conversation',
    last_ts: new Date().toISOString(),
  };

  return supaQuery<ChatThread>((client) =>
    client.from('message_threads').insert(threadData).select().maybeSingle()
  );
};

/**
 * createChatMessage — sends a message in a thread.
 */
export const createChatMessage = async (
  message: Partial<P2PChatMessage> & { thread_id: string; user_id: string; content: string }
) => {
  if (!hasSupabase()) return { data: message as P2PChatMessage, error: null };
  const cleanMsg = {
    id: message.id || uid(),
    thread_id: message.thread_id,
    user_id: message.user_id,
    content: message.content,
    role: message.role || 'user',
    created_at: new Date().toISOString(),
  };
  return supaQuery<P2PChatMessage>((client) =>
    client.from('chat_messages').insert(cleanMsg).select().maybeSingle()
  );
};

/**
 * updateChatThreadLastMessage — updates the preview text of a thread.
 */
export const updateChatThreadLastMessage = async (threadId: string, message: string) => {
  if (!hasSupabase()) return { ok: true };
  return supaQuery<void>((client) =>
    client
      .from('message_threads')
      .update({ last_msg: message, last_ts: new Date().toISOString() })
      .eq('thread_id', threadId)
  );
};
