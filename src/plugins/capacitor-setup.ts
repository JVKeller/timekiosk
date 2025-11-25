/**
 * Capacitor Plugin Setup and Initialization
 * 
 * This module initializes and configures Capacitor plugins for use in the application
 */

import { Capacitor } from '@capacitor/core';
import { SplashScreen } from '@capacitor/splash-screen';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Network } from '@capacitor/network';

/**
 * Initialize Capacitor plugins when running on a native platform
 */
export const initializeCapacitorPlugins = async () => {
    if (!Capacitor.isNativePlatform()) {
        console.log('Running on web, skipping native plugin initialization');
        return;
    }

    console.log('Initializing Capacitor plugins for platform:', Capacitor.getPlatform());

    try {
        // Configure status bar
        await StatusBar.setStyle({ style: Style.Dark });
        await StatusBar.setBackgroundColor({ color: '#0f172a' });

        // Hide splash screen after a delay
        setTimeout(async () => {
            await SplashScreen.hide();
        }, 2000);

        // Monitor network status
        Network.addListener('networkStatusChange', status => {
            console.log('Network status changed', status);
        });

        // Initial network status
        const status = await Network.getStatus();
        console.log('Initial network status:', status);

    } catch (error) {
        console.error('Error initializing Capacitor plugins:', error);
    }
};

/**
 * Get current network status
 */
export const getNetworkStatus = async () => {
    if (!Capacitor.isNativePlatform()) {
        // On web, use Navigator API
        return {
            connected: navigator.onLine,
            connectionType: 'unknown'
        };
    }

    const status = await Network.getStatus();
    return status;
};
