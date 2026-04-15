import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuthStore } from '../../store/AuthStore';
import { uid } from '../../utils';

// Cache configuration
const CACHE_CONFIG = {
  DEFAULT_TTL: 5 * 60 * 1000, // 5 minutes
  USER_DATA_TTL: 30 * 60 * 1000, // 30 minutes
  STATIC_DATA_TTL: 24 * 60 * 60 * 1000, // 24 hours
  MAX_CACHE_SIZE: 50 * 1024 * 1024, // 50MB
  CLEANUP_INTERVAL: 60 * 60 * 1000, // 1 hour
};

// Cache keys
const CACHE_KEYS = {
  USER_PROFILE: 'user_profile',
  TRANSPORT_ROUTES: 'transport_routes',
  MARKETPLACE_DATA: 'marketplace_data',
  EXCHANGE_RATES: 'exchange_rates',
  NOTIFICATIONS: 'notifications',
  CHAT_HISTORY: 'chat_history',
  TRANSACTIONS: 'transactions',
  FAVORITES: 'favorites',
  SETTINGS: 'app_settings',
};

// Cache entry structure
class CacheEntry {
  key: string;
  data: any;
  timestamp: number;
  ttl: number;
  expiry: number;
  size: number;

  constructor(key: string, data: any, ttl = CACHE_CONFIG.DEFAULT_TTL) {
    this.key = key;
    this.data = data;
    this.timestamp = Date.now();
    this.ttl = ttl;
    this.expiry = this.timestamp + ttl;
    this.size = this.calculateSize();
  }

  calculateSize() {
    return JSON.stringify(this.data).length * 2; // Rough estimate in bytes
  }

  isExpired() {
    return Date.now() > this.expiry;
  }

  isValid() {
    return !this.isExpired() && this.size < CACHE_CONFIG.MAX_CACHE_SIZE;
  }
}

