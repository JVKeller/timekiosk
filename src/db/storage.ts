/**
 * Platform-specific storage configuration for RxDB
 * 
 * This module provides storage adapters for different platforms:
 * - Web/Browser: Uses Dexie (IndexedDB wrapper)
 * - Mobile (Capacitor): Uses SQLite for better performance and reliability
 */

import { Capacitor } from '@capacitor/core';
import { getRxStorageDexie } from 'rxdb/plugins/storage-dexie';
import { wrappedValidateAjvStorage } from 'rxdb/plugins/validate-ajv';
import { wrappedKeyEncryptionCryptoJsStorage } from 'rxdb/plugins/encryption-crypto-js';

/**
 * Detect the current platform
 */
export const isWeb = !Capacitor.isNativePlatform();
export const isAndroid = Capacitor.getPlatform() === 'android';
export const isIOS = Capacitor.getPlatform() === 'ios';
export const isMobile = isAndroid || isIOS;

console.log('Platform detection:', {
    platform: Capacitor.getPlatform(),
    isNative: Capacitor.isNativePlatform(),
    isWeb,
    isMobile
});

/**
 * Get the appropriate storage adapter based on platform
 * For this initial migration, we'll use Dexie for all platforms
 * SQLite integration can be added in a future enhancement
 */
export const getPlatformStorage = () => {
    let baseStorage;

    // For now, use Dexie everywhere (works on web and mobile)
    // Future enhancement: Use SQLite for native mobile apps
    baseStorage = getRxStorageDexie();

    console.log('Using storage:', baseStorage.name);

    // Wrap with encryption
    const encryptedStorage = wrappedKeyEncryptionCryptoJsStorage({
        storage: baseStorage
    });

    // Wrap with validation
    return wrappedValidateAjvStorage({
        storage: encryptedStorage
    });
};
