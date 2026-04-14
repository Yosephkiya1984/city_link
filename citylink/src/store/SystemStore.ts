import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Notification, Toast, ChatMessage } from '../types';

interface SystemState {
  isDark: boolean;
  lang: string;
  toasts: Toast[];
  notifications: Notification[];
  unreadCount: number;
  chatHistory: ChatMessage[];
  
  // Actions
  toggleTheme: () => void;
  setIsDark: (isDark: boolean) => void;
  setLang: (lang: string) => void;
  showToast: (message: string, type?: Toast['type']) => void;
  addNotification: (notif: Notification) => void;
  setNotifications: (notifs: Notification[]) => void;
  markNotifRead: (id: string) => void;
  addChatMessage: (msg: ChatMessage) => void;
  clearChat: () => void;
  clearNotifications: () => void;
}

const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);

export const useSystemStore = create<SystemState>()(
  persist(
    (set) => ({
      isDark: true,
      lang: 'en',
      toasts: [] as Toast[],
      notifications: [] as Notification[],
      unreadCount: 0,
      chatHistory: [] as ChatMessage[],

      toggleTheme: () => set((s) => ({ isDark: !s.isDark })),
      setIsDark: (isDark) => set({ isDark }),
      setLang: (lang) => set({ lang }),

      showToast: (message, type = 'info') => {
        const id = uid();
        set((s) => ({ toasts: [...s.toasts, { id, message, type }] }));
        setTimeout(() => {
          set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
        }, 3500);
      },

      addNotification: (notif) => set((s) => ({ 
        notifications: [notif, ...s.notifications],
        unreadCount: s.unreadCount + 1
      })),
      
      setNotifications: (notifs) => set((s) => ({
        notifications: notifs,
        unreadCount: notifs.filter((n) => !n.read && !n.is_read).length
      })),

      markNotifRead: (id) => set((s) => {
        const notifs = s.notifications.map((n) => n.id === id ? { ...n, read: true, is_read: true } : n);
        return { 
          notifications: notifs,
          unreadCount: Math.max(0, s.unreadCount - 1)
        };
      }),
      addChatMessage: (msg) => set((s) => ({ chatHistory: [...s.chatHistory, msg] })),
      clearChat: () => set({ chatHistory: [] }),
      clearNotifications: () => set({ notifications: [], unreadCount: 0 }),
    }),
    {
      name: 'cl-system-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        isDark: state.isDark,
        lang: state.lang,
        notifications: state.notifications,
        unreadCount: state.unreadCount,
        chatHistory: state.chatHistory
      }),
    }
  )
);
