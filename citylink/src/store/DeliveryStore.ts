import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface DeliveryState {
  activeJobs: any[];
  dispatches: any[];
  history: any[];
  agentProfile: any | null;
  lastUpdated: string | null;
  isOnline: boolean;
  
  setActiveJobs: (jobs: any[]) => void;
  setDispatches: (dispatches: any[]) => void;
  setHistory: (history: any[]) => void;
  setAgentProfile: (profile: any) => void;
  setIsOnline: (online: boolean) => void;
  setLastUpdated: (timestamp: string) => void;
  reset: () => void;
}

export const useDeliveryStore = create<DeliveryState>()(
  persist(
    (set) => ({
      activeJobs: [],
      dispatches: [],
      history: [],
      agentProfile: null,
      lastUpdated: null,
      isOnline: false,

      setActiveJobs: (activeJobs) => set({ activeJobs }),
      setDispatches: (dispatches) => set({ dispatches }),
      setHistory: (history) => set({ history }),
      setAgentProfile: (agentProfile) => set({ agentProfile }),
      setIsOnline: (isOnline) => set({ isOnline }),
      setLastUpdated: (lastUpdated) => set({ lastUpdated }),
      
      reset: () => set({ 
        activeJobs: [], 
        dispatches: [], 
        history: [], 
        agentProfile: null,
        lastUpdated: null,
        isOnline: false
      }),
    }),
    {
      name: 'citylink-delivery-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
