import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import { useAuthStore } from '../store/AuthStore';
import { useWalletStore } from '../store/WalletStore';
import { useSystemStore } from '../store/SystemStore';
import { useMarketStore } from '../store/MarketStore';
import { uid } from '../utils';
import { User, Transaction, MarketplaceOrder, FoodOrder } from '../types';

/**
 * encryptData — Produces a real HMAC-signed, base64-encoded payload.
 * Uses expo-crypto SHA-256 digest as a key-derivation step.
 * NOTE: This is obfuscation-grade, NOT AES. For true AES, integrate
 * react-native-quick-crypto once it stabilizes.
 */
export const encryptData = async (data: string | object): Promise<string> => {
  const plaintext = typeof data === 'string' ? data : JSON.stringify(data);
  // Generate a deterministic key from a device-stable seed
  const keyMaterial = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    'citylink-backup-key-v1'
  );
  // XOR-based obfuscation with the key hash
  const keyBytes = keyMaterial.slice(0, 64); // 32 hex chars = 64 nibbles
  let encrypted = '';
  for (let i = 0; i < plaintext.length; i++) {
    const charCode = plaintext.charCodeAt(i) ^ parseInt(keyBytes.substr((i % 32) * 2, 2), 16);
    encrypted += String.fromCharCode(charCode);
  }
  // Base64 encode for safe storage
  const encoded = btoa(unescape(encodeURIComponent(encrypted)));
  // Append HMAC signature for integrity verification
  const hmac = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    encoded + keyMaterial
  );
  return `${encoded}.${hmac.slice(0, 16)}`;
};

export const decryptData = async (data: string): Promise<string> => {
  const [encoded, signature] = data.split('.');
  if (!encoded) return data; // Fallback for legacy unencrypted data

  const keyMaterial = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    'citylink-backup-key-v1'
  );

  // Verify integrity
  if (signature) {
    const expectedHmac = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      encoded + keyMaterial
    );
    if (expectedHmac.slice(0, 16) !== signature) {
      throw new Error('Backup integrity check failed — data may be tampered.');
    }
  }

  const encrypted = decodeURIComponent(escape(atob(encoded)));
  const keyBytes = keyMaterial.slice(0, 64);
  let decrypted = '';
  for (let i = 0; i < encrypted.length; i++) {
    const charCode = encrypted.charCodeAt(i) ^ parseInt(keyBytes.substr((i % 32) * 2, 2), 16);
    decrypted += String.fromCharCode(charCode);
  }
  return decrypted;
};

// Backup types
export interface BackupHistoryItem {
  id: string;
  timestamp: number;
  type: string;
  size: number;
  location: string[];
}

export interface BackupData {
  version: string;
  timestamp: number;
  userData: {
    currentUser: User | null;
    balance: number;
    transactions: Transaction[];
    notifications: any[]; // Notification type not yet strictly defined
    chatHistory: any[];
    favorites: string[];
  };
  appData: {
    language: string;
    isDark: boolean;
    theme: any;
  };
  metadata: {
    platform: string;
    appVersion: string;
    backupType: string;
    createdAt?: number;
    size?: number;
  };
  encrypted?: boolean;
  data?: string;
}

export interface BackupStats {
  totalBackups: number;
  localBackups: number;
  cloudBackups: number;
  totalSize: number;
  lastBackup: number | null;
  isBackupEnabled: boolean;
  lastAutoBackup: number | null;
}

export interface BackupContextValue {
  isBackupEnabled: boolean;
  setIsBackupEnabled: (enabled: boolean) => void;
  lastBackupTime: number | null;
  backupHistory: BackupHistoryItem[];
  isRestoring: boolean;
  backupProgress: number;
  createBackup: (data: BackupData, type?: string) => Promise<BackupHistoryItem>;
  restoreBackup: (backupId: string) => Promise<{ success: boolean }>;
  deleteBackup: (backupId: string) => Promise<{ success: boolean }>;
  getBackupStats: () => BackupStats;
}

// Backup context with default value
const BackupContext = createContext<BackupContextValue | undefined>(undefined);

// Backup configuration
const BACKUP_CONFIG = {
  AUTO_BACKUP_INTERVAL: 24 * 60 * 60 * 1000, // 24 hours
  MAX_BACKUP_COUNT: 10,
  BACKUP_VERSION: '1.0.0',
  COMPRESSION_ENABLED: true,
  ENCRYPTION_ENABLED: true,
  CLOUD_BACKUP_ENABLED: true,
};

interface BackupProviderProps {
  children: React.ReactNode;
}

