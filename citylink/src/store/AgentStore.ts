import { create } from 'zustand';

interface AgentState {
  isConciergeOpen: boolean;
  messages: any[];
  isThinking: boolean;
  activeActionCard: {
    type: string;
    data: any;
    visible: boolean;
  } | null;
  
  // Actions
  toggleConcierge: (isOpen?: boolean) => void;
  addMessage: (msg: any) => void;
  setThinking: (val: boolean) => void;
  showActionCard: (type: string, data: any) => void;
  hideActionCard: () => void;
  clearChat: () => void;
}

export const useAgentStore = create<AgentState>((set) => ({
  isConciergeOpen: false,
  messages: [],
  isThinking: false,
  activeActionCard: null,

  toggleConcierge: (isOpen) => 
    set((state) => ({ isConciergeOpen: isOpen !== undefined ? isOpen : !state.isConciergeOpen })),

  addMessage: (msg) => 
    set((state) => ({ messages: [...state.messages, msg] })),

  setThinking: (val) => 
    set({ isThinking: val }),

  showActionCard: (type, data) => 
    set({ 
      activeActionCard: { type, data, visible: true },
      isConciergeOpen: true // Ensure concierge is open if a card is shown
    }),

  hideActionCard: () => 
    set({ activeActionCard: null }),

  clearChat: () => 
    set({ messages: [] }),
}));
