import { supaQuery } from './supabase';
import { PropertyListing } from '../types';

export async function fetchPropertyListings(agentId: string) {
  return supaQuery((c) =>
    c.from('property_listings').select('*').eq('poster_id', agentId)
  );
}

export async function fetchPropertyEnquiries(agentId: string) {
  return supaQuery((c) =>
    c.from('property_enquiries').select('*').eq('agent_id', agentId)
  );
}

export async function updateListingStatus(listingId: string, newStatus: string) {
  return supaQuery((c) =>
    c.from('property_listings').update({ status: newStatus }).eq('id', listingId)
  );
}

export async function createListing(listingData: Partial<PropertyListing>) {
  return supaQuery((c) => c.from('property_listings').insert([listingData]));
}
