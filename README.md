# Time Clock Kiosk - Ionic Mobile Application

A cross-platform time tracking application built with Ionic, React, and RxDB, featuring encrypted database replication across devices.

## 🚀 Quick Start

### Prerequisites
- **Node.js** 18+ and npm
- **Android Studio** (for Android builds)
- **Xcode** (for iOS builds, macOS only)

### Development Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Run development server:**
   ```bash
   npm run dev
   ```
   The app will be available at `http://localhost:3000`

3. **Run sync server** (for multi-device replication):
   ```bash
   npm run sync-server
   ```
   The sync server will run on `http://localhost:5984`

## 📱 Platform-Specific Builds

### Web/PWA
```bash
npm run build
npm run preview
```

### Android

1. **Build and sync web assets:**
   ```bash
   npm run build
   npx cap sync android
   ```

2. **Open in Android Studio:**
   ```bash
   npx cap open android
   ```

3. **Or run directly:**
   ```bash
   npm run android:run
   ```

### iOS (macOS only)

1. **Build and sync web assets:**
   ```bash
   npm run build
   npx cap sync ios
   ```

2. **Open in Xcode:**
   ```bash
   npx cap open ios
   ```

3. **Or run directly:**
   ```bash
   npm run ios:run
   ```

## 🔧 Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start Vite development server |
| `npm run build` | Build production bundle |
| `npm run preview` | Preview production build |
| `npm run sync-server` | Start CouchDB sync server |
| `npm run android:build` | Build Android app |
| `npm run android:run` | Run on Android device/emulator |
| `npm run android:sync` | Sync web assets to Android |
| `npm run ios:build` | Build iOS app |
| `npm run ios:run` | Run on iOS device/simulator |
| `npm run ios:sync` | Sync web assets to iOS |

## 🗄️ Database & Sync

### Architecture
- **Local Database**: RxDB with Dexie (IndexedDB) storage
- **Encryption**: Database-level encryption with CryptoJS (AES-256)
- **Replication**: CouchDB protocol for real-time sync
- **Offline-First**: Full functionality without network connection

### Master/Slave Configuration

**Master Device (Server):**
1. Start the sync server: `npm run sync-server`
2. Note the server IP address (e.g., `192.168.1.206:5984`)
3. In Admin Dashboard → Settings, configure:
   - Enable "Master Mode"
   - Set encryption password
   - Display server IP for slaves

**Slave Device (Client):**
1. In Admin Dashboard → Settings, configure:
   - Enter Master IP: `http://192.168.1.206:5984`
   - Enter encryption password (must match master)
   - Save settings

Changes sync automatically in real-time when connected.

## 🔐 Security Features

- **Database Encryption**: All data encrypted at rest with AES-256
- **Encrypted Replication**: Data encrypted during transmission
- **PIN Authentication**: 4-digit employee PINs
- **Admin Protection**: Secure admin dashboard access
- **Auto-Lock**: Configurable inactivity timeouts

## 🌟 Key Features

### Employee Management
- Add/edit/archive employees
- Employee photos and QR codes
- Department and location assignment
- Temporary worker tracking

### Time Tracking
- Clock in/out with QR code or PIN
- Break management (start/end breaks)
- Auto-deduct lunch option
- Real-time status display

### Reporting & Analytics
- Weekly timecards
- CSV export functionality
- Hours summaries by employee/location
- Custom date range reports

### Mobile-Specific Features
- **Native Camera QR Scanning** (on mobile devices)
- **Haptic Feedback** for keypad interactions
- **Network Status Monitoring** for sync awareness
- **Dark Status Bar** for consistent mobile UI
- **Splash Screen** with branding

## 🏗️ Technology Stack

| Layer | Technology |
|-------|------------|
| **Framework** | Ionic React 7.x |
| **UI Library** | React 18.x |
| **Build Tool** | Vite 5.x |
| **Styling** | TailwindCSS + Ionic CSS |
| **Database** | RxDB 15.x (IndexedDB/Dexie) |
| **Replication** | CouchDB protocol (PouchDB) |
| **Encryption** | CryptoJS (AES-256) |
| **Native Bridge** | Capacitor 5.x |
| **State Management** | React Hooks + RxJS |

## 📂 Project Structure

```
/opt/timekiosk/
├── android/              # Android native project
├── ios/                  # iOS native project (future)
├── src/
│   ├── components/       # React components
│   │   ├── admin/       # Admin dashboard components
│   │   └── icons/       # Icon components
│   ├── db/              # Database layer
│   │   ├── index.ts     # RxDB initialization
│   │   ├── schemas.ts   # Database schemas
│   │   └── storage.ts   # Platform-specific storage
│   ├── hooks/           # Custom React hooks
│   ├── plugins/         # Capacitor plugin setup
│   ├── types.ts         # TypeScript definitions
│   ├── utils.ts         # Utility functions
│   └── App.tsx          # Main application
├── dist/                 # Production build output
├── capacitor.config.ts   # Capacitor configuration
├── ionic.config.json     # Ionic configuration
├── vite.config.ts        # Vite configuration
├── tsconfig.json         # TypeScript configuration
└── package.json          # Dependencies and scripts
```

## 🧪 Testing

The application supports testing in multiple modes:

1. **Web Browser** - Full functionality with mock data
2. **Android Emulator** - Test native features (camera, haptics)
3. **Physical Device** - Real-world performance testing
4. **Multi-Device Sync** - Master/slave replication testing

## 🐛 Troubleshooting

### Build Issues
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Clear Capacitor cache
npx cap sync
```

### Sync Not Working
- Verify both devices are on the same network
- Check firewall settings allow port 5984
- Ensure encryption passwords match exactly
- Check browser console for error messages

### Android Build Fails
- Ensure Android Studio is installed
- Update Android SDK to latest version
- Check `android/` folder exists after `npx cap add android`

## 📜 License

This project was created for business productivity and time tracking purposes.

## 🤝 Contributing

For feature requests or bug reports, please contact the development team.

---

**Version:** 2.0.0 (Ionic Migration)  
**Platform Support:** Web, Android, iOS (planned)  
**Last Updated:** November 2025
