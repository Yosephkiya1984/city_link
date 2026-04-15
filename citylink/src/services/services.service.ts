import { supaQuery } from './supabase';
import { PropertyListing, PropertyEnquiry } from '../types';
import { PostgrestError } from '@supabase/supabase-js';

export async function fetchPropertyListings(agentId: string) {
  return supaQuery<PropertyListing[]>((c) =>
    c.from('property_listings').select('*').eq('poster_id', agentId)
  );
}

/**
 * fetchPropertyEnquiries — fetches enquiries for an agent.
 * WARNING: The 'property_enquiries' table does not exist in the current schema.
 * This function returns a stub to prevent runtime crashes.
 */
export async function fetchPropertyEnquiries(agentId: string) {
  if (process.env.NODE_ENV === 'development') {
    console.warn(`[CityLink] fetchPropertyEnquiries called for ${agentId} but table 'property_enquiries' is missing.`);
  }
  return { data: null, error: { message: 'table-not-found', details: null, hint: null, code: 'table-not-found' } as PostgrestError };
}

export async function updateListingStatus(listingId: string, newStatus: string) {
  return supaQuery<void>((c) =>
    c.from('property_listings').update({ status: newStatus }).eq('id', listingId)
  );
}

export async function createListing(listingData: Partial<PropertyListing>) {
  return supaQuery<PropertyListing>((c) => 
    c.from('property_listings').insert([listingData]).select().single()
  );
}
