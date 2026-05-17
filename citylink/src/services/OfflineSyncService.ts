import NetInfo from '@react-native-community/netinfo';
import { SecurePersist } from '../store/SecurePersist';
import { getClient } from './supabase';

export interface OfflineAction {
  id: string; 
  type: 'ORDER' | 'RESERVATION_UPDATE' | 'P2P_TRANSFER' | 'UTILITY_PAYMENT' | 'TRAFFIC_FINE' | 'EKUB_CONTRIBUTION' | 'KITCHEN_FIRE' | 'MARKETPLACE_SHIP';
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

        switch (action.type) {
          case 'ORDER':
            await client.from('restaurant_orders').upsert({
              ...action.payload,
              offline_id: action.id,
            }, { onConflict: 'offline_id' });
            break;

          case 'RESERVATION_UPDATE': {
            const { id, status, fired_at } = action.payload;
            await client.from('reservations').update({ status, fired_at, updated_at: new Date() }).eq('id', id);
            break;
          }

          case 'P2P_TRANSFER': {
            const { senderId, recipientPhone, amount, note, idempotencyKey } = action.payload;
            await client.rpc('process_p2p_transfer', {
              p_sender_id: senderId,
              p_recipient_phone: recipientPhone,
              p_amount: amount,
              p_note: note,
              p_idempotency_key: idempotencyKey || action.id
            });
            break;
          }

          case 'UTILITY_PAYMENT': {
            const { billId, citizenId, idempotencyKey } = action.payload;
            await client.rpc('process_utility_payment_atomic', {
              p_bill_id: billId,
              p_citizen_id: citizenId,
              p_idempotency_key: idempotencyKey || action.id
            });
            break;
          }

          case 'TRAFFIC_FINE': {
            const { userId, fineId, idempotencyKey } = action.payload;
            await client.rpc('process_traffic_fine_atomic', {
              p_user_id: userId,
              p_fine_id: fineId,
              p_idempotency_key: idempotencyKey || action.id
            });
            break;
          }

          case 'EKUB_CONTRIBUTION': {
            const { userId, ekubId, roundNumber, idempotencyKey } = action.payload;
            await client.rpc('process_ekub_contribution_atomic', {
              p_user_id: userId,
              p_ekub_id: ekubId,
              p_round_number: roundNumber,
              p_idempotency_key: idempotencyKey || action.id
            });
            break;
          }

          case 'KITCHEN_FIRE': {
            const { orderId, merchantId } = action.payload;
            await client.from('food_orders')
              .update({ status: 'PREPARING', updated_at: new Date() })
              .eq('id', orderId)
              .eq('merchant_id', merchantId);
            break;
          }

          case 'MARKETPLACE_SHIP': {
            const { orderId, merchantId, lat, lng } = action.payload;
            await client.rpc('dispatch_order', {
              p_order_id: orderId,
              p_merchant_id: merchantId,
              p_order_type: 'MARKETPLACE',
              p_lat: lat,
              p_lng: lng,
            });
            break;
          }
        }

        console.log(`[OfflineSync] Synced ${action.id} (${action.type})`);
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
