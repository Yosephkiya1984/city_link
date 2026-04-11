import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface Toast {
  id: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
}

interface Notification {
  id: string;
  title: string;
  body: string;
  read: boolean;
  created_at: string;
}

interface SystemState {
  isDark: boolean;
  lang: string;
  toasts: Toast[];
  notifications: Notification[];
  unreadCount: number;
  
  // Actions
  toggleTheme: () => void;
  setLang: (lang: string) => void;
  showToast: (message: string, type?: Toast['type']) => void;
  addNotification: (notif: Notification) => void;
  markNotifRead: (id: string) => void;
}

const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);

export const useSystemStore = create<SystemState>()(
  persist(
    (set) => ({
      isDark: true,
      lang: 'en',
      toasts: [],
      notifications: [],
      unreadCount: 0,

      toggleTheme: () => set((s) => ({ isDark: !s.isDark })),
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

      markNotifRead: (id) => set((s) => {
        const notifs = s.notifications.map((n) => n.id === id ? { ...n, read: true } : n);
        return { 
          notifications: notifs,
          unreadCount: Math.max(0, s.unreadCount - 1)
        };
      }),
    }),
    {
      name: 'cl-system-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        isDark: state.isDark,
        lang: state.lang,
        notifications: state.notifications,
        unreadCount: state.unreadCount
      }),
    }
  )
);