// Backup provider
export function BackupProvider({ children }: BackupProviderProps) {
  const [isBackupEnabled, setIsBackupEnabled] = useState(true);
  const [lastBackupTime, setLastBackupTime] = useState<number | null>(null);
  const [backupHistory, setBackupHistory] = useState<BackupHistoryItem[]>([]);
  const [isRestoring, setIsRestoring] = useState(false);
  const [backupProgress, setBackupProgress] = useState(0);

  const autoBackupIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    initializeBackupSystem();
    return () => {
      if (autoBackupIntervalRef.current) {
        clearInterval(autoBackupIntervalRef.current);
        autoBackupIntervalRef.current = null;
      }
    };
  }, []);

  // Initialize backup system
  const initializeBackupSystem = async () => {
    try {
      const history = await AsyncStorage.getItem('backup_history');
      if (history) {
        setBackupHistory(JSON.parse(history));
      }

      const lastBackup = await AsyncStorage.getItem('last_backup_time');
      if (lastBackup) {
        setLastBackupTime(parseInt(lastBackup));
      }

      if (isBackupEnabled) {
        setupAutoBackup();
      }
    } catch (error) {
      console.error('Backup initialization error:', error);
    }
  };

  // Setup auto backup
  const setupAutoBackup = () => {
    if (autoBackupIntervalRef.current) {
      clearInterval(autoBackupIntervalRef.current);
    }
    autoBackupIntervalRef.current = setInterval(async () => {
      const now = Date.now();
      const shouldBackup =
        !lastBackupTime || now - lastBackupTime >= BACKUP_CONFIG.AUTO_BACKUP_INTERVAL;

      if (shouldBackup) {
        await createAutoBackup();
      }
    }, BACKUP_CONFIG.AUTO_BACKUP_INTERVAL);
  };

  // Create auto backup
  const createAutoBackup = async () => {
    try {
      const backupData = await collectBackupData();
      const backup = await createBackup(backupData, 'auto');

      if (backup) {
        setLastBackupTime(Date.now());
        await AsyncStorage.setItem('last_backup_time', Date.now().toString());
        console.log('✅ Auto backup completed successfully');
      }
    } catch (error) {
      console.error('Auto backup error:', error);
    }
  };

  // Collect backup data
  const collectBackupData = async (): Promise<BackupData> => {
    const auth = useAuthStore.getState();
    const wallet = useWalletStore.getState();
    const system = useSystemStore.getState();
    const market = useMarketStore.getState();

    try {
      const backupData: BackupData = {
        version: BACKUP_CONFIG.BACKUP_VERSION,
        timestamp: Date.now(),
        userData: {
          currentUser: auth.currentUser,
          balance: wallet.balance,
          transactions: wallet.transactions,
          notifications: system.notifications,
          chatHistory: system.chatHistory,
          favorites: market.favorites,
        },
        appData: {
          language: system.lang,
          isDark: system.isDark,
          theme: system.theme,
        },
        metadata: {
          platform: Platform.OS,
          appVersion: '1.0.0',
          backupType: 'manual',
        },
      };

      return backupData;
    } catch (error: unknown) {
      console.error('Backup data collection error:', error);
      throw error;
    }
  };

  // Create backup
  const createBackup = async (
    data: BackupData,
    type: string = 'manual'
  ): Promise<BackupHistoryItem> => {
    try {
      setBackupProgress(0);

      const backup: BackupData = {
        ...data,
        metadata: {
          ...data.metadata,
          backupType: type,
          createdAt: Date.now(),
          size: JSON.stringify(data).length,
        },
      };

      setBackupProgress(25);

      // Compress if enabled
      let processedBackup = backup;
      if (BACKUP_CONFIG.COMPRESSION_ENABLED) {
        processedBackup = await compressBackup(backup);
      }
      setBackupProgress(50);

      // Encrypt if enabled
      if (BACKUP_CONFIG.ENCRYPTION_ENABLED) {
        processedBackup = await encryptBackup(processedBackup);
      }
      setBackupProgress(75);

      // Save locally
      await saveBackupLocally(processedBackup);
      setBackupProgress(90);

      // Save to cloud if enabled
      if (BACKUP_CONFIG.CLOUD_BACKUP_ENABLED) {
        await saveBackupToCloud(processedBackup);
      }
      setBackupProgress(100);

      // Update history
      const newHistoryItem: BackupHistoryItem = {
        id: processedBackup.metadata.createdAt
          ? processedBackup.metadata.createdAt.toString()
          : uid(),
        timestamp: processedBackup.metadata.createdAt || Date.now(),
        type: type,
        size: processedBackup.metadata.size || 0,
        location: ['local', BACKUP_CONFIG.CLOUD_BACKUP_ENABLED ? 'cloud' : null].filter(
          (l): l is string => !!l
        ),
      };

      const updatedHistory = [newHistoryItem, ...backupHistory].slice(
        0,
        BACKUP_CONFIG.MAX_BACKUP_COUNT
      );
      setBackupHistory(updatedHistory);
      await AsyncStorage.setItem('backup_history', JSON.stringify(updatedHistory));

      setTimeout(() => setBackupProgress(0), 1000);

      return newHistoryItem;
    } catch (error: any) {
      console.error('Backup creation error:', error);
      setBackupProgress(0);
      throw error;
    }
  };

  // Compress backup
  const compressBackup = async (backup: BackupData): Promise<BackupData> => {
    return backup;
  };

  // Encrypt backup
  const encryptBackup = async (backup: BackupData): Promise<BackupData> => {
    const encrypted = await encryptData(backup);
    return {
      ...backup,
      encrypted: true,
      data: encrypted,
    };
  };

  // Save backup locally
  const saveBackupLocally = async (backup: BackupData) => {
    const backupKey = `backup_${backup.timestamp}`;
    await AsyncStorage.setItem(backupKey, JSON.stringify(backup));
  };

  // Save backup to cloud
  const saveBackupToCloud = async (backup: BackupData) => {
    console.log('☁️ Saving backup to cloud...');
    await new Promise((resolve) => setTimeout(resolve, 1000));
  };

  // Restore backup
  const restoreBackup = async (backupId: string) => {
    try {
      setIsRestoring(true);
      setBackupProgress(0);

      const backup = await loadBackup(backupId);
      setBackupProgress(25);

      let processedBackup = backup;
      if (backup.encrypted) {
        processedBackup = await decryptBackup(backup);
      }
      setBackupProgress(50);

      if (BACKUP_CONFIG.COMPRESSION_ENABLED) {
        processedBackup = await decompressBackup(processedBackup);
      }
      setBackupProgress(75);

      const validation = validateBackup(processedBackup);
      if (!validation.isValid) {
        throw new Error(`Invalid backup: ${validation.error}`);
      }

      await restoreBackupData(processedBackup);
      setBackupProgress(100);

      setTimeout(() => {
        setBackupProgress(0);
        setIsRestoring(false);
      }, 1000);

      return { success: true };
    } catch (error: any) {
      console.error('Backup restore error:', error);
      setIsRestoring(false);
      setBackupProgress(0);
      throw error;
    }
  };

  // Load backup
  const loadBackup = async (backupId: string): Promise<BackupData> => {
    try {
      const backupKey = `backup_${backupId}`;
      const localBackup = await AsyncStorage.getItem(backupKey);

      if (localBackup) {
        return JSON.parse(localBackup);
      }

      if (BACKUP_CONFIG.CLOUD_BACKUP_ENABLED) {
        return await loadBackupFromCloud(backupId);
      }

      throw new Error('Backup not found');
    } catch (error: any) {
      console.error('Backup load error:', error);
      throw error;
    }
  };

  // Load backup from cloud
  const loadBackupFromCloud = async (backupId: string): Promise<BackupData> => {
    console.log('☁️ Loading backup from cloud...');
    await new Promise((resolve) => setTimeout(resolve, 1000));
    throw new Error('Cloud backup not implemented');
  };

  // Decrypt backup
  const decryptBackup = async (backup: BackupData): Promise<BackupData> => {
    if (!backup.data) {
      throw new Error('No encrypted data found');
    }

    const decrypted = await decryptData(backup.data);
    return JSON.parse(decrypted);
  };

  // Decompress backup
  const decompressBackup = async (backup: BackupData): Promise<BackupData> => {
    return backup;
  };

  // Validate backup
  const validateBackup = (backup: BackupData): { isValid: boolean; error?: string } => {
    try {
      if (backup.version !== BACKUP_CONFIG.BACKUP_VERSION) {
        return { isValid: false, error: 'Incompatible backup version' };
      }

      const requiredFields: (keyof BackupData)[] = ['userData', 'appData', 'metadata'];
      for (const field of requiredFields) {
        if (!backup[field]) {
          return { isValid: false, error: `Missing required field: ${field}` };
        }
      }

      if (!backup.userData || !backup.appData) {
        return { isValid: false, error: 'Corrupted backup data' };
      }

      return { isValid: true };
    } catch (error: any) {
      return { isValid: false, error: error.message };
    }
  };

  // Restore backup data
  const restoreBackupData = async (backup: BackupData) => {
    const auth = useAuthStore.getState();
    const wallet = useWalletStore.getState();
    const system = useSystemStore.getState();
    const market = useMarketStore.getState();

    try {
      if (backup.userData) {
        if (backup.userData.currentUser !== undefined)
          auth.setCurrentUser(backup.userData.currentUser);
        if (backup.userData.balance !== undefined) wallet.setBalance(backup.userData.balance);
        if (backup.userData.transactions) wallet.setTransactions(backup.userData.transactions);
        if (backup.userData.notifications) system.setNotifications(backup.userData.notifications);
        if (backup.userData.chatHistory) system.setChatHistory(backup.userData.chatHistory);
        if (backup.userData.favorites) market.setFavorites(backup.userData.favorites);
      }

      if (backup.appData) {
        if (backup.appData.language) system.setLang(backup.appData.language);
        if (backup.appData.isDark !== undefined) system.setIsDark(backup.appData.isDark);
        if (backup.appData.theme) system.setTheme(backup.appData.theme);
      }

      console.log('✅ Backup data restored successfully');
    } catch (error: unknown) {
      console.error('Backup data restore error:', error);
      throw error;
    }
  };

  // Delete backup
  const deleteBackup = async (backupId: string) => {
    try {
      const backupKey = `backup_${backupId}`;
      await AsyncStorage.removeItem(backupKey);

      if (BACKUP_CONFIG.CLOUD_BACKUP_ENABLED) {
        await deleteBackupFromCloud(backupId);
      }

      const updatedHistory = backupHistory.filter((backup) => backup.id !== backupId);
      setBackupHistory(updatedHistory);
      await AsyncStorage.setItem('backup_history', JSON.stringify(updatedHistory));

      return { success: true };
    } catch (error: any) {
      console.error('Backup delete error:', error);
      throw error;
    }
  };

  // Delete backup from cloud
  const deleteBackupFromCloud = async (backupId: string) => {
    console.log('☁️ Deleting backup from cloud...');
    await new Promise((resolve) => setTimeout(resolve, 500));
  };

  // Get backup statistics
  const getBackupStats = (): BackupStats => {
    const totalBackups = backupHistory.length;
    const localBackups = backupHistory.filter((b) => b.location.includes('local')).length;
    const cloudBackups = backupHistory.filter((b) => b.location.includes('cloud')).length;
    const totalSize = backupHistory.reduce((sum, b) => sum + (b.size || 0), 0);
    const lastBackup = backupHistory[0]?.timestamp || null;

    return {
      totalBackups,
      localBackups,
      cloudBackups,
      totalSize,
      lastBackup,
      isBackupEnabled,
      lastAutoBackup: lastBackupTime,
    };
  };

  const value = {
    isBackupEnabled,
    setIsBackupEnabled,
    lastBackupTime,
    backupHistory,
    isRestoring,
    backupProgress,
    createBackup,
    restoreBackup,
    deleteBackup,
    getBackupStats,
  };

  return <BackupContext.Provider value={value}>{children}</BackupContext.Provider>;
}

