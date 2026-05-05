import { walletService } from './wallet.service';
import { paymentService } from './payment.service';
import { foodService } from './food.service';
import { parkingService } from './parking.service';
import { marketplaceService } from './marketplace.service';
import { useSystemStore } from '../store/SystemStore';

/**
 * AIDispatcher — The "Glue" that connects Agent tool calls to real app logic.
 */
export const AIDispatcher = {
  /**
   * executeTool — Primary entry point for the AI Service.
   * Takes a tool name and params from the Agent and routes them.
   */
  executeTool: async (toolName: string, params: any): Promise<any> => {
    console.log(`[AIDispatcher] Executing: ${toolName}`, params);
    
    try {
      switch (toolName) {
        // --- FINANCIAL ---
        case 'get_wallet_balance':
          return await walletService.getBalance();
          
        case 'process_p2p_transfer':
          return await walletService.initiateTransfer(params.recipient_phone, params.amount, params.note);
          
        case 'pay_utility_bill':
          return await paymentService.processBill(params.bill_type, params.account_number, params.amount);

        // --- TRANSPORT ---
        case 'find_nearby_parking':
          return await parkingService.searchZones(params.location);
          
        case 'start_parking_session':
          return await parkingService.startSession(params.zone_id, params.plate_number, params.duration_minutes);

        // --- FOOD & HOSPITALITY ---
        case 'search_restaurant':
          return await foodService.searchRestaurants(params.query, params.location);
          
        case 'book_table':
          return await foodService.createReservation(params.restaurant_id, params.guests, params.time);

        // --- MERCHANT OPS ---
        case 'get_merchant_summary':
          // This would typically involve fetching from multiple stores
          return { status: 'success', message: 'Displaying merchant dashboard overview.' };
          
        case 'update_product_stock':
          return await marketplaceService.updateStock(params.product_id, params.new_stock);

        case 'fire_order':
          // Logic to update reservation status to 'FIRED'
          return { status: 'success', message: `Order #${params.order_id} has been fired to the kitchen.` };

        // --- MARKETPLACE ---
        case 'search_listings':
          return await marketplaceService.searchListings(params.type, params.budget_max);

        default:
          throw new Error(`Tool ${toolName} not implemented in Dispatcher.`);
      }
    } catch (error: any) {
      console.error(`[AIDispatcher] Error in ${toolName}:`, error.message);
      return { status: 'error', message: error.message };
    }
  },

  /**
   * handleAgentResponse — Processes the raw AI response, looks for tool calls, 
   * executes them, and updates the UI state.
   */
  handleAgentResponse: async (aiResponse: any) => {
    const showToast = useSystemStore.getState().showToast;

    if (aiResponse.action) {
      const result = await AIDispatcher.executeTool(aiResponse.action.type, aiResponse.action.data);
      
      if (result.status === 'success') {
        showToast(result.message || 'Action prepared!', 'success');
        // Here you would trigger the UI card in the AgentStore
      } else if (result.status === 'error') {
        showToast(result.message, 'error');
      }
      
      return result;
    }
    
    return null;
  }
};
