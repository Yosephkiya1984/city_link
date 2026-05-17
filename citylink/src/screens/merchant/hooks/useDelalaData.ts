import { useState, useCallback, useEffect } from 'react';
import { useAuthStore } from '../../../store/AuthStore';
import { useSystemStore } from '../../../store/SystemStore';
import { fetchPropertyListings, fetchPropertyEnquiries } from '../../../services/services.service';
import { PropertyListing, PropertyEnquiry } from '../../../types/domain_types';

export function useDelalaData() {
  const currentUser = useAuthStore((s) => s.currentUser);
  const showToast = useSystemStore((s) => s.showToast);

  const [listings, setListings] = useState<PropertyListing[]>([]);
  const [enquiries, setEnquiries] = useState<PropertyEnquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    if (!currentUser?.id) return;
    setLoading(true);
    try {
      const [listingsRes, enquiriesRes] = await Promise.all([
        fetchPropertyListings(currentUser.id),
        fetchPropertyEnquiries(currentUser.id),
      ]);

      if (listingsRes.data) {
        setListings(
          (listingsRes.data as PropertyListing[]).sort(
            (a: PropertyListing, b: PropertyListing) =>
              new Date(b.created_at!).getTime() - new Date(a.created_at!).getTime()
          )
        );
      }
      if (enquiriesRes.data) {
        setEnquiries(
          (enquiriesRes.data as PropertyEnquiry[]).sort(
            (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          )
        );
      }
    } catch (error) {
      showToast('Failed to load Delala data', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [currentUser?.id, showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return {
    listings,
    enquiries,
    loading,
    refreshing,
    loadData,
    setRefreshing,
  };
}
