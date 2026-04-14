import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAppStore } from '../store/AppStore';
import { uid } from '../utils';
// Mock security service to satisfy backup service dependencies
export const encryptData = async (data: string) => data;
export const decryptData = async (data: string) => data;

// Backup types
export interface BackupHistoryItem {
  id: string;
  timestamp: number;
  type: string;
  size: number;
  location: string[];
}

export interface BackupContextValue {
  isBackupEnabled: boolean;
  setIsBackupEnabled: (enabled: boolean) => void;
  lastBackupTime: number | null;
  backupHistory: BackupHistoryItem[];
  isRestoring: boolean;
  backupProgress: number;
  createBackup: (data: any, type?: string) => Promise<BackupHistoryItem>;
  restoreBackup: (backupId: string) => Promise<{ success: boolean }>;
  deleteBackup: (backupId: string) => Promise<{ success: boolean }>;
  getBackupStats: () => any;
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
      // Clear the auto-backup interval on unmount to prevent memory leak
      if (autoBackupIntervalRef.current) {
        clearInterval(autoBackupIntervalRef.current);
        autoBackupIntervalRef.current = null;
      }
    };
  }, []);

  // Initialize backup system
  const initializeBackupSystem = async () => {
    try {
      // Load backup history
      const history = await AsyncStorage.getItem('backup_history');
      if (history) {
        setBackupHistory(JSON.parse(history));
      }

      // Load last backup time
      const lastBackup = await AsyncStorage.getItem('last_backup_time');
      if (lastBackup) {
        setLastBackupTime(parseInt(lastBackup));
      }

      // Setup auto backup
      if (isBackupEnabled) {
        setupAutoBackup();
      }
    } catch (error) {
      console.error('Backup initialization error:', error);
    }
  };

  // Setup auto backup
  const setupAutoBackup = () => {
    // Clear any existing interval before setting a new one
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
  const collectBackupData = async () => {
    const store = useAppStore.getState();

    try {
      const backupData = {
        version: BACKUP_CONFIG.BACKUP_VERSION,
        timestamp: Date.now(),
        userData: {
          currentUser: store.currentUser,
          balance: store.balance,
          transactions: store.transactions,
          notifications: store.notifications,
          chatHistory: store.chatHistory,
          favorites: store.favorites,
        },
        appData: {
          language: store.lang,
          isDark: store.isDark,
          theme: store.theme,
        },
        metadata: {
          platform: Platform.OS,
          appVersion: '1.0.0',
          backupType: 'manual',
        },
      };

      return backupData;
    } catch (error) {
      console.error('Backup data collection error:', error);
      throw error;
    }
  };

  // Create backup
  const createBackup = async (data: any, type = 'manual') => {
    try {
      setBackupProgress(0);

      // Add metadata
      const backup = {
        id: uid(),
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
      const newBackup = {
        id: backup.id,
        timestamp: backup.metadata.createdAt,
        type: type,
        size: backup.metadata.size,
        location: ['local', BACKUP_CONFIG.CLOUD_BACKUP_ENABLED ? 'cloud' : null].filter(Boolean),
      };

      const updatedHistory = [newBackup, ...backupHistory].slice(0, BACKUP_CONFIG.MAX_BACKUP_COUNT);
      setBackupHistory(updatedHistory);
      await AsyncStorage.setItem('backup_history', JSON.stringify(updatedHistory));

      setTimeout(() => setBackupProgress(0), 1000);

      return newBackup;
    } catch (error) {
      console.error('Backup creation error:', error);
      setBackupProgress(0);
      throw error;
    }
  };

  // Compress backup
  const compressBackup = async (backup: any) => {
    // In a real app, this would use compression libraries
    // For now, just return the backup as-is
    return backup;
  };

  // Encrypt backup
  const encryptBackup = async (backup: any) => {
    const encrypted = encryptData(backup);
    return {
      ...backup,
      encrypted: true,
      data: encrypted,
    };
  };

  // Save backup locally
  const saveBackupLocally = async (backup: any) => {
    const backupKey = `backup_${backup.id}`;
    await AsyncStorage.setItem(backupKey, JSON.stringify(backup));
  };

  // Save backup to cloud
  const saveBackupToCloud = async (backup: any) => {
    // In a real app, this would upload to cloud storage
    console.log('☁️ Saving backup to cloud...');
    await new Promise((resolve) => setTimeout(resolve, 1000));
  };

  // Restore backup
  const restoreBackup = async (backupId: string) => {
    try {
      setIsRestoring(true);
      setBackupProgress(0);

      // Load backup
      const backup = await loadBackup(backupId);
      setBackupProgress(25);

      // Decrypt if needed
      let processedBackup = backup;
      if (backup.encrypted) {
        processedBackup = decryptBackup(backup);
      }
      setBackupProgress(50);

      // Decompress if needed
      if (BACKUP_CONFIG.COMPRESSION_ENABLED) {
        processedBackup = await decompressBackup(processedBackup);
      }
      setBackupProgress(75);

      // Validate backup
      const validation = validateBackup(processedBackup);
      if (!validation.isValid) {
        throw new Error(`Invalid backup: ${validation.error}`);
      }

      // Restore data
      await restoreBackupData(processedBackup);
      setBackupProgress(100);

      setTimeout(() => {
        setBackupProgress(0);
        setIsRestoring(false);
      }, 1000);

      return { success: true };
    } catch (error) {
      console.error('Backup restore error:', error);
      setIsRestoring(false);
      setBackupProgress(0);
      throw error;
    }
  };

  // Load backup
  const loadBackup = async (backupId: string) => {
    try {
      // Try local first
      const backupKey = `backup_${backupId}`;
      const localBackup = await AsyncStorage.getItem(backupKey);

      if (localBackup) {
        return JSON.parse(localBackup);
      }

      // Try cloud
      if (BACKUP_CONFIG.CLOUD_BACKUP_ENABLED) {
        return await loadBackupFromCloud(backupId);
      }

      throw new Error('Backup not found');
    } catch (error) {
      console.error('Backup load error:', error);
      throw error;
    }
  };

  // Load backup from cloud
  const loadBackupFromCloud = async (backupId: string) => {
    // In a real app, this would download from cloud storage
    console.log('☁️ Loading backup from cloud...');
    await new Promise((resolve) => setTimeout(resolve, 1000));
    throw new Error('Cloud backup not implemented');
  };

  // Decrypt backup
  const decryptBackup = (backup: any) => {
    if (!backup.data) {
      throw new Error('No encrypted data found');
    }

    const decrypted = decryptData(backup.data);
    return decrypted;
  };

  // Decompress backup
  const decompressBackup = async (backup: any) => {
    // In a real app, this would decompress the data
    return backup;
  };

  // Validate backup
  const validateBackup = (backup: any) => {
    try {
      // Check version compatibility
      if (backup.version !== BACKUP_CONFIG.BACKUP_VERSION) {
        return { isValid: false, error: 'Incompatible backup version' };
      }

      // Check required fields
      const requiredFields = ['userData', 'appData', 'metadata'];
      for (const field of requiredFields) {
        if (!backup[field]) {
          return { isValid: false, error: `Missing required field: ${field}` };
        }
      }

      // Check data integrity
      if (!backup.userData || !backup.appData) {
        return { isValid: false, error: 'Corrupted backup data' };
      }

      return { isValid: true };
    } catch (error) {
      return { isValid: false, error: error.message };
    }
  };

  // Restore backup data
  const restoreBackupData = async (backup: any) => {
    const store = useAppStore.getState();

    try {
      // Restore user data
      if (backup.userData) {
        if (backup.userData.currentUser) store.setCurrentUser(backup.userData.currentUser);
        if (backup.userData.balance !== undefined) store.setBalance(backup.userData.balance);
        if (backup.userData.transactions) store.setTransactions(backup.userData.transactions);
        if (backup.userData.favorites) store.setFavorites(backup.userData.favorites);
      }

      // Restore app data
      if (backup.appData) {
        if (backup.appData.language) store.setLang(backup.appData.language);
        if (backup.appData.isDark !== undefined) store.setIsDark(backup.appData.isDark);
      }

      console.log('✅ Backup data restored successfully');
    } catch (error) {
      console.error('Backup data restore error:', error);
      throw error;
    }
  };

  // Delete backup
  const deleteBackup = async (backupId: string) => {
    try {
      // Delete from local storage
      const backupKey = `backup_${backupId}`;
      await AsyncStorage.removeItem(backupKey);

      // Delete from cloud
      if (BACKUP_CONFIG.CLOUD_BACKUP_ENABLED) {
        await deleteBackupFromCloud(backupId);
      }

      // Update history
      const updatedHistory = backupHistory.filter((backup) => backup.id !== backupId);
      setBackupHistory(updatedHistory);
      await AsyncStorage.setItem('backup_history', JSON.stringify(updatedHistory));

      return { success: true };
    } catch (error) {
      console.error('Backup delete error:', error);
      throw error;
    }
  };

  // Delete backup from cloud
  const deleteBackupFromCloud = async (backupId: string) => {
    // In a real app, this would delete from cloud storage
    console.log('☁️ Deleting backup from cloud...');
    await new Promise((resolve) => setTimeout(resolve, 500));
  };

  // Get backup statistics
  const getBackupStats = () => {
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
  checkBackupHealth: (backupHistory: any[]) => {
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
