import AsyncStorage from '@react-native-async-storage/async-storage';

export const ONBOARDING_STEPS = [
  {
    id: 'welcome',
    title: 'Welcome to CityLink! 🇪🇹',
    description:
      "Your complete urban companion for Addis Ababa. Let's get you started with a quick tour.",
    icon: 'rocket',
    color: '#6366f1',
    features: [
      'Smart transport tracking',
      'Digital payments',
      'Local services',
      'Community features',
    ],
  },
  {
    id: 'transport',
    title: 'Smart Transport 🚌',
    description: 'Real-time tracking for LRT, buses, and more. Never wait for transport again!',
    icon: 'bus',
    color: '#10b981',
    features: ['Live bus tracking', 'Route planning', 'Fare calculation', 'Trip history'],
    action: { text: 'Try Transport', screen: 'Transport' },
  },
  {
    id: 'payments',
    title: 'Digital Payments 💳',
    description: 'Seamless payments for transport, food, and services. Your wallet, digitized.',
    icon: 'card',
    color: '#f59e0b',
    features: ['Quick payments', 'Transaction history', 'Balance tracking', 'Secure transactions'],
    action: { text: 'Open Wallet', screen: 'Wallet' },
  },
  {
    id: 'marketplace',
    title: 'Local Marketplace 🛍️',
    description: 'Connect with local businesses and find everything you need in your community.',
    icon: 'storefront',
    color: '#ef4444',
    features: ['Local products', 'Service providers', 'Price comparisons', 'Secure transactions'],
    action: { text: 'Explore Marketplace', screen: 'Marketplace' },
  },
  {
    id: 'complete',
    title: "You're All Set! 🎉",
    description: 'CityLink is ready to help you explore Addis Ababa like never before.',
    icon: 'checkmark-circle',
    color: '#22c55e',
    features: ['Enjoy your journey', 'Stay connected', 'Explore responsibly', 'Share feedback'],
  },
];

export const OnboardingService = {
  checkStatus: async () => {
    const hasSeen = await AsyncStorage.getItem('has_seen_onboarding');
    const isFirst = await AsyncStorage.getItem('is_first_launch');
    if (isFirst === null) {
      await AsyncStorage.setItem('is_first_launch', 'false');
      return true;
    }
    return hasSeen === null;
  },
  markCompleted: async () => {
    await AsyncStorage.setItem('has_seen_onboarding', 'true');
  },
  reset: async () => {
    await AsyncStorage.removeItem('has_seen_onboarding');
  },
};
