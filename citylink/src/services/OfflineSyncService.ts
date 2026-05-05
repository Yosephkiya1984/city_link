import NetInfo from '@react-native-community/netinfo';
import { SecurePersist } from '../store/SecurePersist';
import { getClient } from './supabase';

export interface OfflineAction {
  id: string; 
  type: 'ORDER' | 'RESERVATION_UPDATE';
  payload: any;
  createdAt: string;
}

class OfflineSyncManager {
  private isSyncing = false;
  private queue: OfflineAction[] = [];

  constructor() {
    this.init();
  }

  private async init() {
    this.queue = await SecurePersist.loadOfflineActions() || [];
    NetInfo.addEventListener(state => {
      if (state.isConnected && state.isInternetReachable && this.queue.length > 0) {
        this.syncActions();
      }
    });
  }

  public async addAction(action: OfflineAction) {
    this.queue.push(action);
    await SecurePersist.saveOfflineActions(this.queue);
    this.syncActions();
  }

  public async syncActions() {
    if (this.isSyncing || this.queue.length === 0) return;
    const state = await NetInfo.fetch();
    if (!state.isConnected) return;

    this.isSyncing = true;
    console.log(`[OfflineSync] Syncing ${this.queue.length} actions...`);

    const failedActions: OfflineAction[] = [];

    for (const action of this.queue) {
      try {
        const client = getClient();
        if (!client) throw new Error('Supabase client not initialized');

        if (action.type === 'ORDER') {
          await client.from('restaurant_orders').upsert({
            ...action.payload,
            offline_id: action.id,
          }, { onConflict: 'offline_id' });
        } else if (action.type === 'RESERVATION_UPDATE') {
          const { id, status, fired_at } = action.payload;
          await client.from('reservations').update({ status, fired_at, updated_at: new Date() }).eq('id', id);
        }

        console.log(`[OfflineSync] Synced ${action.id}`);
      } catch (err) {
        console.error(`[OfflineSync] Failed ${action.id}:`, err);
        failedActions.push(action);
      }
    }

    this.queue = failedActions;
    await SecurePersist.saveOfflineActions(this.queue);
    this.isSyncing = false;
  }
}

export const OfflineSyncService = new OfflineSyncManager();
