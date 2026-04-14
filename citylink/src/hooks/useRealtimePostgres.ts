import { useEffect, useRef } from 'react';
import { hasSupabase } from '../services/supabase';

/**
 * Subscribe to Supabase Realtime `postgres_changes` on one table.
 * Enhanced with better error handling and mock data support.
 * @param channelName unique stable id (e.g. `cl-rt-jobs-${userId}`)
 * @param filter optional, e.g. `applicant_id=eq.${uuid}`
 */
export function useRealtimePostgres({ channelName, table, filter, onPayload, enabled = true }: any) {
  const ref = useRef(onPayload);
  ref.current = onPayload;

  useEffect(() => {
    if (!enabled || !table || !channelName) return;

    // Mock real-time updates when Supabase is not available
    if (!hasSupabase()) {
      console.log(`🔧 Mock realtime: ${channelName} for table ${table}`);

      // Simulate real-time updates with mock data
      const mockInterval = setInterval(() => {
        if (Math.random() > 0.7) {
          // 30% chance of mock update
          const mockPayload = {
            eventType: 'INSERT',
            table,
            new: {
              id: `mock-${Date.now()}`,
              created_at: new Date().toISOString(),
              // Add mock data based on table type
              ...(table.includes('orders') && {
                customer_name: 'Mock Customer',
                total: Math.floor(Math.random() * 1000) + 500,
              }),
              ...(table.includes('bookings') && {
                client_name: 'Mock Client',
                price: Math.floor(Math.random() * 500) + 200,
              }),
              ...(table.includes('applications') && {
                applicant_name: 'Mock Applicant',
                status: 'APPLIED',
              }),
              ...(table.includes('tickets') && { passenger_name: 'Mock Passenger', price: 25 }),
            },
          };

          try {
            ref.current?.(mockPayload);
          } catch (error) {
            console.error('Mock realtime payload error:', error);
          }
        }
      }, 15000); // Every 15 seconds

      return () => clearInterval(mockInterval);
    }

    // Real Supabase realtime - try to import and use if available
    try {
      // Try to dynamically import realtime functions
      const { subscribeToTable, unsubscribe } = require('../services/realtime');

      const ch = subscribeToTable(channelName, table, filter, (payload: any) => {
        console.log(`📡 Realtime update: ${channelName}`, payload);
        ref.current?.(payload);
      });

      return () => {
        if (ch) {
          console.log(`🔌 Unsubscribing from: ${channelName}`);
          unsubscribe(ch);
        }
      };
    } catch (error) {
      console.log('🔧 Realtime service not available, using mock updates');
      // Fallback to mock updates
      const mockInterval = setInterval(() => {
        if (Math.random() > 0.8) {
          // 20% chance of mock update
          const mockPayload = {
            eventType: 'INSERT',
            table,
            new: {
              id: `mock-${Date.now()}`,
              created_at: new Date().toISOString(),
              customer_name: 'Mock Customer',
              total: Math.floor(Math.random() * 1000) + 500,
            },
          };

          try {
            ref.current?.(mockPayload);
          } catch (payloadError) {
            console.error('Mock payload error:', payloadError);
          }
        }
      }, 20000); // Every 20 seconds

      return () => clearInterval(mockInterval);
    }
  }, [channelName, table, filter, enabled]);
}
