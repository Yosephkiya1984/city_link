import { getClient, subscribeToTable, unsubscribe } from './supabase';

export interface EventModel {
  id: string;
  merchant_id: string;
  title: string;
  description: string;
  event_date: string;
  // DB column names
  cover_charge: number;
  capacity: number;
  available_capacity: number;
  // Aliases returned by some queries
  ticket_price?: number;
  total_capacity?: number;
  tickets_sold?: number;
  venue?: string;
  venue_type?: string;
  cover_url?: string;
  status: 'UPCOMING' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  created_at: string;
  merchant?: { business_name: string; full_name: string; avatar_url?: string };
}

export interface ReservationModel {
  id: string;
  merchant_id: string;
  citizen_id: string;
  reservation_time: string;
  guest_count: number;
  deposit_amount: number;
  status: 'PENDING' | 'CONFIRMED' | 'SEATED' | 'COMPLETED' | 'CANCELLED';
  table_id?: string;
  table_number?: string;
  created_at: string;
  citizen?: { full_name: string; phone: string };
  items?: { id: string; quantity: number; product?: { name: string } }[];
}

export interface TableModel {
  id: string;
  merchant_id: string;
  table_number: number;
  capacity: number;
  status: 'free' | 'reserved' | 'occupied' | 'vip' | 'ordering' | 'paying' | 'cleaning';
  x_pos: number;
  y_pos: number;
  shape: string;
  assigned_staff_id?: string;
  created_at: string;
}

export class HospitalityService {
  // ==========================================
  // CITIZEN METHODS
  // ==========================================

  static async getUpcomingEvents() {
    const { data, error } = await getClient()!
      .from('events')
      .select('*, merchant:profiles(business_name, full_name, avatar_url)')
      .in('status', ['UPCOMING', 'ACTIVE'])
      .order('event_date', { ascending: true });

    if (error) throw new Error(error.message);
    return data || [];
  }

  static async purchaseTicket(eventId: string, quantity: number) {
    const { data, error } = await getClient()!.rpc('process_event_ticket_purchase', {
      p_event_id: eventId,
      p_quantity: quantity,
    });
    if (error) throw new Error(error.message);
    return data;
  }

  static async createReservation(
    merchantId: string,
    reservationTime: string,
    guestCount: number,
    depositAmount: number,
    preOrders: { product_id: string; quantity: number; unit_price: number }[] = [],
    tableId?: string,
    tableNumber?: string
  ) {
    const { data, error } = await getClient()!.rpc('process_table_reservation', {
      p_merchant_id: merchantId,
      p_reservation_time: reservationTime,
      p_guest_count: guestCount,
      p_deposit_amount: depositAmount,
      p_items: preOrders,
      p_table_id: tableId,
      p_table_number: tableNumber,
    });
    if (error) throw new Error(error.message);
    return data;
  }

  static async getCitizenTickets() {
    const { data, error } = await getClient()!
      .from('event_tickets')
      .select('*, event:events(*, merchant:profiles(full_name))')
      .order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return data;
  }

  static async getCitizenReservations() {
    const { data, error } = await getClient()!
      .from('reservations')
      .select(
        '*, merchant:profiles(full_name), items:reservation_items(*, product:products(name))'
      )
      .order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return data;
  }

  // ==========================================
  // MERCHANT METHODS
  // ==========================================

  static async getMerchantEvents(merchantId: string) {
    const { data, error } = await getClient()!
      .from('events')
      .select('*')
      .eq('merchant_id', merchantId)
      .order('event_date', { ascending: true });
    if (error) throw new Error(error.message);
    return data;
  }

  static async getMerchantReservations(merchantId: string) {
    const { data, error } = await getClient()!
      .from('reservations')
      .select(
        '*, citizen:profiles(full_name, phone), items:reservation_items(*, product:products(name))'
      )
      .eq('merchant_id', merchantId)
      .order('reservation_time', { ascending: true });
    if (error) throw new Error(error.message);
    return data;
  }

