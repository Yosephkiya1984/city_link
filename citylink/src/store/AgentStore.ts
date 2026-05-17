import { create } from 'zustand';

interface AgentSnapshot {
  balance: number;
  frozen_balance: number;
  currency: string;
  activeEscrows: number;
  dueEkubAmount: number;
  active_parking: { lot_name?: string; spot?: string; started_at?: string } | null;
  active_orders_count: number;
  pending_vouches: number;
}

interface AgentState {
  isConciergeOpen: boolean;
  messages: Record<string, any[]>;
  isThinking: boolean;
  thinkingStatus: string | null;
  activeActionCard: {
    type: string;
    data: any;
    visible: boolean;
  } | null;
  snapshot: AgentSnapshot | null;

  // Actions
  toggleConcierge: (isOpen?: boolean) => void;
  addMessage: (msg: any, mode?: string) => void;
  setThinking: (isThinking: boolean, status?: string | null) => void;
  showActionCard: (type: string, data: any) => void;
  hideActionCard: () => void;
  clearChat: (mode?: string) => void;
  updateSnapshot: () => Promise<void>;
  reset: () => void;
}

export const useAgentStore = create<AgentState>((set) => ({
  isConciergeOpen: false,
  messages: {
    citizen: [],
    merchant: [],
    agent: [],
    admin: []
  },
  isThinking: false,
  activeActionCard: null,
  snapshot: null,

  toggleConcierge: (isOpen) => 
    set((state) => ({ isConciergeOpen: isOpen !== undefined ? isOpen : !state.isConciergeOpen })),

  addMessage: (msg, mode = 'citizen') => 
    set((state) => {
      const histories = state.messages || { citizen: [], merchant: [], agent: [], admin: [] };
      const modeHistory = histories[mode] || [];
      return { 
        messages: {
          ...histories,
          [mode]: [...modeHistory, msg].slice(-50)
        }
      };
    }),

  setThinking: (isThinking, status = null) => 
    set({ isThinking, thinkingStatus: status }),

  showActionCard: (type, data) => 
    set({ 
      activeActionCard: { type, data, visible: true },
      isConciergeOpen: true // Ensure concierge is open if a card is shown
    }),

  hideActionCard: () => 
    set({ activeActionCard: null }),

  clearChat: (mode) => 
    set((state) => {
      if (!mode) return { messages: { citizen: [], merchant: [], agent: [], admin: [] } };
      
      const histories = state.messages || { citizen: [], merchant: [], agent: [], admin: [] };
      return {
        messages: {
          ...histories,
          [mode]: []
        }
      };
    }),

  updateSnapshot: async () => {
    const { useWalletStore } = await import('./WalletStore');
    const { useAuthStore } = await import('./AuthStore');
    const wallet = useWalletStore.getState();
    const currentUser = useAuthStore.getState().currentUser;

    // Defaults in case DB queries fail
    let activeEscrows = 0;
    let dueEkubAmount = 0;
    let active_parking: AgentSnapshot['active_parking'] = null;
    let active_orders_count = 0;
    let pending_vouches = 0;

    if (currentUser?.id) {
      try {
        const { getClient } = await import('../services/supabase');
        const supabase = getClient();
        if (supabase) {
          // Fetch active escrows count
          const { count: escrowCount } = await supabase
            .from('escrows')
            .select('id', { count: 'exact', head: true })
            .eq('buyer_id', currentUser.id)
            .eq('status', 'LOCKED');
          activeEscrows = escrowCount || 0;

          // Fetch pending ekub contributions (round amount × unpaid circles)
          const { data: ekubMemberships } = await supabase
            .from('ekub_members')
            .select('ekubs(contribution_amount, current_round)')
            .eq('user_id', currentUser.id)
            .eq('status', 'ACTIVE');
          if (ekubMemberships) {
            dueEkubAmount = (ekubMemberships as any[]).reduce((sum: number, m: any) => {
              return sum + (m.ekubs?.contribution_amount || 0);
            }, 0);
          }

          // Fetch active parking session
          const { data: parkingSession } = await supabase
            .from('parking_sessions')
            .select('id, created_at, parking_lots(name), parking_spots(spot_number)')
            .eq('user_id', currentUser.id)
            .eq('status', 'active')
            .maybeSingle();
          if (parkingSession) {
            active_parking = {
              lot_name: (parkingSession as any).parking_lots?.name,
              spot: (parkingSession as any).parking_spots?.spot_number,
              started_at: parkingSession.created_at,
            };
          }

          // Fetch active marketplace + food orders count
          const [{ count: mktCount }, { count: foodCount }] = await Promise.all([
            supabase
              .from('marketplace_orders')
              .select('id', { count: 'exact', head: true })
              .eq('buyer_id', currentUser.id)
              .in('status', ['PAID', 'PROCESSING', 'SHIPPED']),
            supabase
              .from('food_orders')
              .select('id', { count: 'exact', head: true })
              .eq('citizen_id', currentUser.id)
              .in('status', ['PENDING', 'ACCEPTED', 'PREPARING', 'READY']),
          ]);
          active_orders_count = (mktCount || 0) + (foodCount || 0);

          // Fetch pending vouches for ekub draws
          const { count: vouchCount } = await supabase
            .from('ekub_draws')
            .select('id', { count: 'exact', head: true })
            .eq('status', 'NEEDS_VOUCHING');
          pending_vouches = vouchCount || 0;
        }
      } catch (e) {
        console.warn('[AgentStore] Snapshot fetch partial failure:', e);
      }
    }

    set({
      snapshot: {
        balance: wallet.balance,
        frozen_balance: wallet.frozenBalance,
        currency: 'ETB',
        activeEscrows,
        dueEkubAmount,
        active_parking,
        active_orders_count,
        pending_vouches,
      },
    });
  },

  reset: () => set({
    isConciergeOpen: false,
    messages: { citizen: [], merchant: [], agent: [], admin: [] },
    isThinking: false,
    activeActionCard: null,
    snapshot: null,
  })
}));
