import { supaQuery, hasSupabase } from './supabase';

// ── Delala (Real Estate) ──────────────────────────────────────────────────────

/**
 * fetchListings — fetches all active property listings.
 */
export async function fetchListings() {
  return supaQuery((c) =>
    c.from('property_listings').select('*,profiles(full_name,business_name)').neq('status', 'REMOVED').order('created_at', { ascending: false })
  );
}

/**
 * fetchPropertyListings — fetches listings for a specific agent.
 */
export const fetchPropertyListings = async (agentId) => {
  if (!hasSupabase()) {
    return { 
      data: [
        { id: 'listing1', agent_id: agentId, title: 'Modern 2BR Apartment in Bole', category: 'For Rent', price: 15000, location: 'Bole, Addis Ababa', status: 'ACTIVE', created_at: new Date().toISOString() },
        { id: 'listing2', agent_id: agentId, title: 'Commercial Space in Kazanchis', category: 'For Sale', price: 2500000, location: 'Kazanchis, Addis Ababa', status: 'NEGOTIATING', created_at: new Date(Date.now() - 86400000).toISOString() }
      ], 
      error: null 
    };
  }
  return supaQuery(client => 
    client.from('property_listings').select('*').eq('agent_id', agentId).order('created_at', { ascending: false })
  );
};

export const fetchPropertyEnquiries = async (agentId) => {
  if (!hasSupabase()) return { data: [], error: null };
  return supaQuery(client => client.from('property_enquiries').select('*').eq('agent_id', agentId));
};

export const updateListingStatus = async (listingId, status) => {
  if (!hasSupabase()) return { ok: true, error: null };
  return supaQuery(client => client.from('property_listings').update({ status }).eq('id', listingId));
};

export const createListing = async (listingData) => {
  if (!hasSupabase()) return { ok: true, error: null };
  return supaQuery(client => client.from('property_listings').insert([listingData]));
};

// ── Services (Salon / Clinic) ─────────────────────────────────────────────────

/**
 * fetchServiceProviders — fetches merchants of a specific type (e.g., 'salon', 'clinic').
 */
export async function fetchServiceProviders(type) {
  return supaQuery((c) =>
    c.from('profiles').select('*').eq('role', 'merchant').eq('merchant_type', type).eq('merchant_status', 'APPROVED')
  );
}

/**
 * bookService — creates a new booking for a service using atomic RPC.
 */
export async function bookService(bookingData) {
  return supaQuery((c) => c.rpc('process_service_booking_atomic', {
    p_booking_id: bookingData.id,
    p_citizen_id: bookingData.citizen_id,
    p_merchant_id: bookingData.merchant_id,
    p_provider_name: bookingData.provider_name,
    p_service_type: bookingData.service_type,
    p_deposit: bookingData.amount_escrowed
  }));
}

/**
 * fetchSalonBookings — fetches appointments for a salon.
 */
export const fetchSalonBookings = async (salonId) => {
  if (!hasSupabase()) {
    return { 
      data: [
        { id: 'booking1', salon_id: salonId, client_name: 'Sara Tesfaye', service_name: 'Hair Cut & Style', appointment_time: new Date(Date.now() + 3600000).toISOString(), status: 'CONFIRMED', price: 500, duration_minutes: 45 },
        { id: 'booking2', salon_id: salonId, client_name: 'Mekdes Bekele', service_name: 'Manicure', appointment_time: new Date(Date.now() + 7200000).toISOString(), status: 'PENDING', price: 200, duration_minutes: 30 }
      ], 
      error: null 
    };
  }
  return supaQuery(client => 
    client.from('service_bookings').select('*').eq('salon_id', salonId).order('appointment_time', { ascending: true })
  );
};

export const fetchSalonServices = async (salonId) => {
  if (!hasSupabase()) return { data: [], error: null };
  return supaQuery(client => client.from('salon_services').select('*').eq('salon_id', salonId));
};

export const updateBookingStatus = async (bookingId, status) => {
  if (!hasSupabase()) return { ok: true, error: null };
  return supaQuery(client => client.from('service_bookings').update({ status }).eq('id', bookingId));
};

export const createService = async (serviceData) => {
  if (!hasSupabase()) return { ok: true, error: null };
  return supaQuery(client => client.from('salon_services').insert([serviceData]));
};

/**
 * fetchClinicAppointments — fetches patient appointments for a clinic.
 */
export const fetchClinicAppointments = async (clinicId) => {
  if (!hasSupabase()) {
    return { 
      data: [
        { id: 'apt1', clinic_id: clinicId, patient_id: 'patient1', service_name: 'General Checkup', appointment_time: new Date(Date.now() + 3600000).toISOString(), status: 'CONFIRMED', price: 800, duration_minutes: 30 },
        { id: 'apt2', clinic_id: clinicId, patient_id: 'patient2', service_name: 'Dental Cleaning', appointment_time: new Date(Date.now() + 7200000).toISOString(), status: 'PENDING', price: 1200, duration_minutes: 45 }
      ], 
      error: null 
    };
  }
  return supaQuery(client => 
    client.from('service_bookings').select('*').eq('clinic_id', clinicId).order('appointment_time', { ascending: true })
  );
};

export const fetchClinicServices = async (clinicId) => {
  if (!hasSupabase()) return { data: [], error: null };
  return supaQuery(client => client.from('clinic_services').select('*').eq('clinic_id', clinicId));
};

export const updateAppointmentStatus = async (appointmentId, status) => {
  if (!hasSupabase()) return { ok: true, error: null };
  return supaQuery(client => client.from('service_bookings').update({ status }).eq('id', appointmentId));
};

// ── Tonight (Addis Nightlife) ─────────────────────────────────────────────────

/**
 * fetchTonightSpots — fetches active nightlife events and spots.
 */
export async function fetchTonightSpots() {
  return supaQuery((c) =>
    c.from('tonight_spots').select('*').eq('status', 'active').order('created_at', { ascending: false })
  );
}
