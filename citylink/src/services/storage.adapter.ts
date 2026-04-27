import { SecurePersist } from '../store/SecurePersist';

/**
 * SupabaseStorageAdapter
 * Implements the Supabase Auth storage interface using our AES-encrypted SecurePersist.
 * This ensures that JWTs and Refresh Tokens are NEVER stored in plain text.
 */
export const SupabaseStorageAdapter = {
  getItem: (key: string): Promise<string | null> => {
    return SecurePersist.getItem(key);
  },
  setItem: (key: string, value: string): Promise<void> => {
    return SecurePersist.setItem(key, value);
  },
  removeItem: (key: string): Promise<void> => {
    return SecurePersist.deleteItem(key);
  },
};
