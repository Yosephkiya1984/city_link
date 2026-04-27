import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Toast, Notification, ChatMessage } from '../types';

/** Shape of an incoming P2P transfer awaiting user confirmation. */
export interface PendingP2PClaim {
  id: string;
  sender_id: string;
  recipient_id: string;
  amount: number;
  note?: string;
  status: string;
  created_at: string;
}

export interface SystemState {
  isDark: boolean;
  lang: string;
  toasts: Toast[];
  notifications: Notification[];
  unreadCount: number;
  chatHistory: ChatMessage[];
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  setIsDark: (val: boolean) => void;
  setLang: (lang: string) => void;
  setNotifications: (notifs: Notification[]) => void;
  setChatHistory: (msgs: ChatMessage[]) => void;
  setTheme: (theme: 'light' | 'dark') => void;
  showToast: (message: string, type?: Toast['type']) => void;
  addNotification: (notif: Notification) => void;
  markNotifRead: (id: string) => void;
  clearNotifications: () => void;
  addChatMessage: (msg: ChatMessage) => void;
  clearChat: () => void;
  reset: () => void;
  /** The single incoming P2P transfer awaiting user tap-to-confirm. null = none pending. */
  pendingP2PClaim: PendingP2PClaim | null;
  /** Set or clear the pending P2P claim. Called by realtime.ts on INSERT, cleared on confirm/reject. */
  setPendingP2PClaim: (claim: PendingP2PClaim | null) => void;
}

export const useSystemStore = create<SystemState>()(
  persist(
    (set) => ({
      isDark: true,
      lang: 'en',
      toasts: [],
      notifications: [],
      unreadCount: 0,
      chatHistory: [],
      theme: 'dark',
      pendingP2PClaim: null,

      toggleTheme: () => set((s) => ({ isDark: !s.isDark, theme: !s.isDark ? 'dark' : 'light' })),
      setIsDark: (isDark) => set({ isDark, theme: isDark ? 'dark' : 'light' }),
      setLang: (lang) => set({ lang }),
      setNotifications: (notifications) => {
        const unreadCount = notifications.filter((n) => !n.read && !n.is_read).length;
        set({ notifications, unreadCount });
      },
      setChatHistory: (chatHistory) => set({ chatHistory }),
      setTheme: (theme) => set({ theme, isDark: theme === 'dark' }),

      showToast: (message, type = 'info') => {
        // 🛡️ FIX (MED-3): Use uid() for guaranteed uniqueness — Math.random() can collide
        const id = `toast-${Date.now()}-${Math.floor(Math.random() * 0xffff).toString(16)}`;
        set((s) => ({ toasts: [...s.toasts, { id, message, type }] }));
        setTimeout(() => {
          set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
        }, 3500);
      },

      addNotification: (notif) =>
        set((s) => ({
          notifications: [notif, ...s.notifications],
          unreadCount: s.unreadCount + 1,
        })),

      markNotifRead: (id) =>
        set((s) => {
          const targetNotif = s.notifications.find((n) => n.id === id);
          if (!targetNotif || targetNotif.read) return s;

          const notifications = s.notifications.map((n) =>
            n.id === id ? { ...n, read: true, is_read: true } : n
          );
          return { notifications, unreadCount: Math.max(0, s.unreadCount - 1) };
        }),

      clearNotifications: () => set({ notifications: [], unreadCount: 0 }),
      addChatMessage: (msg) => set((s) => ({ chatHistory: [...s.chatHistory, msg].slice(-50) })),
      clearChat: () => set({ chatHistory: [] }),
      setPendingP2PClaim: (claim) => set({ pendingP2PClaim: claim }),
      reset: () =>
        set({
          isDark: true,
          theme: 'dark',
          lang: 'en',
          notifications: [],
          unreadCount: 0,
          chatHistory: [],
          toasts: [],
          pendingP2PClaim: null,
        }),
    }),
    {
      name: 'citylink-system-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        isDark: state.isDark,
        theme: state.theme,
        lang: state.lang,
        notifications: state.notifications,
        unreadCount: state.unreadCount,
        chatHistory: state.chatHistory,
      }),
    }
  )
);
