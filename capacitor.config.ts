import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
    appId: 'com.timekiosk.app',
    appName: 'TimeKiosk',
    webDir: 'dist',
    server: {
        androidScheme: 'https'
    },
    plugins: {
        SplashScreen: {
            launchShowDuration: 2000,
            backgroundColor: '#0f172a',
            showSpinner: false
        },
        StatusBar: {
            style: 'dark',
            backgroundColor: '#0f172a'
        },
        CapacitorSQLite: {
            iosDatabaseLocation: 'Library/CapacitorDatabase',
            iosIsEncryption: true,
            iosKeychainPrefix: 'timekiosk',
            androidIsEncryption: true,
            androidBiometric: {
                biometricAuth: false,
                biometricTitle: 'Biometric Login',
                biometricSubTitle: 'Log in using biometric authentication'
            }
        }
    }
};

export default config;
