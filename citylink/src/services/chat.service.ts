import { hasSupabase, supaQuery } from './supabase';
import { uid } from '../utils';

/**
 * fetchChatThreads — fetches all chat threads for a specific user.
 */
export const fetchChatThreads = async (userId) => {
  if (!hasSupabase()) return { data: [], error: null };
  return supaQuery((client) =>
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
        user_a:profiles!message_threads_user_a_id_fkey(id, full_name, business_name, merchant_name),
        user_b:profiles!message_threads_user_b_id_fkey(id, full_name, business_name, merchant_name)
      `
      )
      .or(`user_a_id.eq.${userId},user_b_id.eq.${userId}`)
      .order('last_ts', { ascending: false })
  );
};

/**
 * fetchChatMessages — fetches messages within a thread.
 */
export const fetchChatMessages = async (threadId) => {
  if (!hasSupabase()) return { data: [], error: null };
  return supaQuery((client) =>
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
export const createChatThread = async (thread) => {
  if (!hasSupabase())
    return { data: { thread_id: thread.thread_id || 'mock-thread' }, error: null };

  const threadData = {
    thread_id: thread.thread_id,
    user_a_id: thread.user_a_id,
    user_b_id: thread.user_b_id,
    last_msg: thread.last_msg || 'Started a conversation',
    last_ts: new Date().toISOString(),
  };

  return supaQuery((client) => client.from('message_threads').insert(threadData).select().single());
};

/**
 * createChatMessage — sends a message in a thread.
 */
export const createChatMessage = async (message) => {
  if (!hasSupabase()) return { data: message, error: null };
  const cleanMsg = {
    id: message.id || uid(),
    thread_id: message.thread_id,
    user_id: message.user_id,
    content: message.content,
    role: message.role || 'user',
    created_at: new Date().toISOString(),
  };
  return supaQuery((client) => client.from('chat_messages').insert(cleanMsg).select().single());
};

/**
 * updateChatThreadLastMessage — updates the preview text of a thread.
 */
export const updateChatThreadLastMessage = async (threadId, message) => {
  if (!hasSupabase()) return { ok: true };
  return supaQuery((client) =>
    client
      .from('message_threads')
      .update({ last_msg: message, last_ts: new Date().toISOString() })
      .eq('thread_id', threadId)
  );
};