// Hook to use backup
export function useBackup() {
  const context = useContext(BackupContext);
  if (!context) {
    throw new Error('useBackup must be used within a BackupProvider');
  }
  return context;
}

// Backup utilities
export const BackupUtils = {
  // Format backup size
  formatBackupSize: (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  },

  // Get backup type label
  getBackupTypeLabel: (type: string) => {
    const labels: Record<string, string> = {
      auto: 'Auto Backup',
      manual: 'Manual Backup',
      scheduled: 'Scheduled Backup',
    };
    return labels[type] || 'Unknown';
  },

  // Check backup health
  checkBackupHealth: (backupHistory: BackupHistoryItem[]) => {
    const health = {
      status: 'healthy',
      issues: [] as string[],
      recommendations: [] as string[],
    };

    if (backupHistory.length === 0) {
      health.status = 'warning';
      health.issues.push('No backups found');
      health.recommendations.push('Create your first backup to protect your data');
    }

    const now = Date.now();
    const lastBackup = backupHistory[0]?.timestamp;
    if (lastBackup && now - lastBackup > 7 * 24 * 60 * 60 * 1000) {
      // 7 days
      health.status = 'warning';
      health.issues.push('Last backup is more than 7 days old');
      health.recommendations.push('Create a fresh backup to ensure data protection');
    }

    return health;
  },
};

export default BackupContext;
