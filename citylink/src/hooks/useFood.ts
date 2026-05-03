import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuthStore } from '../store/AuthStore';
import { useWalletStore } from '../store/WalletStore';
import { useSystemStore } from '../store/SystemStore';
import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';

import { fetchRestaurants, fetchFoodItems, placeOrder } from '../services/food.service';
import { HospitalityService, EventModel } from '../services/hospitality.service';
import { uid } from '../utils';

export type FoodTab = 'delivery' | 'tonight' | 'booking';

// Maps UI tab → DB category filter (null = all restaurants)
const TAB_CATEGORY: Record<FoodTab, string | null> = {
  delivery: null, // all open restaurants
  tonight: null, // events, not restaurants
  booking: null, // reservations tab, same restaurant list
};

export function useFood() {
  const balance = useWalletStore((s) => s.balance);
  const setBalance = useWalletStore((s) => s.setBalance);
  const currentUser = useAuthStore((s) => s.currentUser);
  const showToast = useSystemStore((s) => s.showToast);

  const [activeTab, setActiveTab] = useState<FoodTab>('delivery');
  const [restaurants, setRestaurants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Hospitality / Events
  const [events, setEvents] = useState<EventModel[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<EventModel | null>(null);

  // Restaurant detail
  const [selectedRest, setSelectedRest] = useState<any | null>(null);
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [menuLoading, setMenuLoading] = useState(false);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [mode, setMode] = useState<'DELIVERY' | 'RESERVE'>('DELIVERY');
  const [shippingAddress, setShippingAddress] = useState('');
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);

  // Reservation
  const [guestCount, setGuestCount] = useState(2);
  const [reservationTime, setReservationTime] = useState('');

  // Live Table state
  const [restaurantTables, setRestaurantTables] = useState<
    { id: string; table_number: number; status: 'AVAILABLE' | 'OCCUPIED'; is_vip?: boolean }[]
  >([]);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);

  // Load restaurants whenever tab changes (skips "tonight")
  useEffect(() => {
    if (activeTab === 'tonight') return;

    async function loadRestaurants() {
      setLoading(true);
      setLoadError(null);
      const cat = TAB_CATEGORY[activeTab];
      const { data, error } = await fetchRestaurants(cat ?? undefined);
      if (error) {
        setLoadError(error);
        showToast('Could not load restaurants', 'error');
      } else {
        setRestaurants(data ?? []);
      }
      setLoading(false);
    }
    loadRestaurants();
  }, [activeTab]);

  // Load events only on "tonight" tab
  useEffect(() => {
    if (activeTab !== 'tonight') return;

    async function loadEvents() {
      setEventsLoading(true);
      try {
        const ev = await HospitalityService.getUpcomingEvents();
        setEvents((ev ?? []) as EventModel[]);
      } catch (err: any) {
        showToast('Could not load events', 'error');
        setEvents([]);
      } finally {
        setEventsLoading(false);
      }
    }
    loadEvents();
  }, [activeTab]);

  // Handle Restaurant Selection
  const selectRestaurant = useCallback(
    async (r: any) => {
      setSelectedRest(r);
      // Reset states
      setCart({});
      setGuestCount(2);
      setReservationTime('');
      setSelectedTable(null);
      setShippingAddress('');

      // If we're opening it from Booking tab, fetch live tables
      if (activeTab === 'booking') {
        try {
          const liveTables = await HospitalityService.getRestaurantTablesForCitizen(r.id);
          setRestaurantTables(liveTables || []);
        } catch (err) {
          console.warn('Failed to load live tables', err);
          setRestaurantTables([]);
        }
      }

      // Only load menu if in delivery (or if booking supports pre-orders later)
      if (activeTab === 'delivery') {
        setMenuLoading(true);
        try {
          const { data } = await fetchFoodItems(r.id);
          setMenuItems(data || []);
        } catch (err) {
          console.warn('Failed to load menu', err);
        } finally {
          setMenuLoading(false);
        }
      }
    },
    [activeTab]
  );

  const cartTotal = useMemo(
    () =>
      Object.entries(cart).reduce((sum, [itemId, qty]) => {
        const item = menuItems.find((m) => m.id === itemId);
        return sum + (Number(item?.price) || 0) * (qty as number);
      }, 0),
    [cart, menuItems]
  );

  const cartCount = Object.values(cart).reduce((s, q) => s + q, 0);

  const addToCart = useCallback((itemId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCart((prev) => ({ ...prev, [itemId]: (prev[itemId] || 0) + 1 }));
  }, []);

  const detectLocation = async () => {
    setLocationLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        showToast('Location permission denied', 'error');
        return;
      }
      const loc = await Location.getCurrentPositionAsync({});
      setCoords({ lat: loc.coords.latitude, lng: loc.coords.longitude });
      showToast('Location captured for precise delivery!', 'success');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err) {
      showToast('Could not get location', 'error');
    } finally {
      setLocationLoading(false);
    }
  };

  const removeFromCart = useCallback((itemId: string) => {
    setCart((prev) => {
      const next = { ...prev };
      if (next[itemId] > 1) next[itemId]--;
      else delete next[itemId];
      return next;
    });
  }, []);

  const placeFoodOrder = async () => {
    if (!currentUser) throw new Error('Please login to order');
    if (cartCount === 0) throw new Error('Cart is empty');
    if (!shippingAddress.trim()) throw new Error('Please enter a delivery address');
    if (balance < cartTotal) throw new Error('Insufficient wallet balance');

    const orderItems = Object.entries(cart).map(([itemId, qty]) => {
      const item = menuItems.find((m) => m.id === itemId);
      const price = Number(item?.price) || 0;
      return { id: itemId, name: item?.name ?? '', qty, price, subtotal: price * qty };
    });

    const res = await placeOrder({
      id: `FO-${uid()}`,
      citizen_id: currentUser.id,
      merchant_id: selectedRest.merchant_id,
      restaurant_id: selectedRest.id,
      restaurant:
        selectedRest.name ||
        selectedRest.business_name ||
        selectedRest.merchant_name ||
        selectedRest.full_name,
      items_count: cartCount,
      total: cartTotal,
      items: orderItems,
      shipping_address: shippingAddress,
      destination_lat: coords?.lat,
      destination_lng: coords?.lng,
    });

    if (!res.ok) throw new Error(res.error || 'Failed to place order');
    setCart({});
    await useWalletStore.getState().syncWithServer();
    return res;
  };

  const createTableReservation = async () => {
    if (!currentUser) throw new Error('Please login to reserve');
    if (!reservationTime) throw new Error('Please select a reservation time');
    const deposit = guestCount * 100;
    if (balance < deposit) {
      showToast('Insufficient funds for reservation deposit.');
      return false;
    }

    const tableDetails = restaurantTables.find((t) => t.id === selectedTable);

    await HospitalityService.createReservation(
      selectedRest.id,
      new Date(reservationTime).toISOString(),
      guestCount,
      deposit,
      [], // No pre-orders
      selectedTable,
      tableDetails?.table_number ? String(tableDetails.table_number) : undefined
    );
    setCart({});
    await useWalletStore.getState().syncWithServer();
    showToast('Reservation confirmed & Escrow locked!', 'success');
    setSelectedRest(null);
  };

  const buyEventTicket = async (eventId: string, quantity: number) => {
    if (!currentUser) throw new Error('Please login to purchase');
    await HospitalityService.purchaseTicket(eventId, quantity);
    await useWalletStore.getState().syncWithServer();
    showToast('Ticket purchased & Escrow locked!', 'success');
    setSelectedEvent(null);
  };

  return {
    activeTab,
    setActiveTab,
    restaurants,
    loading,
    loadError,
    events,
    eventsLoading,
    selectedEvent,
    setSelectedEvent,
    selectedRest,
    setSelectedRest,
    menuItems,
    menuLoading,
    cart,
    mode,
    setMode,
    cartTotal,
    cartCount,
    addToCart,
    removeFromCart,
    balance,
    setBalance,
    currentUser,
    showToast,
    selectRestaurant,
    placeFoodOrder,
    shippingAddress,
    setShippingAddress,
    guestCount,
    setGuestCount,
    reservationTime,
    setReservationTime,
    coords,
    locationLoading,
    detectLocation,
    restaurantTables,
    selectedTable,
    setSelectedTable,
    createTableReservation,
    buyEventTicket,
  };
}