// Advanced cache manager
class CacheManager {
  cache: Map<string, CacheEntry>;
  cacheStats: { hits: number; misses: number; totalSize: number; lastCleanup: number };
  private cleanupIntervalId: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.cache = new Map();
    this.cacheStats = {
      hits: 0,
      misses: 0,
      totalSize: 0,
      lastCleanup: Date.now(),
    };
    this.initializeCleanup();
  }

  // Initialize periodic cleanup
  initializeCleanup() {
    // Clear any existing interval to prevent duplicates
    if (this.cleanupIntervalId) {
      clearInterval(this.cleanupIntervalId);
    }
    this.cleanupIntervalId = setInterval(() => {
      this.cleanup();
    }, CACHE_CONFIG.CLEANUP_INTERVAL);
  }

  // Destroy the cache manager and clear intervals
  destroy() {
    if (this.cleanupIntervalId) {
      clearInterval(this.cleanupIntervalId);
      this.cleanupIntervalId = null;
    }
    this.cache.clear();
    this.cacheStats.totalSize = 0;
  }

  // Store data in cache
  async set(key: string, data: any, ttl = CACHE_CONFIG.DEFAULT_TTL) {
    try {
      const entry = new CacheEntry(key, data, ttl);

      // Check cache size limit
      if (this.cacheStats.totalSize + entry.size > CACHE_CONFIG.MAX_CACHE_SIZE) {
        await this.evictLeastUsed();
      }

      this.cache.set(key, entry);
      this.cacheStats.totalSize += entry.size;

      // Persist to AsyncStorage
      await AsyncStorage.setItem(`cache_${key}`, JSON.stringify(entry));

      return true;
    } catch (error) {
      console.error('Cache set error:', error);
      return false;
    }
  }

  // Retrieve data from cache
  async get(key: string) {
    try {
      // Check memory cache first
      const memoryEntry = this.cache.get(key);
      if (memoryEntry && memoryEntry.isValid()) {
        this.cacheStats.hits++;
        return memoryEntry.data;
      }

      // Check persistent cache
      const persistentData = await AsyncStorage.getItem(`cache_${key}`);
      if (persistentData) {
        const entry = JSON.parse(persistentData);
        const cacheEntry = new CacheEntry(entry.key, entry.data, entry.ttl);

        if (cacheEntry.isValid()) {
          this.cache.set(key, cacheEntry);
          this.cacheStats.hits++;
          return cacheEntry.data;
        } else {
          // Remove expired entry
          await AsyncStorage.removeItem(`cache_${key}`);
        }
      }

      this.cacheStats.misses++;
      return null;
    } catch (error) {
      console.error('Cache get error:', error);
      this.cacheStats.misses++;
      return null;
    }
  }

  // Remove data from cache
  async remove(key: string) {
    try {
      const entry = this.cache.get(key);
      if (entry) {
        this.cacheStats.totalSize -= entry.size;
        this.cache.delete(key);
      }

      await AsyncStorage.removeItem(`cache_${key}`);
      return true;
    } catch (error) {
      console.error('Cache remove error:', error);
      return false;
    }
  }

  // Clear all cache
  async clear() {
    try {
      this.cache.clear();
      this.cacheStats.totalSize = 0;

      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter((key) => key.startsWith('cache_'));
      await AsyncStorage.multiRemove(cacheKeys);

      return true;
    } catch (error) {
      console.error('Cache clear error:', error);
      return false;
    }
  }

  // Cleanup expired entries
  async cleanup() {
    const now = Date.now();
    let cleanedSize = 0;
    let cleanedCount = 0;

    // Clean memory cache
    for (const [key, entry] of this.cache.entries()) {
      if (entry.isExpired()) {
        cleanedSize += entry.size;
        cleanedCount++;
        this.cache.delete(key);
        this.cacheStats.totalSize -= entry.size;
      }
    }

    // Clean persistent cache
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter((key) => key.startsWith('cache_'));

      for (const key of cacheKeys) {
        const data = await AsyncStorage.getItem(key);
        if (data) {
          const entry = JSON.parse(data);
          if (entry.expiry < now) {
            await AsyncStorage.removeItem(key);
            cleanedCount++;
          }
        }
      }
    } catch (error) {
      console.error('Cache cleanup error:', error);
    }

    this.cacheStats.lastCleanup = now;
    console.log(`🧹 Cache cleanup: removed ${cleanedCount} entries, freed ${cleanedSize} bytes`);
  }

  // Evict least used entries
  async evictLeastUsed() {
    const entries = Array.from(this.cache.entries());
    entries.sort((a, b) => a[1].timestamp - b[1].timestamp);

    // Remove oldest 25% of entries
    const toRemove = Math.ceil(entries.length * 0.25);
    let freedSize = 0;

    for (let i = 0; i < toRemove; i++) {
      const [key, entry] = entries[i];
      freedSize += entry.size;
      this.cache.delete(key);
      this.cacheStats.totalSize -= entry.size;
      await AsyncStorage.removeItem(`cache_${key}`);
    }

    console.log(`🗑️ Cache eviction: removed ${toRemove} entries, freed ${freedSize} bytes`);
  }

  // Get cache statistics
  getStats() {
    const hitRate = (this.cacheStats.hits / (this.cacheStats.hits + this.cacheStats.misses)) * 100;

    return {
      ...this.cacheStats,
      hitRate: hitRate || 0,
      entryCount: this.cache.size,
      averageEntrySize: this.cacheStats.totalSize / this.cache.size || 0,
    };
  }

  // Preload common data
  async preloadCommonData() {
    try {
      // Preload user data
      const userProfile = useAuthStore.getState().currentUser;
      if (userProfile) {
        await this.set(CACHE_KEYS.USER_PROFILE, userProfile, CACHE_CONFIG.USER_DATA_TTL);
      }

      // Preload static data
      const staticData = {
        transportRoutes: [
          { id: 'lrt-01', name: 'LRT Line 1', stops: ['Ayat', 'Mekane Yesus', 'Legehar'] },
          { id: 'bus-01', name: 'Anbessa Route 1', stops: ['Bole', 'Megenagna', 'Piassa'] },
        ],
        exchangeRates: {
          USD: 57.5,
          EUR: 62.3,
          GBP: 73.8,
        },
        marketplaceCategories: ['Electronics', 'Clothing', 'Food', 'Services', 'Housing'],
      };

      await this.set(
        CACHE_KEYS.TRANSPORT_ROUTES,
        staticData.transportRoutes,
        CACHE_CONFIG.STATIC_DATA_TTL
      );
      await this.set(
        CACHE_KEYS.EXCHANGE_RATES,
        staticData.exchangeRates,
        CACHE_CONFIG.STATIC_DATA_TTL
      );

      console.log('📦 Common data preloaded successfully');
    } catch (error) {
      console.error('Preload error:', error);
    }
  }
}

// Data persistence manager
class DataPersistenceManager {
  isOnline: boolean;
  syncQueue: any[];
  lastSyncTime: number;

  constructor() {
    this.isOnline = true;
    this.syncQueue = [];
    this.lastSyncTime = Date.now();
  }

  // Save data with fallback
  async saveWithFallback(key: string, data: any, cloudSync = false) {
    try {
      // Save locally first
      await AsyncStorage.setItem(
        key,
        JSON.stringify({
          data,
          timestamp: Date.now(),
          synced: false,
        })
      );

      // Sync to cloud if online and requested
      if (cloudSync && this.isOnline) {
        await this.syncToCloud(key, data);
      }

      return true;
    } catch (error) {
      console.error('Save with fallback error:', error);
      return false;
    }
  }

