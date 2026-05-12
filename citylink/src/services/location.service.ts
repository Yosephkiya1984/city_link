import { supaQuery } from './supabase';

/**
 * LocationService
 * Bridges CityLink with OpenStreetMap (OSM) data for spatial intelligence.
 */
export const LocationService = {
  /**
   * geocode — Converts a text location (e.g., "Bole Medhanealem") to Lat/Lon.
   * Uses Nominatim (OSM) via a lightweight proxy or direct fetch.
   */
  async geocode(query: string): Promise<{ lat: number; lon: number; display_name: string } | null> {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          query + ', Addis Ababa, Ethiopia'
        )}&limit=1`,
        {
          headers: { 'User-Agent': 'CityLink-App/1.0' },
        }
      );
      const data = await response.json();
      if (data && data.length > 0) {
        return {
          lat: parseFloat(data[0].lat),
          lon: parseFloat(data[0].lon),
          display_name: data[0].display_name,
        };
      }
    } catch (e) {
      console.error('[LocationService] Geocoding failed:', e);
    }
    return null;
  },

  /**
   * getDistance — Calculates the straight-line distance between two points (km).
   */
  getDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth's radius in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  },

  /**
   * formatTravelTime — Estimates travel time based on distance and mode.
   */
  estimateTravelTime(distanceKm: number, mode: 'walking' | 'driving' | 'lrt' = 'driving'): string {
    const speeds = {
      walking: 5, // km/h
      driving: 25, // Average Addis traffic speed
      lrt: 35,
    };
    const timeHr = distanceKm / speeds[mode];
    const mins = Math.round(timeHr * 60);
    
    if (mins < 1) return 'less than a minute';
    if (mins < 60) return `${mins} mins`;
    return `${Math.floor(mins / 60)}h ${mins % 60}m`;
  },

  /**
   * searchNearby — Finds specific POIs around a location.
   */
  async searchNearby(poiType: string, area: string): Promise<any[]> {
    try {
      const query = `${poiType} in ${area}, Addis Ababa, Ethiopia`;
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5`,
        { headers: { 'User-Agent': 'CityLink-App/1.0' } }
      );
      return await response.json();
    } catch (e) {
      console.error('[LocationService] searchNearby failed:', e);
      return [];
    }
  },
};
