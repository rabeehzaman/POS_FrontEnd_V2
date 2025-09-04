import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.tmr.pos.mobile',
  appName: 'TMR POS Mobile',
  webDir: 'out',
  server: {
    androidScheme: 'https'
  },
  plugins: {
    BluetoothLe: {
      displayStrings: {
        scanning: "Scanning for printers...",
        cancel: "Stop Scanning",
        availableDevices: "Available Printers",
        noDeviceFound: "No printer found"
      }
    },
    Camera: {
      permissions: [
        "camera"
      ]
    },
    Geolocation: {
      permissions: [
        "location"
      ]
    },
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: "#ffffff",
      androidSplashResourceName: "splash",
      androidScaleType: "CENTER_CROP",
      showSpinner: true,
      androidSpinnerStyle: "large",
      iosSpinnerStyle: "small",
      spinnerColor: "#999999",
      splashFullScreen: true,
      splashImmersive: true
    }
  },
  ios: {
    scheme: 'TMR POS Mobile',
    contentInset: 'automatic',
    scrollEnabled: true,
    backgroundColor: '#ffffff'
  },
  android: {
    backgroundColor: '#ffffff',
    allowMixedContent: true,
    captureInput: true,
    webContentsDebuggingEnabled: true // Enable for debugging API issues
  }
};

export default config;