  // Load data with fallback
  async loadWithFallback(key: string) {
    try {
      // Try cloud first if online
      if (this.isOnline) {
        const cloudData = await this.loadFromCloud(key);
        if (cloudData) {
          // Cache locally
          await AsyncStorage.setItem(
            key,
            JSON.stringify({
              data: cloudData,
              timestamp: Date.now(),
              synced: true,
            })
          );
          return cloudData;
        }
      }

      // Fallback to local storage
      const localData = await AsyncStorage.getItem(key);
      if (localData) {
        const parsed = JSON.parse(localData);
        return parsed.data;
      }

      return null;
    } catch (error) {
      console.error('Load with fallback error:', error);
      return null;
    }
  }

  // Sync to cloud (mock implementation)
  async syncToCloud(key: string, data: any) {
    try {
      // In a real app, this would sync to a backend service
      console.log(`☁️ Syncing ${key} to cloud...`);

      // Simulate network delay
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Mark as synced
      const existing = await AsyncStorage.getItem(key);
      if (existing) {
        const parsed = JSON.parse(existing);
        parsed.synced = true;
        parsed.lastSyncTime = Date.now();
        await AsyncStorage.setItem(key, JSON.stringify(parsed));
      }

      return true;
    } catch (error) {
      console.error('Cloud sync error:', error);
      return false;
    }
  }

  // Load from cloud (mock implementation)
  async loadFromCloud(key: string): Promise<any> {
    try {
      // In a real app, this would fetch from a backend service
      console.log(`☁️ Loading ${key} from cloud...`);

      // Simulate network delay
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Return mock data or null
      return null;
    } catch (error) {
      console.error('Cloud load error:', error);
      return null;
    }
  }

  // Sync all pending data
  async syncPendingData() {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const pendingKeys = [];

      for (const key of keys) {
        const data = await AsyncStorage.getItem(key);
        if (data) {
          const parsed = JSON.parse(data);
          if (!parsed.synced) {
            pendingKeys.push(key);
          }
        }
      }

      for (const key of pendingKeys) {
        const data = await AsyncStorage.getItem(key);
        if (data) {
          const parsed = JSON.parse(data);
          await this.syncToCloud(key, parsed.data);
        }
      }

      console.log(`🔄 Synced ${pendingKeys.length} pending items`);
      return true;
    } catch (error) {
      console.error('Sync pending data error:', error);
      return false;
    }
  }

  // Set online status
  setOnlineStatus(isOnline: boolean) {
    this.isOnline = isOnline;

    if (isOnline) {
      // Sync pending data when coming back online
      this.syncPendingData();
    }
  }
}

// Export singleton instances
export const cacheManager = new CacheManager();
export const dataPersistence = new DataPersistenceManager();

// Utility functions
export const CacheUtils = {
  // Cache API responses
  cacheApiResponse: async (endpoint: string, data: any, ttl = CACHE_CONFIG.DEFAULT_TTL) => {
    const key = `api_${endpoint}`;
    return await cacheManager.set(key, data, ttl);
  },

  // Get cached API response
  getCachedApiResponse: async (endpoint: string) => {
    const key = `api_${endpoint}`;
    return await cacheManager.get(key);
  },

  // Cache user preferences
  cacheUserPreferences: async (preferences: any) => {
    return await cacheManager.set(CACHE_KEYS.SETTINGS, preferences, CACHE_CONFIG.USER_DATA_TTL);
  },

  // Get cached user preferences
  getCachedUserPreferences: async () => {
    return await cacheManager.get(CACHE_KEYS.SETTINGS);
  },

  // Invalidate cache by pattern
  invalidateCachePattern: async (pattern: string) => {
    const keys = Array.from(cacheManager.cache.keys()).filter((key) => key.includes(pattern));

    for (const key of keys) {
      await cacheManager.remove(key);
    }

    console.log(`🗑️ Invalidated ${keys.length} cache entries matching pattern: ${pattern}`);
  },

  // Get cache health
  getCacheHealth: () => {
    const stats = cacheManager.getStats();
    const health = {
      status: 'healthy',
      hitRate: stats.hitRate,
      size: stats.totalSize,
      entries: stats.entryCount,
      recommendations: [] as string[],
    };

    if (stats.hitRate < 50) {
      health.status = 'warning';
      health.recommendations.push(
        'Low cache hit rate. Consider increasing TTL or preloading data.'
      );
    }

    if (stats.totalSize > CACHE_CONFIG.MAX_CACHE_SIZE * 0.8) {
      health.status = 'warning';
      health.recommendations.push(
        'Cache size approaching limit. Consider cleanup or size optimization.'
      );
    }

    if (stats.entryCount > 1000) {
      health.status = 'warning';
      health.recommendations.push('Too many cache entries. Consider more aggressive cleanup.');
    }

    return health;
  },
};

export default cacheManager;
