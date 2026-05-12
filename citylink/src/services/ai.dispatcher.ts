import { queueP2PTransfer, generateIdempotencyKey, fetchSpendingInsights } from './wallet.service';
import { payUtilityBill, payTrafficFine } from './payment.service';
import { fetchRestaurants, fetchFoodItems, updateOrderStatus, setTableStatus, fireToKitchen } from './food.service';
import { fetchParkingLots, startParkingSession } from './parking.service';
import { marketplaceService, searchProducts, updateProduct, fetchMerchantMetrics } from './marketplace.service';
import { contributeToEkub, submitVouch, performEkubDraw, releaseEkubPot } from './ekub.service';
import { FaydaService } from './fayda.service';
import { supaQuery } from './supabase';
import { useSystemStore } from '../store/SystemStore';
import { useAuthStore } from '../store/AuthStore';
import { useWalletStore } from '../store/WalletStore';
import { LocationService } from './location.service';
import { getCurrentLocation } from './delivery.service';
import { KnowledgeService } from './knowledge.service';

/**
 * AIDispatcher — The execution engine connecting AI tool calls to real app logic.
 * ALL method references here are verified against the actual service implementations.
 * Never add a tool here unless the backing service method is confirmed to exist.
 */
export const AIDispatcher = {
  /**
   * executeTool — Primary entry point for the AI Service.
   * Takes a tool name and params from the Agent and routes them to real services.
   */
  executeTool: async (toolName: string, params: Record<string, any>): Promise<any> => {
    console.log(`[AIDispatcher] Executing: ${toolName}`, params);

    try {
      switch (toolName) {

        // ─── FINANCIAL ────────────────────────────────────────────────────────

        case 'get_wallet_balance': {
          // Read directly from the in-memory store (already synced on app load)
          const balance = useWalletStore.getState().balance;
          const frozen = useWalletStore.getState().frozenBalance;
          return {
            ok: true,
            balance,
            frozen_balance: frozen,
            available: balance - frozen,
            currency: 'ETB',
          };
        }

        case 'get_wallet_summary': {
          const currentUser = useAuthStore.getState().currentUser;
          if (!currentUser?.id) return { ok: false, error: 'User not authenticated' };
          const { data, error } = await fetchSpendingInsights(currentUser.id, params.days || 30);
          if (error) return { ok: false, error };
          
          const totalSpent = data?.reduce((acc, tx) => acc + (Number(tx.amount) || 0), 0) || 0;
          return {
            ok: true,
            total_spent: totalSpent,
            transaction_count: data?.length || 0,
            period_days: params.days || 30,
            currency: 'ETB'
          };
        }

        case 'process_p2p_transfer': {
          // Requires: recipient_phone, amount, note (optional)
          const currentUser = useAuthStore.getState().currentUser;
          if (!currentUser?.id) return { ok: false, error: 'User not authenticated' };
          if (!params.recipient_phone || !params.amount) {
            return { ok: false, error: 'recipient_phone and amount are required' };
          }
          const iKey = generateIdempotencyKey('ai-p2p', currentUser.id, params.amount, params.recipient_phone);
          return await queueP2PTransfer(
            currentUser.id,
            params.recipient_phone,
            Number(params.amount),
            params.note || 'Sent via CityLink AI',
            iKey
          );
        }

        case 'pay_utility_bill': {
          // Requires: bill_id
          // citizen_id is resolved from the auth store — never trust client-supplied identity
          const currentUser = useAuthStore.getState().currentUser;
          if (!currentUser?.id) return { ok: false, error: 'User not authenticated' };
          if (!params.bill_id) return { ok: false, error: 'bill_id is required' };
          const { data, error } = await payUtilityBill(params.bill_id, currentUser.id);
          return { ok: !error && data?.ok, new_balance: data?.new_balance, error: error || data?.error };
        }

        case 'pay_traffic_fine': {
          // Requires: fine_id
          const currentUser = useAuthStore.getState().currentUser;
          if (!currentUser?.id) return { ok: false, error: 'User not authenticated' };
          if (!params.fine_id) return { ok: false, error: 'fine_id is required' };
          const { data, error } = await payTrafficFine(currentUser.id, params.fine_id);
          return { ok: !error && data?.ok, new_balance: data?.new_balance, error: error || data?.error };
        }

        // ─── TRANSPORT ────────────────────────────────────────────────────────

        case 'find_nearby_parking': {
          // Returns available parking lots, optionally filtered by location
          const { data, error } = await fetchParkingLots();
          if (error) return { ok: false, error };
          
          let lots = data || [];
          let userLoc = await getCurrentLocation();
          
          if (params.location) {
            const geo = await LocationService.geocode(params.location);
            if (geo) userLoc = { lat: geo.lat, lng: geo.lon };
          }

          // Enrich with distance and ETA if we have a location
          if (userLoc) {
             lots = lots.map(l => {
                const dist = LocationService.getDistance(userLoc!.lat, userLoc!.lng, (l as any).latitude || 9.0, (l as any).longitude || 38.7);
                return {
                   ...l,
                   distance_km: parseFloat(dist.toFixed(2)),
                   eta: LocationService.estimateTravelTime(dist)
                };
             });
             // Sort by proximity first
             lots.sort((a: any, b: any) => a.distance_km - b.distance_km);
          } else {
             // Fallback sort: available spots
             lots.sort((a, b) => (b.available_spots || 0) - (a.available_spots || 0));
          }

          return { ok: true, lots };
        }

        case 'start_parking_session': {
          // Requires: lot_id, vehicle_plate. Spot is auto-assigned.
          const currentUser = useAuthStore.getState().currentUser;
          if (!currentUser?.id) return { ok: false, error: 'User not authenticated' };
          if (!params.lot_id || !params.vehicle_plate) {
            return { ok: false, error: 'lot_id and vehicle_plate are required' };
          }
          const { data, error } = await startParkingSession(
            currentUser.id,
            params.lot_id,
            null, // Auto-assign spot number in RPC
            params.vehicle_plate
          );
          return { ok: !error && data?.ok, session_id: data?.session_id, error: error || data?.error };
        }

        // ─── FOOD & HOSPITALITY ──────────────────────────────────────────────

        case 'search_restaurant': {
          // Returns restaurants, optionally filtered by name/tag or location
          const { data, error } = await fetchRestaurants();
          if (error) return { ok: false, error };
          
          const query = params.query?.toLowerCase();
          const location = params.location;
          let searchLoc = await getCurrentLocation();

          if (location) {
             const geo = await LocationService.geocode(location);
             if (geo) searchLoc = { lat: geo.lat, lng: geo.lon };
          }

          let results = (data || []).map((r: any) => {
            const matchesQuery = !query || 
              r.name?.toLowerCase().includes(query) ||
              r.cuisine_tags?.some((t: string) => t.toLowerCase().includes(query));
            
            const dist = searchLoc ? LocationService.getDistance(searchLoc.lat, searchLoc.lng, r.latitude || 9.0, r.longitude || 38.7) : null;

            return {
               ...r,
               matchesQuery,
               distance_km: dist ? parseFloat(dist.toFixed(2)) : null,
               eta: dist ? LocationService.estimateTravelTime(dist) : null
            };
          }).filter(r => r.matchesQuery);

          if (searchLoc) {
             results.sort((a: any, b: any) => (a.distance_km || 999) - (b.distance_km || 999));
          }

          return { ok: true, restaurants: results };
        }

        case 'get_food_menu': {
          // Requires: restaurant_id
          if (!params.restaurant_id) return { ok: false, error: 'restaurant_id is required' };
          const { data, error } = await fetchFoodItems(params.restaurant_id);
          return { ok: !error, items: data || [], error };
        }

        case 'order_food_item': {
          // Requires: restaurant_id, menu_item_id
          if (!params.restaurant_id || !params.menu_item_id) {
            return { ok: false, error: 'restaurant_id and menu_item_id are required' };
          }
          const { data } = await supaQuery<any>((c) =>
            c.from('menu_items').select('id, name, price, description').eq('id', params.menu_item_id).maybeSingle()
          );
          if (!data) return { ok: false, error: 'Menu item not found' };
          return { ok: true, menu_item: data, restaurant_id: params.restaurant_id, quantity: params.quantity || 1 };
        }

        case 'book_table': {
          // Table booking is not yet live — reservations table exists but no booking RPC
          return {
            ok: false,
            error: 'Table booking via AI is coming soon. Please use the restaurant page directly.',
          };
        }

        // ─── MARKETPLACE ──────────────────────────────────────────────────────

        case 'search_listings': {
          // Requires: query (optional), category (optional), budget_max (optional)
          const products = await marketplaceService.searchProducts(params.query || '', 20);
          const filtered = params.budget_max
            ? products.filter((p: any) => p.price <= params.budget_max)
            : products;
          return { ok: true, listings: filtered };
        }

        case 'buy_marketplace_item': {
          // Requires: product_id
          if (!params.product_id) return { ok: false, error: 'product_id is required' };
          const { data } = await supaQuery<any>((c) =>
            c.from('products').select('id, name, price, stock, merchant_id').eq('id', params.product_id).maybeSingle()
          );
          if (!data) return { ok: false, error: 'Product not found' };
          return { ok: true, product: data, quantity: params.quantity || 1 };
        }

        case 'check_order_status': {
          // Requires: order_id
          if (!params.order_id) return { ok: false, error: 'order_id is required' };
          const currentUser = useAuthStore.getState().currentUser;
          if (!currentUser?.id) return { ok: false, error: 'User not authenticated' };
          // Try marketplace orders first, then food orders
          const { data: mktOrders } = await supaQuery<any[]>((c) =>
            c.from('marketplace_orders').select('id, status, delivery_pin, created_at, products(name)')
              .eq('buyer_id', currentUser.id).eq('id', params.order_id).maybeSingle()
          );
          if (mktOrders) return { ok: true, order: mktOrders };
          const { data: foodOrder } = await supaQuery<any>((c) =>
            c.from('food_orders').select('id, status, delivery_pin, created_at, restaurants(name)')
              .eq('citizen_id', currentUser.id).eq('id', params.order_id).maybeSingle()
          );
          return foodOrder
            ? { ok: true, order: foodOrder }
            : { ok: false, error: 'Order not found' };
        }

        case 'reveal_delivery_pin': {
          // Requires: order_id
          if (!params.order_id) return { ok: false, error: 'order_id is required' };
          const result = await marketplaceService.revealOrderPin(params.order_id);
          if (result.data?.ok) {
            return { ok: true, delivery_pin: result.data.delivery_pin };
          }
          return { ok: false, error: result.data?.error || 'Could not reveal PIN' };
        }

        case 'update_product_stock': {
          // Requires: product_id, new_stock (quantity)
          const currentUser = useAuthStore.getState().currentUser;
          if (!currentUser?.id) return { ok: false, error: 'User not authenticated' };
          if (!params.product_id || params.new_stock === undefined) {
            return { ok: false, error: 'product_id and new_stock are required' };
          }
          const { data, error } = await updateProduct(
            params.product_id,
            currentUser.id,
            { stock: params.new_stock }
          );
          return { ok: !error, product: data, error };
        }

        // ─── EKUB ──────────────────────────────────────────────────────────────

        case 'contribute_to_ekub': {
          // Requires: ekub_id, round_number
          const currentUser = useAuthStore.getState().currentUser;
          if (!currentUser?.id) return { ok: false, error: 'User not authenticated' };
          if (!params.ekub_id || !params.round_number) {
            return { ok: false, error: 'ekub_id and round_number are required' };
          }
          const { data, error } = await contributeToEkub(currentUser.id, params.ekub_id, params.round_number);
          return { ok: !error && data?.ok, new_balance: data?.new_balance, error: error || data?.error };
        }

        case 'vouch_for_ekub_payout': {
          // Requires: draw_id, ekub_id, approved (boolean), reason (optional)
          const currentUser = useAuthStore.getState().currentUser;
          if (!currentUser?.id) return { ok: false, error: 'User not authenticated' };
          if (!params.draw_id || !params.ekub_id || params.approved === undefined) {
            return { ok: false, error: 'draw_id, ekub_id, and approved are required' };
          }
          const { data, error } = await submitVouch(
            params.draw_id,
            params.ekub_id,
            currentUser.id,
            (currentUser as any).full_name || 'Member',
            Boolean(params.approved),
            params.reason
          );
          return { ok: !error, vouch: data, error };
        }

        case 'perform_ekub_draw': {
          // Requires: ekub_id, round_number, pot_amount — MERCHANT ONLY
          if (!params.ekub_id || !params.round_number || !params.pot_amount) {
            return { ok: false, error: 'ekub_id, round_number, and pot_amount are required' };
          }
          const { data, error } = await performEkubDraw(params.ekub_id, params.round_number, params.pot_amount);
          return { ok: !error && data?.ok, winner_name: data?.winner_name, draw_id: data?.draw_id, error: error || data?.error };
        }

        case 'release_ekub_pot': {
          // Requires: draw_id — MERCHANT ONLY
          if (!params.draw_id) return { ok: false, error: 'draw_id is required' };
          const { data, error } = await releaseEkubPot(params.draw_id);
          return { ok: !error && data?.ok, error: error || data?.error };
        }

        // ─── MERCHANT OPS ─────────────────────────────────────────────────────

        case 'get_merchant_summary': {
          const currentUser = useAuthStore.getState().currentUser;
          if (!currentUser?.id) return { ok: false, error: 'User not authenticated' };
          const metrics = await fetchMerchantMetrics(currentUser.id);
          return { ok: true, metrics };
        }

        case 'ship_marketplace_order': {
          // Requires: order_id — MERCHANT ONLY
          const currentUser = useAuthStore.getState().currentUser;
          if (!currentUser?.id) return { ok: false, error: 'User not authenticated' };
          if (!params.order_id) return { ok: false, error: 'order_id is required' };
          const result = await marketplaceService.shipOrder(params.order_id, currentUser.id);
          return { ok: result.success, dispatched_count: result.dispatchedCount };
        }

        case 'fire_order_to_kitchen': {
          // Requires: order_id — Marks food order as PREPARING
          const currentUser = useAuthStore.getState().currentUser;
          if (!currentUser?.id) return { ok: false, error: 'User not authenticated' };
          if (!params.order_id) return { ok: false, error: 'order_id is required' };
          const { error } = await fireToKitchen(params.order_id, currentUser.id);
          return { ok: !error, error };
        }

        case 'set_table_status': {
          // Requires: table_id, status
          if (!params.table_id || !params.status) {
            return { ok: false, error: 'table_id and status are required' };
          }
          const { error } = await setTableStatus(params.table_id, params.status);
          return { ok: !error, error };
        }

        // ─── IDENTITY ─────────────────────────────────────────────────────────

        case 'verify_fayda_id': {
          // Requires: fayda_id (12-digit national ID)
          if (!params.fayda_id) return { ok: false, error: 'fayda_id is required' };
          const result = await FaydaService.requestVerification(params.fayda_id);
          return {
            ok: result.success,
            status: result.status,
            profile: result.profile,
            error: result.error,
          };
        }

        case 'log_new_pattern': {
          if (!params.intent || !params.example_phrase) return { ok: false, error: 'intent and example_phrase are required' };
          const { error } = await KnowledgeService.logNewPattern(params.intent, params.example_phrase, params.language || 'en');
          return { ok: !error, error };
        }

        case 'search_nearby_osm': {
          if (!params.poi_type) return { ok: false, error: 'poi_type is required' };
          const geo = await LocationService.geocode(params.location || 'Addis Ababa');
          const results = await LocationService.searchNearby(params.poi_type, params.location || 'Addis Ababa');
          return { ok: true, results, center: geo };
        }

        default:
          return {
            ok: false,
            error: `Tool "${toolName}" is not yet implemented. Only use tools that have been confirmed to exist in CityLink.`,
          };
      }
    } catch (error: any) {
      console.error(`[AIDispatcher] Unhandled error in ${toolName}:`, error.message);
      return { ok: false, error: error.message };
    }
  },

  /**
   * handleAgentResponse — Processes an AI response object, executes any embedded
   * tool call, and surfaces the result via SystemStore toast.
   */
  handleAgentResponse: async (aiResponse: any) => {
    const showToast = useSystemStore.getState().showToast;

    if (!aiResponse?.action) return null;

    const result = await AIDispatcher.executeTool(
      aiResponse.action.type,
      aiResponse.action.data || {}
    );

    if (result?.ok) {
      showToast(result.message || 'Action completed successfully!', 'success');
    } else if (result && !result.ok) {
      showToast(result.error || 'Action failed. Please try again.', 'error');
    }

    return result;
  },
};
