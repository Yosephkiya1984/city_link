import NetInfo from '@react-native-community/netinfo';
import { SecurePersist } from '../store/SecurePersist';
import { getClient } from './supabase';

export interface OfflineOrder {
  id: string; // temporary UUID
  merchantId: string;
  items: any[];
  total: number;
  createdAt: string;
  status: 'pending_sync';
}

class OfflineSyncManager {
  private isSyncing = false;
  private queue: OfflineOrder[] = [];

  constructor() {
    this.init();
  }

  private async init() {
    // Load existing queue
    this.queue = await SecurePersist.loadOfflineOrders();

    // Listen for network changes
    NetInfo.addEventListener(state => {
      if (state.isConnected && state.isInternetReachable && this.queue.length > 0) {
        this.syncOrders();
      }
    });
  }

  public async addOrder(order: OfflineOrder) {
    this.queue.push(order);
    await SecurePersist.saveOfflineOrders(this.queue);
    
    // Attempt sync immediately if we might have connection
    const state = await NetInfo.fetch();
    if (state.isConnected && state.isInternetReachable) {
      this.syncOrders();
    }
  }

  public async syncOrders() {
    if (this.isSyncing || this.queue.length === 0) return;
    this.isSyncing = true;

    console.log(`[OfflineSync] Attempting to sync ${this.queue.length} orders...`);

    const failedOrders: OfflineOrder[] = [];

    for (const order of this.queue) {
      try {
        const client = getClient();
        if (!client) throw new Error('Supabase client not initialized');

        // Send to Supabase KDS/Orders table
        // This simulates the real backend call
        const { error } = await client.from('restaurant_orders').insert({
          merchant_id: order.merchantId,
          items: order.items,
          total: order.total,
          status: 'PENDING',
          is_quick_sale: true,
          offline_id: order.id
        });

        if (error) {
          console.error(`[OfflineSync] Failed to sync order ${order.id}:`, error.message);
          failedOrders.push(order);
        } else {
          console.log(`[OfflineSync] Successfully synced order ${order.id}`);
        }
      } catch (err) {
        console.error(`[OfflineSync] Exception syncing order ${order.id}:`, err);
        failedOrders.push(order);
      }
    }

    // Keep only the ones that failed
    this.queue = failedOrders;
    await SecurePersist.saveOfflineOrders(this.queue);
    this.isSyncing = false;

    if (this.queue.length === 0) {
      console.log('[OfflineSync] All offline orders synced successfully.');
    }
  }

  public getQueueLength() {
    return this.queue.length;
  }
}

export const OfflineSyncService = new OfflineSyncManager();