  static async createEvent(eventPayload: Partial<EventModel>) {
    const { data, error } = await getClient()!
      .from('events')
      .insert([eventPayload])
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  }

  static async updateEventStatus(eventId: string, status: string) {
    const { data, error } = await getClient()!
      .from('events')
      .update({ status })
      .eq('id', eventId)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  }

  static async releaseHospitalityEscrow(pin: string, type: 'TICKET' | 'RESERVATION') {
    const { data, error } = await getClient()!.rpc('release_hospitality_escrow', {
      p_pin: pin,
      p_type: type,
    });
    if (error) throw new Error(error.message);
    return data;
  }

  static async getMerchantTables(merchantId: string) {
    const { data, error } = await getClient()!
      .from('restaurant_tables')
      .select('*')
      .eq('merchant_id', merchantId)
      .order('table_number', { ascending: true });

    if (error) throw new Error(error.message);
    return data;
  }

  static async toggleTableStatus(tableId: string, status: 'free' | 'reserved' | 'occupied' | 'vip') {
    const { data, error } = await getClient()!.rpc('toggle_table_status', {
      p_table_id: tableId,
      p_status: status,
    });
    if (error) throw new Error(error.message);
    return data;
  }

  static async initializeTables(count: number) {
    const { data, error } = await getClient()!.rpc('initialize_restaurant_tables', {
      p_count: count,
    });
    if (error) throw new Error(error.message);
    return data;
  }

  static async getRestaurantTablesForCitizen(merchantId: string) {
    const { data, error } = await getClient()!
      .from('restaurant_tables')
      .select('*')
      .eq('merchant_id', merchantId)
      .order('table_number', { ascending: true });

    if (error) return null; // Fallback to dynamic if table doesn't exist
    return data;
  }

  static async updateTablePosition(tableId: string, x: number, y: number) {
    const { error } = await getClient()!
      .from('restaurant_tables')
      .update({ x_pos: x, y_pos: y })
      .eq('id', tableId);
    if (error) throw new Error(error.message);
  }

  static async addTable(merchantId: string, restaurantId: string, tableNumber: number, capacity: number, shape: string = 'square') {
    const { data, error } = await getClient()!
      .from('restaurant_tables')
      .insert([{
        merchant_id: merchantId,
        restaurant_id: restaurantId,
        table_number: tableNumber.toString(), // Cast to string as per DB schema
        capacity,
        shape,
        status: 'free'
      }])
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  }

  static async deleteTable(tableId: string) {
    const { error } = await getClient()!
      .from('restaurant_tables')
      .delete()
      .eq('id', tableId);
    if (error) throw new Error(error.message);
  }

  static async getMerchantStaff(merchantId: string) {
    const { data, error } = await getClient()!
      .from('merchant_staff')
      .select('*, profile:profiles(id, full_name, role, phone)')
      .eq('merchant_id', merchantId);
    if (error) throw new Error(error.message);
    return data;
  }

  static async assignStaffToTable(staffProfileId: string, tableId: string) {
    const { error } = await getClient()!
      .from('restaurant_tables')
      .update({ assigned_staff_id: staffProfileId })
      .eq('id', tableId);
    if (error) throw new Error(error.message);
  }

  static async addStaffMember(merchantId: string, phone: string, role: string) {
    const { data, error } = await getClient()!.rpc('add_merchant_staff_member', {
      p_merchant_id: merchantId,
      p_phone: phone,
      p_role: role
    });
    if (error) throw new Error(error.message);
    return data;
  }

  static async getMerchantStaffProfile(profileId: string) {
    const { data, error } = await getClient()!
      .from('merchant_staff')
      .select('*, merchant:merchants(id, business_name, merchant_type)')
      .eq('profile_id', profileId)
      .maybeSingle();
      
    if (error) throw new Error(error.message);
    return data;
  }
}
