import { getClient, supaQuery, hasSupabase } from './supabase';

/**
 * tapIn — records entrance to a rail station.
 */
export async function tapIn(session) {
  return supaQuery((c) => c.from('rail_sessions').insert(session).select().single());
}

/**
 * tapOut — records exit from a rail station and charges fare atomically.
 */
export async function tapOut(sessionId, exitId, exitName) {
  return supaQuery((c) => c.rpc('process_rail_tap_out_atomic', {
    p_session_id: sessionId,
    p_exit_id: exitId,
    p_exit_name: exitName
  }));
}

/**
 * fetchMyRailJourneys — fetches rail travel history for a user.
 */
export async function fetchMyRailJourneys(userId) {
  return supaQuery((c) =>
    c.from('rail_sessions').select('*').eq('user_id', userId).order('tap_in_time', { ascending: false }).limit(20)
  );
}

/**
 * fetchBusRoutes — searches for intercity bus routes.
 */
export async function fetchBusRoutes(from, to) {
  let q = getClient()?.from('bus_routes').select('*').eq('status', 'active');
  if (from) q = q.eq('from_city', from);
  if (to)   q = q.eq('to_city', to);
  return supaQuery(() => q);
}

/**
 * bookBusTicket — books a ticket for a selected bus route atomically.
 */
export async function bookBusTicket(routeId, userId, qrToken) {
  return supaQuery((c) => c.rpc('issue_bus_ticket_atomic', {
    p_route_id: routeId,
    p_user_id: userId,
    p_qr_token: qrToken
  }));
}

// ── Transport Operator Functions ───────────────────────────────

/**
 * fetchTransportRoutes — fetches routes managed by an operator.
 */
export const fetchTransportRoutes = async (operatorId) => {
  if (!hasSupabase()) {
    return { 
      data: [
        { id: 'route1', operator_id: operatorId, from: 'Bole', to: 'Megenagna', departure_time: '06:00', price: 25, available_seats: 50, status: 'active' },
        { id: 'route2', operator_id: operatorId, from: 'Megenagna', to: 'Bole', departure_time: '07:30', price: 25, available_seats: 50, status: 'active' }
      ], 
      error: null 
    };
  }
  return supaQuery(client => 
    client.from('bus_routes').select('*').eq('operator_id', operatorId).order('departure_time', { ascending: true })
  );
};

/**
 * fetchTransportTickets — fetches tickets sold for an operator's routes.
 */
export const fetchTransportTickets = async (operatorId) => {
  if (!hasSupabase()) {
    return { 
      data: [
        { id: 'ticket1', operator_id: operatorId, route_id: 'route1', passenger_name: 'Abebe Kebede', price: 25, status: 'VALID', created_at: new Date().toISOString() },
        { id: 'ticket2', operator_id: operatorId, route_id: 'route2', passenger_name: 'Tigist Haile', price: 25, status: 'USED', created_at: new Date(Date.now() - 3600000).toISOString() }
      ], 
      error: null 
    };
  }
  return supaQuery(client => 
    client.from('bus_tickets').select('*').eq('operator_id', operatorId).order('created_at', { ascending: false })
  );
};

/**
 * updateTicketStatus — updates the status of a transport ticket.
 */
export const updateTicketStatus = async (ticketId, status) => {
  if (!hasSupabase()) {
    return { ok: true, error: null };
  }
  return supaQuery(client => 
    client.from('bus_tickets').update({ status }).eq('id', ticketId)
  );
};

/**
 * createRoute — creates a new transport route.
 */
export const createRoute = async (route) => {
  if (!hasSupabase()) {
    return { ok: true, error: null };
  }
  return supaQuery(client => 
    client.from('bus_routes').insert(route)
  );
};

/**
 * buyTransportPass — purchases a transport pass atomically.
 */
export async function buyTransportPass(userId, passType, price, qrToken) {
  return supaQuery((c) => c.rpc('process_transport_pass_atomic', {
    p_user_id: userId,
    p_pass_type: passType,
    p_price: price,
    p_qr_token: qrToken
  }));
}
